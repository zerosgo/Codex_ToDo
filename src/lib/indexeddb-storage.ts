const DB_NAME = 'local-tasks-db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function idbSet(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

export async function idbGet(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
}

export async function idbDelete(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

export async function idbGetAll(): Promise<Record<string, string>> {
    if (typeof window === 'undefined') return {};
    const db = await openDb();
    const result = await new Promise<Record<string, string>>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const out: Record<string, string> = {};

        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                out[String(cursor.key)] = String(cursor.value);
                cursor.continue();
            } else {
                resolve(out);
            }
        };
        req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
}

