/**
 * Unified "recent generations" log shared by the three generators, so the
 * dashboard can show one production feed. localStorage-backed (this studio is
 * a two-person internal tool; no server persistence needed).
 */

export type HistoryKind = 'video' | 'image' | 'text';

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  title: string;
  meta?: string;
  at: string; // ISO timestamp
}

const KEY = 'gc_studio_history';
const MIGRATED_KEY = 'gc_studio_history_migrated';
const CAP = 60;

function read(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function getHistory(): HistoryItem[] {
  return read().sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function addHistory(kind: HistoryKind, title: string, meta?: string): void {
  const items = read();
  items.push({
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind,
    title,
    meta,
    at: new Date().toISOString(),
  });
  localStorage.setItem(KEY, JSON.stringify(items.slice(-CAP)));
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}

/** One-time import of reels generated before the studio redesign. */
export function migrateLegacyReels(): void {
  if (typeof window === 'undefined' || localStorage.getItem(MIGRATED_KEY)) return;
  try {
    const reels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
    if (Array.isArray(reels) && reels.length) {
      const items = read();
      for (const r of reels) {
        items.push({
          id: `h_legacy_${r.id || Math.random().toString(36).slice(2, 8)}`,
          kind: 'video',
          title: `Reel — ${r.sign || 'General'}`,
          meta: r.templateType,
          at: r.createdAt || new Date().toISOString(),
        });
      }
      localStorage.setItem(KEY, JSON.stringify(items.slice(-CAP)));
    }
  } catch {
    /* legacy data unreadable — skip */
  }
  localStorage.setItem(MIGRATED_KEY, '1');
}
