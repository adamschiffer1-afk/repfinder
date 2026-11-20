'use client';

/**
 * One anonymous visitor ID for the whole site, so page views, time on page and
 * product clicks of the same person end up under the same ID in the stats.
 * Older builds stored different IDs under other keys (`visitorId`, `visitor_id`);
 * those are only used to seed the shared key when it does not exist yet.
 */
const KEY = '__vf_visitor_id';
const LEGACY_KEYS = ['visitorId', 'visitor_id'];

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getVisitorId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = LEGACY_KEYS.map(k => localStorage.getItem(k)).find(Boolean) || newId();
      localStorage.setItem(KEY, id);
    }
    // keep legacy keys pointing at the same ID in case an old tab is still open
    LEGACY_KEYS.forEach(k => { if (localStorage.getItem(k) !== id) localStorage.setItem(k, id); });
    return id;
  } catch {
    return null;
  }
}
