// @ts-check
/**
 * Saves paintings on the device (IndexedDB: pictures are too big for localStorage).
 * Falls back to memory if IndexedDB is unavailable (e.g. private mode).
 * @module paint/store
 */
import { PAINT } from '../config.js';

/** @typedef {{pig: Uint8Array, cov: Uint8Array}} SavedPicture */

/** Memory fallback. @type {Map<string, SavedPicture>} */
const memory = new Map();
/** @type {Promise<IDBDatabase|null>|null} */
let dbPromise = null;

/**
 * Opens the database once.
 * @returns {Promise<IDBDatabase|null>}
 */
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(PAINT.dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(PAINT.dbStore);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/**
 * Saves a painting.
 * @param {string} id Picture id.
 * @param {SavedPicture} pic Pigment and coverage data (copied).
 * @returns {Promise<void>}
 */
export async function savePicture(id, pic) {
  const copy = { pig: pic.pig.slice(), cov: pic.cov.slice() };
  const db = await openDb();
  if (!db) {
    memory.set(id, copy);
    return;
  }
  await new Promise((resolve) => {
    const tx = db.transaction(PAINT.dbStore, 'readwrite');
    tx.objectStore(PAINT.dbStore).put(copy, id);
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => { memory.set(id, copy); resolve(undefined); };
  });
}

/**
 * Loads a painting.
 * @param {string} id Picture id.
 * @returns {Promise<SavedPicture|null>}
 */
export async function loadPicture(id) {
  const db = await openDb();
  if (!db) return memory.get(id) || null;
  return new Promise((resolve) => {
    const req = db.transaction(PAINT.dbStore, 'readonly').objectStore(PAINT.dbStore).get(id);
    req.onsuccess = () => {
      const v = req.result;
      resolve(v && v.pig instanceof Uint8Array && v.cov instanceof Uint8Array ? v : memory.get(id) || null);
    };
    req.onerror = () => resolve(memory.get(id) || null);
  });
}
