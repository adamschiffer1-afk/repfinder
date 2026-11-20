/**
 * Replaces product images that are not cut-outs (collages of several items, GIFs,
 * plain photos with a background) with a background-removed photo of the FIRST
 * style/variant from the product's KakoBuy listing.
 *
 *   node scripts/fix_collage_images.mjs scan                 -> scripts/.collage-scan.json
 *   node scripts/fix_collage_images.mjs fix --ids a,b [--dry] -> only these products
 *   node scripts/fix_collage_images.mjs fix --all [--dry]     -> every product flagged by scan
 *   node scripts/fix_collage_images.mjs fix --ids a,b --redo  -> re-process already replaced products
 * Image source: first style/variant image; listings without styles use the main photo.
 *
 * Products whose image already has a transparent background are never touched.
 * Every change is appended to scripts/.collage-backup.json (old -> new URL) so it can be reverted:
 *   node scripts/fix_collage_images.mjs revert
 *
 * Background removal runs locally with RMBG-1.4 (no external API).
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { AutoModel, AutoProcessor, RawImage, env } from '@xenova/transformers';

const sharp = createRequire(import.meta.url)('../node_modules/@xenova/transformers/node_modules/sharp');
dotenv.config({ path: '.env.local', quiet: true });
env.allowLocalModels = false;

const SCAN_FILE = 'scripts/.collage-scan.json';
const BACKUP_FILE = 'scripts/.collage-backup.json';
const PREVIEW_DIR = 'scripts/.collage-preview';
const BUCKET = 'product-images';
const CDP_PORT = 9360;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

async function fetchBuf(url, tries = 4, headers = {}) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (i >= tries - 1 || (r.status !== 429 && r.status < 500)) throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (i >= tries - 1) throw e; }
    await sleep(800 * 2 ** i);
  }
}

async function allProducts() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('products').select('id, name, image, link').range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** 'cutout' if the image has a real transparent background, otherwise a reason string. */
async function classify(url) {
  if (!url || /placeholder|text=No\+Image/i.test(url)) return 'no-image';
  const buf = await fetchBuf(url);
  const meta = await sharp(buf, { animated: false }).metadata();
  if (meta.format === 'gif') return 'gif';
  if (!meta.hasAlpha) return 'no-alpha';
  const { data, info } = await sharp(buf).resize(128, 128, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] < 16) transparent++;
  return transparent / (info.width * info.height) > 0.05 ? 'cutout' : 'opaque-alpha';
}

async function scan() {
  const products = await allProducts();
  const results = [];
  let i = 0;
  async function worker() {
    while (i < products.length) {
      const p = products[i++];
      let kind;
      try { kind = await classify(p.image); } catch (e) { kind = 'error:' + e.message; }
      results.push({ id: p.id, name: p.name, image: p.image, link: p.link, kind });
      if (results.length % 100 === 0) console.log(`  ${results.length}/${products.length}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  fs.writeFileSync(SCAN_FILE, JSON.stringify(results, null, 1));
  const counts = {};
  results.forEach(r => { const k = r.kind.startsWith('error') ? 'error' : r.kind; counts[k] = (counts[k] || 0) + 1; });
  console.log('scan done:', counts);
}

// ── KakoBuy: first style image via headless Chrome (CDP) ──
async function openBrowser() {
  const { launch } = await import('./lib/cdp.mjs');
  return launch({ port: CDP_PORT });
}

function sourceItemId(link) {
  const m = (link || '').match(/url=([^&]+)/);
  const src = m ? decodeURIComponent(m[1]) : link || '';
  const id = src.match(/itemI[Dd]=(\d+)/);
  return id ? { platform: 'weidian', id: id[1] } : null;
}

async function firstStyleImage(browser, link) {
  const item = sourceItemId(link);
  if (!item) throw new Error('no weidian item id in link');
  const url = `https://item2.kakobuy.com/item/details?url=${encodeURIComponent('https://weidian.com/item.html?itemID=' + item.id)}`;
  // KakoBuy often shows a transient "server error / may not exist" while loading: retry the page.
  for (let attempt = 0; attempt < 3; attempt++) {
    await browser.goto(url, 500);
    let missingFor = 0;
    for (let t = 0; t < 30; t++) {
      await sleep(600);
      const r = await browser.eval(`(() => {
        const style = [...document.querySelectorAll('.props-image, .spec img')].map(i => i.currentSrc || i.src).filter(Boolean);
        const gallery = [...document.querySelectorAll('.item-img img')].map(i => i.currentSrc || i.src).filter(Boolean);
        const missing = /Produkt może nie istnieć|may not exist/i.test(document.body.innerText);
        return { style, gallery, missing };
      })()`);
      if (r.style.length) return { url: r.style[0].replace(/\?.*$/, ''), from: 'style' };
      // No style/variant images: use the listing's main photo.
      if (t > 15 && r.gallery.length) return { url: r.gallery[0].replace(/\?.*$/, ''), from: 'main' };
      missingFor = r.missing ? missingFor + 1 : 0;
      if (missingFor >= 8) break; // stuck on "may not exist" for ~5 s: reload
    }
    await sleep(2000);
  }
  throw new Error('listing not found / no style images on KakoBuy');
}

// ── RMBG-1.4 background removal ──
let rmbg = null;
async function loadRmbg() {
  if (rmbg) return rmbg;
  const model = await AutoModel.from_pretrained('briaai/RMBG-1.4', { config: { model_type: 'custom' } });
  const processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
    config: {
      do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
      image_mean: [0.5, 0.5, 0.5], feature_extractor_type: 'ImageFeatureExtractor',
      image_std: [1, 1, 1], resample: 2, rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 },
    },
  });
  rmbg = { model, processor };
  return rmbg;
}

