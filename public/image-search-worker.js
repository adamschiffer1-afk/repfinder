/*
 * Image search worker — everything runs in the visitor's browser, no API.
 *
 * Stage 1 (fast, whole catalog):
 *   1. RMBG-1.4 removes the background of the user's photo
 *   2. crop to the subject (+5% margin) on white, like the index builder
 *   3. CLIP ViT-B/16 + DINOv2-small global embeddings vs. the prebuilt index
 *      (scripts/build_image_index.mjs, same models & version)
 * Stage 2 (detailed, top candidates only):
 *   4. each candidate's catalog image is loaded and compared in detail:
 *      - DINOv2 patch tokens: every part of the photo is matched against every
 *        part of the candidate (logos, stitching, panels, prints)
 *      - colour histogram of the product pixels (colourway)
 *   5. final score = weighted mix of stage 1, detail match and colour match
 *
 * Messages in:
 *   { type: 'init', indexUrl }
 *   { type: 'search', id, pixels: Uint8ClampedArray (RGB), width, height, topK, indexUrl, debug? }
 * Messages out:
 *   { type: 'status', stage: 'model' | 'ready' | 'analyzing' | 'comparing', progress? }
 *   { type: 'results', id, results: [{ id, score }], debug? }
 *   { type: 'error', id?, message }
 */
