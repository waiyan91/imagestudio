// Simple IndexedDB helpers for storing generated images & prompts per-device.
// Uses a single object store 'history' keyed by id.

export type HistoryRecord = {
  id: string;
  prompt: string;
  model: string;
  images: { url?: string; b64_json?: string }[];
  error?: string;
  createdAt: number;
};

const DB_NAME = "imagestudio-db";
const DB_VERSION = 1;
const STORE = "history" as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function addHistory(rec: HistoryRecord): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE);
    store.put(rec);
  });
}

export async function getAllHistory(limit = 100): Promise<HistoryRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE);
    const idx = store.index("createdAt");
    const results: HistoryRecord[] = [];

    // Open cursor on createdAt index in descending order (newest first)
    const req = idx.openCursor(null, "prev");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value as HistoryRecord);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

export async function deleteHistory(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE);
    store.delete(id);
  });
}

export async function clearHistory(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(STORE);
    store.clear();
  });
}
