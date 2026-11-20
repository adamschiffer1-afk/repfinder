/**
 * Quality check for cut-out product images replaced by fix_collage_images.mjs.
 * Flags:  collage    – several separate items of similar size in one picture
 *         background – edges of the picture are opaque (background not removed)
 *   node scripts/check_cutouts.mjs   -> scripts/.cutout-check.json
 */
import fs from 'fs';
import { createRequire } from 'module';

const sharp = createRequire(import.meta.url)('../node_modules/@xenova/transformers/node_modules/sharp');
const backup = JSON.parse(fs.readFileSync('scripts/.collage-backup.json', 'utf8'));
const latest = new Map();
backup.forEach(e => latest.set(e.id, e));

export async function analyze(buf) {
  const { data, info } = await sharp(buf).resize(256, 256, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, N = w * h;
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) solid[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  // border opacity
  let border = 0, bt = 0;
  for (let x = 0; x < w; x++) { border += solid[x] + solid[(h - 1) * w + x]; bt += 2; }
  for (let y = 0; y < h; y++) { border += solid[y * w] + solid[y * w + w - 1]; bt += 2; }
  // connected components (8-neighbour) with bounding boxes
  const label = new Int32Array(N), comps = [], stack = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!solid[i] || label[i]) continue;
    const id = comps.length + 1; let sp = 0, size = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack[sp++] = i; label[i] = id;
    while (sp) {
      const p = stack[--sp]; size++;
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (solid[q] && !label[q]) { label[q] = id; stack[sp++] = q; }
      }
    }
    comps.push({ size, x0, y0, x1, y1 });
  }
  const big = Math.max(0, ...comps.map(c => c.size));
  const similar = comps.filter(c => c.size >= big * 0.35);
  return { borderOpaque: border / bt, similarItems: similar.length, comps: similar, w, h };
}

if (process.argv[1].endsWith('check_cutouts.mjs')) {
  const out = [];
  let i = 0;
  const items = [...latest.values()];
  async function worker() {
    while (i < items.length) {
      const e = items[i++];
      try {
        const buf = Buffer.from(await (await fetch(e.new)).arrayBuffer());
        const a = await analyze(buf);
        const flags = [];
        if (a.similarItems >= 3) flags.push('collage');
        if (a.borderOpaque > 0.25) flags.push('background');
        if (flags.length) out.push({ id: e.id, name: e.name, url: e.new, flags, items: a.similarItems, border: +a.borderOpaque.toFixed(2) });
      } catch (err) { out.push({ id: e.id, name: e.name, flags: ['error'], error: err.message }); }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync('scripts/.cutout-check.json', JSON.stringify(out, null, 1));
  const c = {}; out.forEach(o => o.flags.forEach(f => c[f] = (c[f] || 0) + 1));
  console.log('checked', items.length, 'flagged', out.length, c);
  console.log(out.map(o => `${o.flags.join('+')}  ${o.name}  (items ${o.items}, border ${o.border})`).join('\n'));
}