import {
  AutoModel,
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const INDEX_VERSION = 'clip16+dinov2s/v2';
const CLIP_ID = 'Xenova/clip-vit-base-patch16';
const DINO_ID = 'Xenova/dinov2-small';
const RMBG_ID = 'briaai/RMBG-1.4';
const MARGIN = 0.05;

// Stage-2 settings (tuned on a synthetic benchmark; see scripts note in the PR)
const RERANK_N = 30;
const WEIGHTS = { global: 1.0, local: 1.0, color: 0.35 };
// Penalty for "hub" images (collages, generic shots) that are close to everything.
// Brand recognition: CLIP compares the photo with each brand's text embedding (logo /
// lettering / product prompts). Products of the recognised brand get a bonus and the
// top brand-matching products are always included in the detailed comparison.
const BRAND_WEIGHT = 1.5;      // bonus (in z-units) = BRAND_WEIGHT * P(brand of product)
const BRAND_PULL = 10;         // extra candidates of the top brand pulled into stage 2
const BRAND_SURE = 0.5;        // probability above which the brand is reported to the UI
const HUB_ALPHA = 0; // catalog-neighbour hubness hurt accuracy in tests; kept for experiments

env.allowLocalModels = false;
env.useBrowserCache = true;

let ready = null;
let models = null;
let ids = [];
let images = [];
let brandNames = [];
let brandVecs = null; // Int8Array, brands * 512
let itemBrand = null; // Int16Array, brand index per item (-1 = unknown)
let brandCount = null; // catalog items per brand
let hub = null; // Float32Array, per-item hubness (mean sim to 10 nearest catalog items)
let matrix = null; // Int8Array, rows * dim
let dim = 0;
let parts = [];
const detailCache = new Map(); // product id -> { patches, fg, hist }

// ── download progress across all model files ──
const fileProgress = new Map();
function onProgress(p) {
  if (!p.file?.endsWith('.onnx')) return;
  if (p.status === 'progress' || p.status === 'done') {
    fileProgress.set(`${p.name}/${p.file}`, p.status === 'done' ? 100 : p.progress);
    const vals = [...fileProgress.values()];
    const pct = Math.round(vals.reduce((a, b) => a + b, 0) / 3); // 3 models
    self.postMessage({ type: 'status', stage: 'model', progress: Math.min(99, pct) });
  }
}

function decodeBase64(b64) {
  const bin = atob(b64);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}

async function loadIndex(indexUrl) {
  const res = await fetch(indexUrl, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Index HTTP ${res.status}`);
  const index = await res.json();
  if (index.version !== INDEX_VERSION) throw new Error('Index version mismatch');
  parts = index.parts;
  dim = parts.reduce((a, p) => a + p.dim, 0);
  ids = index.items.map(i => i.id);
  images = index.items.map(i => i.image);
  hub = Float32Array.from(index.items, i => i.h ?? 0);
  brandNames = (index.brands || []).map(b => b.name);
  brandVecs = new Int8Array(brandNames.length * 512);
  (index.brands || []).forEach((b, i) => brandVecs.set(decodeBase64(b.v), i * 512));
  itemBrand = Int16Array.from(index.items, i => i.b ?? -1);
  brandCount = new Int32Array(brandNames.length);
  itemBrand.forEach(b => { if (b >= 0) brandCount[b]++; });
  matrix = new Int8Array(ids.length * dim);
  index.items.forEach((item, row) => matrix.set(decodeBase64(item.v), row * dim));
}

async function loadModels() {
  // A fresh options object per call: from_pretrained mutates it (e.g. CLIP sets
  // model_file_name = 'vision_model'), which would break the other models.
  const opts = () => ({ progress_callback: onProgress });
  const [clipProc, clip, dinoProc, dino, rmbg, rmbgProc] = await Promise.all([
    AutoProcessor.from_pretrained(CLIP_ID),
    CLIPVisionModelWithProjection.from_pretrained(CLIP_ID, opts()),
    AutoProcessor.from_pretrained(DINO_ID),
    AutoModel.from_pretrained(DINO_ID, opts()),
    AutoModel.from_pretrained(RMBG_ID, { ...opts(), config: { model_type: 'custom' } }),
    AutoProcessor.from_pretrained(RMBG_ID, {
      config: {
        do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
        image_mean: [0.5, 0.5, 0.5], feature_extractor_type: 'ImageFeatureExtractor',
        image_std: [1, 1, 1], resample: 2, rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    }),
  ]);
  models = { clipProc, clip, dinoProc, dino, rmbg, rmbgProc };
}

function init(indexUrl) {
  if (!ready) {
    self.postMessage({ type: 'status', stage: 'model', progress: 0 });
    ready = Promise.all([loadModels(), loadIndex(indexUrl)]).then(() => {
      self.postMessage({ type: 'status', stage: 'ready' });
    });
    ready.catch(err => {
      ready = null;
      self.postMessage({ type: 'error', message: err.message || String(err) });
    });
  }
  return ready;
}

/** Remove background, composite on white, crop to subject. Falls back to the original. */
async function isolateSubject(image) {
  const { rmbg, rmbgProc } = models;
  const { pixel_values } = await rmbgProc(image);
  const { output } = await rmbg({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

  const { width: w, height: h } = image;
  const src = image.data;
  const m = mask.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1, fg = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (m[y * w + x] > 128) {
        fg++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  // No clear subject (or nearly whole frame) -> keep the photo as it is.
  if (fg < w * h * 0.02 || x1 < 0) return image;

  const mx = Math.round((x1 - x0) * MARGIN), my = Math.round((y1 - y0) * MARGIN);
  const cx0 = Math.max(0, x0 - mx), cy0 = Math.max(0, y0 - my);
  const cx1 = Math.min(w - 1, x1 + mx), cy1 = Math.min(h - 1, y1 + my);
  const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;
  const out = new Uint8ClampedArray(cw * ch * 3);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = (cy0 + y) * w + (cx0 + x);
      const a = m[si] / 255;
      const di = (y * cw + x) * 3;
      for (let c = 0; c < 3; c++) out[di + c] = src[si * 3 + c] * a + 255 * (1 - a);
    }
  }
  return new RawImage(out, cw, ch, 3);
}

function normalizeInto(target, offset, v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  s = Math.sqrt(s) || 1;
  for (let i = 0; i < v.length; i++) target[offset + i] = v[i] / s;
}

async function embedGlobal(image) {
  const { clipProc, clip, dinoProc, dino } = models;
  const q = new Float32Array(dim);
  const c = (await clip(await clipProc(image))).image_embeds.data;
  const { last_hidden_state } = await dino(await dinoProc(image));
  const d = last_hidden_state.data.slice(0, last_hidden_state.dims[2]); // CLS token
  normalizeInto(q, 0, c);
  normalizeInto(q, parts[0].dim, d);
  return q;
}

// ── Stage 2 helpers ──────────────────────────────────────────────────────────

const isBg = (r, g, b) => r > 238 && g > 238 && b > 238;

/** Pad an RGB image to a centred white square (so DINOv2's centre crop keeps the whole product). */
function padSquare(image) {
  const { width: w, height: h, data } = image;
  const s = Math.max(w, h);
  const out = new Uint8ClampedArray(s * s * 3).fill(255);
  const ox = (s - w) >> 1, oy = (s - h) >> 1;
  for (let y = 0; y < h; y++) out.set(data.subarray(y * w * 3, (y + 1) * w * 3), ((y + oy) * s + ox) * 3);
  return new RawImage(out, s, s, 3);
}

/** HSV colour histogram of product pixels: 12 hues x 3 sat x 3 val + 4 greys. L1-normalised. */
function colorHist(image) {
  const H = 12, S = 3, V = 3, G = 4;
  const hist = new Float32Array(H * S * V + G);
  const d = image.data;
  let n = 0;
  for (let i = 0; i < d.length; i += 3 * 2) { // every 2nd pixel is plenty
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (isBg(r, g, b)) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
    if (s < 0.15) { hist[H * S * V + Math.min(G - 1, Math.floor(v * G))]++; n++; continue; }
    let h;
    if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
    const hi = Math.floor(h / 6 * H) % H, si = Math.min(S - 1, Math.floor(s * S)), vi = Math.min(V - 1, Math.floor(v * V));
    hist[(hi * S + si) * V + vi]++; n++;
  }
  if (n) for (let i = 0; i < hist.length; i++) hist[i] /= n;
  return hist;
}

function histSim(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.min(a[i], b[i]);
  return s; // 0..1
}

/** DINOv2 patch tokens (unit-normalised) + which patches contain product pixels. */
async function patchFeatures(image) {
  const { dinoProc, dino } = models;
  const sq = padSquare(image);
  const inputs = await dinoProc(sq);
  const { last_hidden_state: t } = await dino(inputs);
  const [, tokens, D] = t.dims;
  const n = tokens - 1;               // drop CLS
  const side = Math.round(Math.sqrt(n));
  const patches = new Float32Array(n * D);
  for (let p = 0; p < n; p++) {
    const src = t.data.subarray((p + 1) * D, (p + 2) * D);
    let s = 0; for (let i = 0; i < D; i++) s += src[i] * src[i];
    s = Math.sqrt(s) || 1;
    for (let i = 0; i < D; i++) patches[p * D + i] = src[i] / s;
  }
  // foreground mask on the same 224 grid the model saw (resize 256 -> centre crop 224)
  const pv = inputs.pixel_values; // [1,3,224,224], normalised
  const [, , PH, PW] = pv.dims;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const ps = PH / side;
  const fg = new Uint8Array(n);
  for (let gy = 0; gy < side; gy++) for (let gx = 0; gx < side; gx++) {
    let cnt = 0, tot = 0;
    for (let y = Math.floor(gy * ps); y < Math.floor((gy + 1) * ps); y += 2) for (let x = Math.floor(gx * ps); x < Math.floor((gx + 1) * ps); x += 2) {
      const px = c => (pv.data[c * PH * PW + y * PW + x] * std[c] + mean[c]) * 255;
      if (!isBg(px(0), px(1), px(2))) cnt++;
      tot++;
    }
    fg[gy * side + gx] = cnt / tot > 0.15 ? 1 : 0;
  }
  return { patches, fg, D, n };
}

/** Mean best-match cosine between foreground patches of a and b (symmetric). */
function patchMatch(a, b) {
  const one = (x, y) => {
    let sum = 0, cnt = 0;
    for (let i = 0; i < x.n; i++) {
      if (!x.fg[i]) continue;
      let best = -1;
      const oi = i * x.D;
      for (let j = 0; j < y.n; j++) {
        if (!y.fg[j]) continue;
        let d = 0; const oj = j * y.D;
        for (let k = 0; k < x.D; k++) d += x.patches[oi + k] * y.patches[oj + k];
        if (d > best) best = d;
      }
      if (best > -1) { sum += best; cnt++; }
    }
    return cnt ? sum / cnt : 0;
  };
  return (one(a, b) + one(b, a)) / 2;
}

/** Load a catalog image exactly like the index builder: white bg, trimmed, 5% margin. */
async function loadCatalogImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bmp = await createImageBitmap(await res.blob());
  const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const cv = new OffscreenCanvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const rgba = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!(rgba[i] > 243 && rgba[i + 1] > 243 && rgba[i + 2] > 243)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const mx = Math.round((x1 - x0) * MARGIN), my = Math.round((y1 - y0) * MARGIN);
  const cw = x1 - x0 + 1 + 2 * mx, ch = y1 - y0 + 1 + 2 * my;
  const out = new Uint8ClampedArray(cw * ch * 3).fill(255);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const si = (y * w + x) * 4, di = ((y - y0 + my) * cw + (x - x0 + mx)) * 3;
    out[di] = rgba[si]; out[di + 1] = rgba[si + 1]; out[di + 2] = rgba[si + 2];
  }
  return new RawImage(out, cw, ch, 3);
}

async function detailFor(row) {
  const id = ids[row];
  if (detailCache.has(id)) return detailCache.get(id);
  const p = (async () => {
    const img = await loadCatalogImage(images[row]);
    const feats = await patchFeatures(img);
    return { ...feats, hist: colorHist(img) };
  })();
  detailCache.set(id, p);
  try { return await p; } catch (e) { detailCache.delete(id); throw e; }
}

// ── Search ───────────────────────────────────────────────────────────────────

/** P(brand | photo) from the CLIP image embedding (first 512 dims of q, unit length). */
function brandProbs(q) {
  const n = brandNames.length;
  const logits = new Float32Array(n);
  for (let b = 0; b < n; b++) {
    let d = 0; const off = b * 512;
    for (let i = 0; i < 512; i++) d += q[i] * brandVecs[off + i];
    logits[b] = 100 * d / 127; // CLIP logit scale
  }
  const mx = Math.max(...logits);
  let sum = 0; const p = new Float32Array(n);
  for (let b = 0; b < n; b++) { p[b] = Math.exp(logits[b] - mx); sum += p[b]; }
  for (let b = 0; b < n; b++) p[b] /= sum;
  return p;
}

async function search({ id, pixels, width, height, topK = 40, indexUrl, debug = false, rerankN = RERANK_N, hubAlpha = HUB_ALPHA, weights = WEIGHTS, brandWeight = BRAND_WEIGHT, brandPull = BRAND_PULL }) {
  await init(indexUrl);
  self.postMessage({ type: 'status', stage: 'analyzing' });
  const subject = await isolateSubject(new RawImage(pixels, width, height, 3));
  const q = await embedGlobal(subject);

  // Stage 1: each part is unit-length, so dot / parts = average cosine similarity.
  const scale = 127 * parts.length;
  const g = new Float32Array(ids.length);
  for (let row = 0; row < ids.length; row++) {
    let dot = 0;
    const off = row * dim;
    for (let i = 0; i < dim; i++) dot += q[i] * matrix[off + i];
    g[row] = dot / scale;
  }
  const gRaw = debug ? Array.from(g) : null;
  for (let row = 0; row < ids.length; row++) g[row] -= hubAlpha * hub[row];
  const order = Array.from(g.keys()).sort((a, b) => g[b] - g[a]);

  // Brand recognition.
  const pb = brandNames.length ? brandProbs(q) : new Float32Array(0);
  let topBrand = -1;
  for (let b = 0; b < pb.length; b++) if (topBrand < 0 || pb[b] > pb[topBrand]) topBrand = b;
  const brandOf = row => (itemBrand[row] >= 0 ? pb[itemBrand[row]] : 0);

  // Stage 2: detailed comparison of the top candidates (+ best matches of the recognised brand).
  const cand = order.slice(0, rerankN);
  if (topBrand >= 0 && brandPull > 0) {
    const inCand = new Set(cand);
    let pulled = 0;
    for (const row of order.slice(rerankN, 300)) {
      if (pulled >= brandPull) break;
      if (itemBrand[row] === topBrand && !inCand.has(row)) { cand.push(row); pulled++; }
    }
  }
  const qFeat = await patchFeatures(subject);
  const qHist = colorHist(subject);
  const comps = [];
  for (let k = 0; k < cand.length; k++) {
    self.postMessage({ type: 'status', stage: 'comparing', progress: Math.round((k / cand.length) * 100) });
    const row = cand[k];
    try {
      const d = await detailFor(row);
      comps.push({ row, g: g[row], l: patchMatch(qFeat, d), c: histSim(qHist, d.hist) });
    } catch {
      comps.push({ row, g: g[row], l: 0, c: 0, failed: true });
    }
  }
  // Normalise each signal across the candidates (z-score) so weights are comparable.
  const z = (key) => {
    const v = comps.filter(x => !x.failed).map(x => x[key]);
    const m = v.reduce((a, b) => a + b, 0) / (v.length || 1);
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length || 1)) || 1;
    comps.forEach(x => { x['z' + key] = x.failed ? -3 : (x[key] - m) / sd; });
  };
  z('g'); z('l'); z('c');
  for (const x of comps) x.score = weights.global * x.zg + weights.local * x.zl + weights.color * x.zc + brandWeight * brandOf(x.row);
  comps.sort((a, b) => b.score - a.score);

  const reranked = comps.map(x => ({ id: ids[x.row], score: x.score }));
  const rest = order.slice(rerankN, topK).map(row => ({ id: ids[row], score: -10 + g[row] }));
  const results = [...reranked, ...rest].slice(0, Math.max(topK, rerankN));
  const detected = topBrand >= 0 && pb[topBrand] >= BRAND_SURE
    ? { name: brandNames[topBrand], confidence: +pb[topBrand].toFixed(2), inCatalog: brandCount[topBrand] > 0 }
    : null;
  const msg = { type: 'results', id, results, brand: detected };
  if (debug) {
    msg.debug = {
      stage1: order.slice(0, 200).map(row => ids[row]),
      comps: comps.map(x => ({ id: ids[x.row], g: gRaw[x.row], l: x.l, c: x.c, failed: !!x.failed })),
      brandP: Array.from(pb).map(v => +v.toFixed(4)), itemBrand: Array.from(itemBrand), brandNames,
      gRaw, ids, hub: Array.from(hub),
    };
  }
  self.postMessage(msg);
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') init(msg.indexUrl);
  else if (msg.type === 'search') {
    search(msg).catch(err => self.postMessage({ type: 'error', id: msg.id, message: err.message || String(err) }));
  }
};
