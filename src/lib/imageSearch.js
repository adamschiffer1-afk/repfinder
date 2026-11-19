'use client';

/**
 * Browser-side image search. Model + product index are loaded lazily into a
 * Web Worker (public/image-search-worker.js); nothing is sent to a server.
 */

const INDEX_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/search-index/image-index.json`;
const MAX_SIDE = 512;

let worker = null;
let nextId = 1;
const pending = new Map();
const statusListeners = new Set();

// Bump when public/image-search-worker.js changes, so browsers never keep an old copy.
const WORKER_VERSION = '3';

/** Drop a failed worker so the next attempt starts clean (and picks up fresh code). */
function resetWorker() {
  worker?.terminate();
  worker = null;
}

function failAll(err) {
  console.error('[ImageSearch]', err.message);
  pending.forEach(p => p.reject(err));
  pending.clear();
  statusListeners.forEach(fn => fn({ type: 'status', stage: 'error', message: err.message }));
  resetWorker();
}

function getWorker() {
  if (worker) return worker;
  worker = new Worker(`/image-search-worker.js?v=${WORKER_VERSION}`, { type: 'module' });
  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'status') {
      statusListeners.forEach(fn => fn(msg));
    } else if (msg.type === 'results') {
      pending.get(msg.id)?.resolve(msg.results);
      pending.delete(msg.id);
    } else if (msg.type === 'error') {
      failAll(new Error(msg.message));
    }
  };
  worker.onerror = (e) => {
    e.preventDefault?.();
    failAll(new Error(e.message || 'Image search worker failed to start'));
  };
  return worker;
}

/** Start downloading the model + index in the background. */
export function warmUpImageSearch() {
  getWorker().postMessage({ type: 'init', indexUrl: INDEX_URL });
}

export function onImageSearchStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

/** Decode an image file to RGB pixels on a white background (matches the index builder). */
async function fileToRgb(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const rgba = ctx.getImageData(0, 0, width, height).data;
  const rgb = new Uint8ClampedArray(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  return { pixels: rgb, width, height };
}

/** Returns [{ id, score }] sorted by similarity (best first). */
export async function searchByImage(file, topK = 40) {
  const { pixels, width, height } = await fileToRgb(file);
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'search', id, pixels, width, height, topK, indexUrl: INDEX_URL }, [pixels.buffer]);
  });
}
