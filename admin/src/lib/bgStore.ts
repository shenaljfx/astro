/**
 * Saved-backgrounds library for the image post generator — IndexedDB, so
 * uploaded backgrounds can be reused forever without re-uploading (localStorage
 * is too small for photos). Images are downscaled to ≤1920px JPEG on save.
 */

export interface SavedBg {
  id: string;
  name: string;
  dataUrl: string;
  at: string;
}

const DB_NAME = 'gc-studio';
const STORE = 'backgrounds';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function listBgs(): Promise<SavedBg[]> {
  try {
    const all = await tx<SavedBg[]>('readonly', (s) => s.getAll() as IDBRequest<SavedBg[]>);
    return (all || []).sort((a, b) => (a.at < b.at ? 1 : -1));
  } catch {
    return [];
  }
}

/** Downscale + recompress so the library stays lean (photos → ≤1920px JPEG). */
export function shrinkForStore(img: HTMLImageElement, maxSide = 1920): string {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

export async function saveBg(name: string, img: HTMLImageElement): Promise<SavedBg> {
  const item: SavedBg = {
    id: `bg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name || 'background',
    dataUrl: shrinkForStore(img),
    at: new Date().toISOString(),
  };
  await tx('readwrite', (s) => s.put(item));
  return item;
}

export async function deleteBg(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}