/** Returns a transparent PNG cropped to the product (+4% margin), max 1000px. */
async function removeBackground(buf) {
  const { model, processor } = await loadRmbg();
  const { data, info } = await sharp(buf).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(info.width, info.height);
  const w = info.width, h = info.height, N = w * h;
  const m = mask.data;

  // 1) Solid core = confident product pixels; keep only real blobs (drops specks of background).
  const core = new Uint8Array(N);
  for (let i = 0; i < N; i++) core[i] = m[i] > 128 ? 1 : 0;
  const label = new Int32Array(N);
  const sizes = [0];
  const stack = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!core[i] || label[i]) continue;
    const id = sizes.length; let sp = 0, size = 0;
    stack[sp++] = i; label[i] = id;
    while (sp) {
      const p = stack[--sp]; size++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && core[p - 1] && !label[p - 1]) { label[p - 1] = id; stack[sp++] = p - 1; }
      if (x < w - 1 && core[p + 1] && !label[p + 1]) { label[p + 1] = id; stack[sp++] = p + 1; }
      if (y > 0 && core[p - w] && !label[p - w]) { label[p - w] = id; stack[sp++] = p - w; }
      if (y < h - 1 && core[p + w] && !label[p + w]) { label[p + w] = id; stack[sp++] = p + w; }
    }
    sizes.push(size);
  }
  const biggest = Math.max(0, ...sizes);
  if (biggest < N * 0.02) throw new Error('background removal found no product');
  const keepLabel = sizes.map(s => s >= biggest * 0.05);
  const keep = new Uint8Array(N);
  for (let i = 0; i < N; i++) keep[i] = label[i] && keepLabel[label[i]] ? 1 : 0;

  // 2) Integral image of `keep` -> "is there product within R px?" in O(1).
  const R = Math.max(3, Math.round(Math.max(w, h) / 200));
  const integ = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += keep[y * w + x]; integ[(y + 1) * (w + 1) + x + 1] = integ[y * (w + 1) + x + 1] + row; }
  }
  const near = (x, y) => {
    const ax = Math.max(0, x - R), ay = Math.max(0, y - R), bx = Math.min(w, x + R + 1), by = Math.min(h, y + R + 1);
    return integ[by * (w + 1) + bx] - integ[ay * (w + 1) + bx] - integ[by * (w + 1) + ax] + integ[ay * (w + 1) + ax] > 0;
  };

  // 3) Soft but clean alpha: weak mask values -> 0, strong -> 255, anything far from the product -> 0.
  const rgba = Buffer.alloc(N * 4);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < N; i++) {
    const x = i % w, y = (i / w) | 0;
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2];
    let a = Math.round(Math.min(255, Math.max(0, (m[i] - 70) * 255 / (190 - 70))));
    if (a && !keep[i] && !near(x, y)) a = 0;
    rgba[i * 4 + 3] = a;
    if (keep[i]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const mx = Math.round((x1 - x0) * 0.04), my = Math.round((y1 - y0) * 0.04);
  const left = Math.max(0, x0 - mx), top = Math.max(0, y0 - my);
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: Math.min(w, x1 + mx + 1) - left, height: Math.min(h, y1 + my + 1) - top })
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function loadBackup() { try { return JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')); } catch { return []; } }

async function fix() {
  const scanData = JSON.parse(fs.readFileSync(SCAN_FILE, 'utf8'));
  const dry = flag('--dry');
  let targets;
  if (opt('--ids')) {
    const want = new Set(opt('--ids').split(','));
    targets = scanData.filter(r => want.has(r.id));
  } else if (flag('--all')) {
    targets = scanData.filter(r => ['gif', 'no-alpha', 'opaque-alpha'].includes(r.kind));
  } else throw new Error('use --ids a,b or --all');
  const backupNow = loadBackup();
  if (flag('--redo')) {
    // Re-process products that were already replaced (e.g. to switch to the main photo).
    // `old` becomes the current image, so `revert` (newest first) still walks back to the original.
    const lastNew = new Map(backupNow.map(b => [b.id, b.new]));
    targets = targets.map(r => ({ ...r, image: lastNew.get(r.id) || r.image }));
  } else {
    const done = new Set(backupNow.map(b => b.id));
    targets = targets.filter(r => r.kind !== 'cutout' && !done.has(r.id));
  }
  console.log(`targets: ${targets.length}${dry ? ' (dry run)' : ''}`);

  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const browser = await openBrowser();
  const failures = [];
  let ok = 0;
  try {
    for (const [n, p] of targets.entries()) {
      try {
        let style, png;
        if (flag('--best')) {
          ({ style, png } = await bestCutout(browser, p.link));
        } else {
          style = await firstStyleImage(browser, p.link);
          png = await removeBackground(await fetchBuf(style.url, 4, { Referer: 'https://item2.kakobuy.com/' }));
        }
        fs.writeFileSync(path.join(PREVIEW_DIR, `${p.id}.png`), png);
        if (!dry) await publish(p, png, style);
        ok++;
        console.log(`[${n + 1}/${targets.length}] ok  ${p.name} (${style.from})`);
      } catch (e) {
        failures.push({ id: p.id, name: p.name, error: e.message });
        console.log(`[${n + 1}/${targets.length}] FAIL ${p.name}: ${e.message}`);
      }
      await sleep(1500);
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync('scripts/.collage-failures.json', JSON.stringify(failures, null, 1));
  console.log(`done: ${ok} ok, ${failures.length} failed`);
}

/** Upload a cut-out, point the product at it and record the change for `revert`. */
async function publish(p, png, style) {
  const fileName = `nobg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(fileName, png, { contentType: 'image/png', upsert: false });
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  const { error: dbErr } = await supabase.from('products').update({ image: publicUrl, updated_at: new Date().toISOString() }).eq('id', p.id);
  if (dbErr) throw dbErr;
  const backup = loadBackup();
  backup.push({ id: p.id, name: p.name, old: p.image, new: publicUrl, source: style.url, from: style.from, at: new Date().toISOString() });
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 1));
}

/** All candidate photos of a listing: first style image, then the first gallery photos. */
async function listingImages(browser, link) {
  const item = sourceItemId(link);
  if (!item) throw new Error('no weidian item id in link');
  const url = `https://item2.kakobuy.com/item/details?url=${encodeURIComponent('https://weidian.com/item.html?itemID=' + item.id)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    await browser.goto(url, 500);
    for (let t = 0; t < 30; t++) {
      await sleep(600);
      const r = await browser.eval(`(() => ({
        style: [...document.querySelectorAll('.props-image, .spec img')].map(i => i.currentSrc || i.src).filter(Boolean),
        gallery: [...document.querySelectorAll('.item-img img')].map(i => i.currentSrc || i.src).filter(Boolean),
      }))()`);
      if (r.gallery.length && (r.style.length || t > 15)) {
        const clean = u => u.replace(/\?.*$/, '');
        const list = [];
        if (r.style[0]) list.push({ url: clean(r.style[0]), from: 'style' });
        r.gallery.slice(0, 5).forEach((u, i) => list.push({ url: clean(u), from: i ? `gallery#${i + 1}` : 'main' }));
        return list.filter((c, i, a) => a.findIndex(x => x.url === c.url) === i);
      }
    }
    await sleep(2000);
  }
  throw new Error('listing not found on KakoBuy');
}

/**
 * Cut-out quality (lower is better): opaque picture edges = background left over,
 * several similar-sized blobs = collage, lots of half-transparent pixels = unsure mask.
 */
async function cutoutPenalty(png) {
  const { analyze } = await import('./check_cutouts.mjs');
  const a = await analyze(png);
  const { data, info } = await sharp(png).resize(256, 256, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let soft = 0, solid = 0;
  for (let i = 3; i < data.length; i += 4) { if (data[i] > 220) solid++; else if (data[i] > 30) soft++; }
  return a.borderOpaque * 3 + Math.max(0, a.similarItems - 1) * 0.6 + (soft / Math.max(1, solid)) * 2;
}

async function bestCutout(browser, link) {
  const cands = await listingImages(browser, link);
  let best = null;
  for (const c of cands) {
    try {
      const png = await removeBackground(await fetchBuf(c.url, 4, { Referer: 'https://item2.kakobuy.com/' }));
      // Prefer the first style a little, so the product keeps its colourway when quality is similar.
      const score = await cutoutPenalty(png) - (c.from === 'style' ? 0.15 : 0);
      if (!best || score < best.score) best = { score, png, style: c };
    } catch { /* try next photo */ }
  }
  if (!best) throw new Error('no usable photo in listing');
  return { png: best.png, style: { ...best.style, from: `${best.style.from}, best of ${cands.length}` } };
}

/** For variant collages: keep only the first (top-left) item of the current cut-out. */
async function cropFirst() {
  const want = new Set((opt('--ids') || '').split(',').filter(Boolean));
  const dry = flag('--dry');
  const last = new Map(loadBackup().map(b => [b.id, b]));
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  for (const id of want) {
    const e = last.get(id);
    if (!e) { console.log('skip (not in backup)', id); continue; }
    const buf = await fetchBuf(e.new);
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, N = w * h;
    const solid = new Uint8Array(N);
    for (let i = 0; i < N; i++) solid[i] = data[i * 4 + 3] > 100 ? 1 : 0;
    const label = new Int32Array(N), stack = new Int32Array(N), comps = [];
    for (let i = 0; i < N; i++) {
      if (!solid[i] || label[i]) continue;
      const cid = comps.length + 1; let sp = 0, size = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      stack[sp++] = i; label[i] = cid;
      while (sp) {
        const p = stack[--sp]; size++;
        const x = p % w, y = (p / w) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (solid[q] && !label[q]) { label[q] = cid; stack[sp++] = q; }
        }
      }
      comps.push({ id: cid, size, x0, y0, x1, y1 });
    }
    const big = Math.max(...comps.map(c => c.size));
    const items = comps.filter(c => c.size >= big * 0.35);
    // reading order: rows (by vertical centre, tolerance = half an item height), then left to right
    const rowH = Math.max(...items.map(c => c.y1 - c.y0)) / 2;
    items.sort((a, b) => {
      const ra = Math.floor(((a.y0 + a.y1) / 2) / rowH), rb = Math.floor(((b.y0 + b.y1) / 2) / rowH);
      return ra - rb || a.x0 - b.x0;
    });
    const first = items[0];
    const pad = Math.round(Math.max(first.x1 - first.x0, first.y1 - first.y0) * 0.05);
    const out = Buffer.from(data);
    for (let i = 0; i < N; i++) {
      const x = i % w, y = (i / w) | 0;
      const inBox = x >= first.x0 - pad && x <= first.x1 + pad && y >= first.y0 - pad && y <= first.y1 + pad;
      if (!inBox || (label[i] && label[i] !== first.id && data[i * 4 + 3] > 100)) out[i * 4 + 3] = 0;
    }
    const left = Math.max(0, first.x0 - pad), top = Math.max(0, first.y0 - pad);
    const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left, top, width: Math.min(w, first.x1 + pad + 1) - left, height: Math.min(h, first.y1 + pad + 1) - top })
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: false })
      .png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(PREVIEW_DIR, `${id}.png`), png);
    if (!dry) await publish({ id, name: e.name, image: e.new }, png, { url: e.new, from: 'crop-first' });
    console.log(`ok  ${e.name}: kept 1 of ${items.length} items`);
  }
}

