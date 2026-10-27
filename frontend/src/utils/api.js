import axios from "axios";
import { openDB } from "idb";

const BASE     = import.meta.env.VITE_API_URL || "";
const DB_NAME  = "se7en_offline";
const DB_VER   = 2;
const QUEUE_STORE  = "pending_requests";
const CACHE_STORE  = "barber_cache";

// ── IndexedDB setup ──────────────────────────────────────────────────────────
export async function getDB() {
  return openDB(DB_NAME, DB_VER, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "offline_id" });
      }
      if (oldVersion < 2) {
        const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: "key" });
        cacheStore.createIndex("expires", "expires");
      }
    },
  });
}

// ── Cola offline ─────────────────────────────────────────────────────────────
export async function saveOffline(payload) {
  const db = await getDB();
  await db.put(QUEUE_STORE, { ...payload, savedAt: Date.now() });
}

export async function getPendingRequests() {
  const db = await getDB();
  return db.getAll(QUEUE_STORE);
}

export async function removePending(offline_id) {
  const db = await getDB();
  await db.delete(QUEUE_STORE, offline_id);
}

export async function getPendingCount() {
  const db = await getDB();
  return db.count(QUEUE_STORE);
}

// ── Caché local (catálogo barbero) ────────────────────────────────────────────
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function setCacheItem(key, value, ttl = CACHE_TTL) {
  const db = await getDB();
  await db.put(CACHE_STORE, { key, value, expires: Date.now() + ttl });
}

export async function getCacheItem(key) {
  const db = await getDB();
  const item = await db.get(CACHE_STORE, key);
  if (!item) return null;
  if (item.expires < Date.now()) {
    await db.delete(CACHE_STORE, key);
    return null;
  }
  return item.value;
}

export async function clearExpiredCache() {
  const db = await getDB();
  const now = Date.now();
  const tx = db.transaction(CACHE_STORE, "readwrite");
  const index = tx.store.index("expires");
  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.expires < now) await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("se7en_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem("se7en_token");
      sessionStorage.removeItem("se7en_user");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ── Fetch con caché offline (solo para barbero) ───────────────────────────────
export async function cachedGet(endpoint, cacheKey, ttl = CACHE_TTL) {
  // Primero intenta desde red
  try {
    const res = await api.get(endpoint);
    await setCacheItem(cacheKey, res.data, ttl);
    return res.data;
  } catch {
    // Sin conexión → usar caché
    const cached = await getCacheItem(cacheKey);
    if (cached) return cached;
    throw new Error(`Sin conexión y sin caché para ${cacheKey}`);
  }
}

// ── Sincronización de cola offline ───────────────────────────────────────────
export async function sincronizarCola(onProgress) {
  const pendientes = await getPendingRequests();
  if (!pendientes.length) return 0;

  let count = 0;
  let errors = 0;

  for (const item of pendientes) {
    try {
      await api.post(item.endpoint, item.payload);
      await removePending(item.offline_id);
      count++;
      onProgress?.(count, pendientes.length, errors);
    } catch (err) {
      // Deduplicación: el servidor devuelve 200 si ya existe
      if (err.response?.status === 200 || err.response?.status === 409) {
        await removePending(item.offline_id);
        count++;
        onProgress?.(count, pendientes.length, errors);
      } else if (!err.response) {
        // Error de red — dejar en cola
        errors++;
        console.warn("Sync red error para", item.offline_id);
      } else {
        // Error del servidor (400, 500) — remover para no bloquear la cola
        console.error("Sync server error, removiendo", item.offline_id, err.response?.status);
        await removePending(item.offline_id);
        errors++;
      }
    }
  }

  // Limpiar caché expirada en background
  clearExpiredCache().catch(() => {});
  return count;
}
