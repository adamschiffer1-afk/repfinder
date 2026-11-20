/**
 * Builds the image-search index used by the "search by image" feature.
 *
 * For every product image it computes two embeddings locally (no external API):
 *   - CLIP ViT-B/16  — "what kind of thing is this" (robust to photo style)
 *   - DINOv2 small   — "is this the same object" (fine visual detail)
 * Each catalog image is embedded as-is and mirrored, and the two are averaged,
 * so left/right-facing photos match equally well.
 *
 * Result: one JSON file in the public Supabase bucket `search-index`.
 *
 * Run after adding/changing products:
 *   node scripts/build_image_index.mjs          (only new/changed images)
 *   node scripts/build_image_index.mjs --full   (recompute everything)
 *   node scripts/build_image_index.mjs --finalize (only recompute hubness, no models)
 *
 * public/image-search-worker.js uses the SAME models, version and preprocessing.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { AutoModel, AutoProcessor, AutoTokenizer, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage, env } from '@xenova/transformers';
import { brandOfName, brandPrompts, uniqueBrands } from './lib/brands.mjs';

// Use the same sharp/libvips copy that @xenova/transformers loads; two libvips
// versions in one process crash on Windows.
const sharp = createRequire(import.meta.url)('../node_modules/@xenova/transformers/node_modules/sharp');

dotenv.config({ path: '.env.local', quiet: true });

export const INDEX_VERSION = 'clip16+dinov2s/v2';
const CLIP_ID = 'Xenova/clip-vit-base-patch16';
const DINO_ID = 'Xenova/dinov2-small';
const PARTS = [{ name: 'clip', dim: 512 }, { name: 'dino', dim: 384 }];

// Dedicated public bucket (product-images only accepts image MIME types).
const BUCKET = 'search-index';
const INDEX_PATH = 'image-index.json';
const LOCAL_CACHE = 'scripts/.image-index-cache.json';
const CONCURRENCY = 2;
const MAX_SIDE = 512;
const MARGIN = 0.05;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

env.allowLocalModels = false;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalize(v) {
  let s = 0;
  for (const x of v) s += x * x;
  s = Math.sqrt(s) || 1;
  return Array.from(v, x => x / s);
}

function toInt8Base64(vec) {
  const out = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = Math.max(-127, Math.min(127, Math.round(vec[i] * 127)));
  return Buffer.from(out.buffer).toString('base64');
}

async function fetchWithRetry(url, tries = 5) {
  for (let i = 0; ; i++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (i >= tries - 1 || (res.status !== 429 && res.status < 500)) throw new Error(`HTTP ${res.status}`);
    await sleep(1000 * 2 ** i);
  }
}

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['application/json'],
    fileSizeLimit: '20MB',
  });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`Created public bucket "${BUCKET}"`);
}

/**
 * Product PNG -> white background, cropped to the product with a 5% margin
 * (the browser crops user photos to the cut-out subject the same way).
 * Returns [normal, mirrored] RawImages.
 */
async function loadImage(url) {
  const buf = Buffer.from(await (await fetchWithRetry(url)).arrayBuffer());
  const flat = await sharp(buf).flatten({ background: '#ffffff' }).removeAlpha().png().toBuffer();
  let base = sharp(flat);
  try {
    const trimmed = await sharp(flat).trim({ background: '#ffffff', threshold: 12 }).toBuffer({ resolveWithObject: true });
    const { width, height } = trimmed.info;
    const mx = Math.round(width * MARGIN), my = Math.round(height * MARGIN);
    base = sharp(trimmed.data).extend({ top: my, bottom: my, left: mx, right: mx, background: '#ffffff' });
  } catch { /* fully uniform image: keep as is */ }
  const resized = await base.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const toRaw = async (s) => {
    const { data, info } = await s.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
  };
  return [await toRaw(sharp(resized)), await toRaw(sharp(resized).flop())];
}

async function loadExistingIndex() {
  try {
    if (fs.existsSync(LOCAL_CACHE)) return JSON.parse(fs.readFileSync(LOCAL_CACHE, 'utf8'));
  } catch { /* fall through to remote */ }
  const { data, error } = await supabase.storage.from(BUCKET).download(INDEX_PATH);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}

async function fetchProducts() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('products')
      .select('id, image')
      .not('image', 'is', null)
      .range(from, from + 999);
    if (error) throw error;
    all.push(...data.filter(p => p.image && !isPlaceholder(p.image)));
    if (data.length < 1000) break;
  }
  return all;
}

const isPlaceholder = (url) => /placeholder|text=No\+Image|no-image/i.test(url || '');