/** Publish already reviewed previews (scripts/.collage-preview/<id>.png) without re-processing. */
async function applyPreviews() {
  const last = new Map(loadBackup().map(b => [b.id, b]));
  for (const id of (opt('--ids') || '').split(',').filter(Boolean)) {
    const e = last.get(id);
    const file = path.join(PREVIEW_DIR, `${id}.png`);
    if (!e || !fs.existsSync(file)) { console.log('skip', id); continue; }
    await publish({ id, name: e.name, image: e.new }, fs.readFileSync(file), { url: file, from: opt('--from') || 'reviewed preview' });
    console.log('applied', e.name);
  }
}

async function revert() {
  const backup = loadBackup();
  for (const b of backup.reverse()) {
    const { error } = await supabase.from('products').update({ image: b.old }).eq('id', b.id);
    console.log(error ? `FAIL ${b.name}: ${error.message}` : `reverted ${b.name}`);
  }
  fs.renameSync(BACKUP_FILE, BACKUP_FILE + '.reverted-' + Date.now());
}

const run = { scan, fix, revert, 'crop-first': cropFirst, 'apply-previews': applyPreviews }[cmd];
if (!run) { console.log('usage: scan | fix --ids a,b [--dry] | fix --all [--dry] | revert'); process.exit(1); }
run().catch(e => { console.error(e); process.exit(1); });
