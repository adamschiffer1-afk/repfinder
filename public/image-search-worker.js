/*
 * Image search worker — everything runs in the visitor's browser, no API.
 *
 * Pipeline for the user's photo:
 *   1. RMBG-1.4 removes the background (catalog images are cut-outs too)
 *   2. crop to the subject (+5% margin) on white, like the index builder
 *   3. CLIP ViT-B/16 + DINOv2-small embeddings, compared with the prebuilt
 *      product index (scripts/build_image_index.mjs, same models & version)
 *
 * Messages in:
 *   { type: 'init', indexUrl }
 *   { type: 'search', id, pixels: Uint8ClampedArray (RGB), width, height, topK, indexUrl }
 * Messages out:
 *   { type: 'status', stage: 'model' | 'ready', progress? }
 *   { type: 'results', id, results: [{ id, score }] }
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

env.allowLocalModels = false;
env.useBrowserCache = true;

let ready = null;
let models = null;
let ids = [];
let matrix = null; // Int8Array, rows * dim
let dim = 0;
let parts = [];

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

async function embed(image) {
  const { clipProc, clip, dinoProc, dino } = models;
  const q = new Float32Array(dim);
  const c = (await clip(await clipProc(image))).image_embeds.data;
  const { last_hidden_state } = await dino(await dinoProc(image));
  const d = last_hidden_state.data.slice(0, last_hidden_state.dims[2]); // CLS token
  normalizeInto(q, 0, c);
  normalizeInto(q, parts[0].dim, d);
  return q;
}

async function search({ id, pixels, width, height, topK = 40, indexUrl }) {
  await init(indexUrl);
  const subject = await isolateSubject(new RawImage(pixels, width, height, 3));
  const q = await embed(subject);

  // Each part is unit-length, so dot / parts = average cosine similarity.
  const scale = 127 * parts.length;
  const scores = new Float32Array(ids.length);
  for (let row = 0; row < ids.length; row++) {
    let dot = 0;
    const off = row * dim;
    for (let i = 0; i < dim; i++) dot += q[i] * matrix[off + i];
    scores[row] = dot / scale;
  }

  const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]);
  const results = order.slice(0, topK).map(row => ({ id: ids[row], score: scores[row] }));
  self.postMessage({ type: 'results', id, results });
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') init(msg.indexUrl);
  else if (msg.type === 'search') {
    search(msg).catch(err => self.postMessage({ type: 'error', id: msg.id, message: err.message || String(err) }));
  }
};