async function main() {
  const full = process.argv.includes('--full');
  if (process.argv.includes('--finalize')) {
    // Recompute hubness / drop placeholders on the existing index without re-embedding.
    const existing = await loadExistingIndex();
    if (existing?.version !== INDEX_VERSION) throw new Error('No compatible index to finalize');
    await saveIndex(existing.items.filter(it => !isPlaceholder(it.image)));
    return;
  }
  console.log(`Loading models ${CLIP_ID} + ${DINO_ID}...`);
  const clipProc = await AutoProcessor.from_pretrained(CLIP_ID);
  const clip = await CLIPVisionModelWithProjection.from_pretrained(CLIP_ID);
  const dinoProc = await AutoProcessor.from_pretrained(DINO_ID);
  const dino = await AutoModel.from_pretrained(DINO_ID);

  async function embed(images) {
    const sum = [new Float32Array(512), new Float32Array(384)];
    for (const img of images) {
      const c = normalize((await clip(await clipProc(img))).image_embeds.data);
      const { last_hidden_state } = await dino(await dinoProc(img));
      const d = normalize(last_hidden_state.data.slice(0, last_hidden_state.dims[2])); // CLS token
      c.forEach((x, i) => { sum[0][i] += x; });
      d.forEach((x, i) => { sum[1][i] += x; });
    }
    return [...normalize(sum[0]), ...normalize(sum[1])];
  }

  const products = await fetchProducts();
  console.log(`Products with images: ${products.length}`);

  const existing = full ? null : await loadExistingIndex();
  const reuse = new Map();
  if (existing?.version === INDEX_VERSION) {
    for (const item of existing.items) reuse.set(item.id, item);
  }

  const items = [];
  const todo = [];
  for (const p of products) {
    const prev = reuse.get(p.id);
    if (prev && prev.image === p.image) items.push(prev);
    else todo.push(p);
  }
  console.log(`Reused: ${items.length}, to compute: ${todo.length}`);

  let done = 0;
  let failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const p = todo[cursor++];
      try {
        const views = await loadImage(p.image);
        items.push({ id: p.id, image: p.image, v: toInt8Base64(await embed(views)) });
      } catch (err) {
        failed++;
        console.warn(`  ! ${p.id}: ${err.message}`);
      }
      done++;
      if (done % 50 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await saveIndex(items, failed);
}

/**
 * "Hubness" of each item = mean similarity to its 10 nearest catalog neighbours.
 * Generic or collage-like images are close to everything and would otherwise
 * show up for almost any query; the browser subtracts a share of this score.
 */
function computeHubness(items) {
  const D = PARTS.reduce((a, p) => a + p.dim, 0);
  const vecs = items.map(it => { const b = Buffer.from(it.v, 'base64'); return new Int8Array(b.buffer, b.byteOffset, b.length).slice(); });
  const K = 10, scale = 127 * 127 * PARTS.length;
  for (let i = 0; i < items.length; i++) {
    const sims = [];
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      let d = 0;
      const a = vecs[i], b = vecs[j];
      for (let k = 0; k < D; k++) d += a[k] * b[k];
      sims.push(d / scale);
    }
    sims.sort((x, y) => y - x);
    items[i].h = +(sims.slice(0, K).reduce((s, x) => s + x, 0) / K).toFixed(4);
  }
}

/**
 * Brand recognition data: CLIP text embeddings for every brand (logo / lettering / product
 * prompts, averaged) and the brand of each catalog item, taken from its product name.
 */
async function computeBrands(items) {
  const names = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('products').select('id, name').range(from, from + 999);
    if (error) throw error;
    data.forEach(p => names.set(p.id, p.name));
    if (data.length < 1000) break;
  }
  const brands = uniqueBrands();
  const tokenizer = await AutoTokenizer.from_pretrained(CLIP_ID);
  const textModel = await CLIPTextModelWithProjection.from_pretrained(CLIP_ID);
  const out = [];
  for (const b of brands) {
    const prompts = brandPrompts(b);
    const inputs = tokenizer(prompts, { padding: true, truncation: true });
    const { text_embeds } = await textModel(inputs);
    const [n, d] = text_embeds.dims;
    const sum = new Float32Array(d);
    for (let i = 0; i < n; i++) {
      const row = normalize(text_embeds.data.slice(i * d, (i + 1) * d));
      row.forEach((x, k) => { sum[k] += x; });
    }
    out.push({ name: b, v: toInt8Base64(normalize(sum)) });
  }
  const idx = new Map(brands.map((b, i) => [b, i]));
  let tagged = 0;
  for (const it of items) {
    const b = brandOfName(names.get(it.id));
    it.b = b ? idx.get(b) : -1;
    if (b) tagged++;
  }
  console.log(`Brands: ${brands.length}, catalog items with a brand: ${tagged}/${items.length}`);
  return out;
}

async function saveIndex(items, failed = 0) {
  computeHubness(items);
  const brands = await computeBrands(items);
  const index = { version: INDEX_VERSION, models: { clip: CLIP_ID, dino: DINO_ID }, parts: PARTS, brands, updatedAt: new Date().toISOString(), items };
  const body = Buffer.from(JSON.stringify(index));
  fs.writeFileSync(LOCAL_CACHE, body);
  await ensureBucket();
  const { error } = await supabase.storage.from(BUCKET).upload(INDEX_PATH, body, {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '300',
  });
  if (error) throw error;

  console.log(`\nDone. ${items.length} items (${failed} failed), ${(body.length / 1024).toFixed(0)} KB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
