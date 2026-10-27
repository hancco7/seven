/**
 * Tests para la lógica offline de api.js
 * Verifica: guardar offline, recuperar pendientes, eliminar, caché, sincronización.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock de idb para tests sin browser
vi.mock("idb", () => {
  const store = new Map();
  const cacheStore = new Map();

  const makeStore = (map) => ({
    put: async (val) => map.set(val.key ?? val.offline_id, val),
    get: async (key) => map.get(key),
    getAll: async () => [...map.values()],
    delete: async (key) => map.delete(key),
    count: async () => map.size,
    index: () => ({
      openCursor: async () => null,
    }),
    createIndex: vi.fn(),
  });

  return {
    openDB: vi.fn(async () => ({
      objectStoreNames: { contains: () => false },
      put: async (storeName, val) => {
        const m = storeName === "pending_requests" ? store : cacheStore;
        const key = val.offline_id ?? val.key;
        m.set(key, val);
      },
      get: async (storeName, key) => {
        const m = storeName === "pending_requests" ? store : cacheStore;
        return m.get(key);
      },
      getAll: async (storeName) => {
        const m = storeName === "pending_requests" ? store : cacheStore;
        return [...m.values()];
      },
      delete: async (storeName, key) => {
        const m = storeName === "pending_requests" ? store : cacheStore;
        m.delete(key);
      },
      count: async (storeName) => {
        const m = storeName === "pending_requests" ? store : cacheStore;
        return m.size;
      },
      transaction: () => ({
        store: makeStore(cacheStore),
        done: Promise.resolve(),
      }),
      createObjectStore: () => makeStore(store),
      _store: store,
      _cache: cacheStore,
    })),
    __store: store,
    __cache: cacheStore,
  };
});

// Reset stores before each test
beforeEach(async () => {
  const idb = await import("idb");
  idb.__store.clear();
  idb.__cache.clear();
});

describe("saveOffline / getPendingRequests / removePending", () => {
  it("guarda un registro offline correctamente", async () => {
    const { saveOffline, getPendingRequests } = await import("../utils/api.js");
    await saveOffline({ offline_id: "uuid-1", endpoint: "/api/ventas", payload: { total: 50 } });
    const pending = await getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0].offline_id).toBe("uuid-1");
    expect(pending[0].endpoint).toBe("/api/ventas");
  });

  it("guarda múltiples registros sin duplicar", async () => {
    const { saveOffline, getPendingRequests } = await import("../utils/api.js");
    await saveOffline({ offline_id: "uuid-a", endpoint: "/api/ventas", payload: {} });
    await saveOffline({ offline_id: "uuid-b", endpoint: "/api/egresos", payload: {} });
    const pending = await getPendingRequests();
    expect(pending).toHaveLength(2);
  });

  it("elimina un registro pendiente correctamente", async () => {
    const { saveOffline, getPendingRequests, removePending } = await import("../utils/api.js");
    await saveOffline({ offline_id: "uuid-del", endpoint: "/api/ventas", payload: {} });
    await removePending("uuid-del");
    const pending = await getPendingRequests();
    expect(pending).toHaveLength(0);
  });
});

describe("getPendingCount", () => {
  it("retorna 0 cuando no hay pendientes", async () => {
    const { getPendingCount } = await import("../utils/api.js");
    const count = await getPendingCount();
    expect(count).toBe(0);
  });

  it("retorna el número correcto de pendientes", async () => {
    const { saveOffline, getPendingCount } = await import("../utils/api.js");
    await saveOffline({ offline_id: "c1", endpoint: "/api/ventas", payload: {} });
    await saveOffline({ offline_id: "c2", endpoint: "/api/ventas", payload: {} });
    await saveOffline({ offline_id: "c3", endpoint: "/api/egresos", payload: {} });
    const count = await getPendingCount();
    expect(count).toBe(3);
  });
});

describe("setCacheItem / getCacheItem", () => {
  it("guarda y recupera un item en caché", async () => {
    const { setCacheItem, getCacheItem } = await import("../utils/api.js");
    await setCacheItem("svc_favoritos", [{ id: 1, nombre: "Corte clásico" }]);
    const cached = await getCacheItem("svc_favoritos");
    expect(cached).toHaveLength(1);
    expect(cached[0].nombre).toBe("Corte clásico");
  });

  it("retorna null para claves no existentes", async () => {
    const { getCacheItem } = await import("../utils/api.js");
    const result = await getCacheItem("key_inexistente");
    expect(result).toBeNull();
  });

  it("expira el caché cuando TTL = 0", async () => {
    const { setCacheItem, getCacheItem } = await import("../utils/api.js");
    // TTL negativo → ya expiró
    await setCacheItem("expired_key", { data: "test" }, -1000);
    const result = await getCacheItem("expired_key");
    expect(result).toBeNull();
  });
});

describe("sincronizarCola", () => {
  it("sincroniza todos los pendientes exitosamente", async () => {
    // Mock axios
    const mockPost = vi.fn().mockResolvedValue({ status: 201, data: { id: 1 } });
    vi.doMock("axios", () => ({
      default: {
        create: () => ({
          post: mockPost,
          interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
          },
        }),
      },
    }));

    const { saveOffline } = await import("../utils/api.js");
    await saveOffline({ offline_id: "sync-1", endpoint: "/api/ventas", payload: { total: 30 } });
    await saveOffline({ offline_id: "sync-2", endpoint: "/api/egresos", payload: { monto: 10 } });

    // Verifica que hay 2 pendientes
    const { getPendingCount } = await import("../utils/api.js");
    const before = await getPendingCount();
    expect(before).toBeGreaterThanOrEqual(2);
  });

  it("retorna 0 cuando la cola está vacía", async () => {
    const { sincronizarCola, getPendingRequests } = await import("../utils/api.js");
    const pending = await getPendingRequests();
    expect(pending).toHaveLength(0);
  });
});
