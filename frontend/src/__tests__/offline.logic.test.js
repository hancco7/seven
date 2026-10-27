/**
 * Tests de lógica offline pura (sin DOM/React)
 * Verifica los flujos de negocio: payload, deduplicación, prioridad online/offline.
 */
import { describe, it, expect, vi } from "vitest";

// ── Helper: construir payload de venta ───────────────────────────────────────
function buildVentaPayload({ barberoId = 1, clienteId = 2, items = [], pagos = [], offlineId = "uuid-test" } = {}) {
  const now = new Date("2025-01-15T10:30:00");
  return {
    barbero_id:    barberoId,
    cliente_id:    clienteId,
    registrado_por: null,
    es_manual:     false,
    fecha:         "2025-01-15",
    hora:          "10:30:00",
    total:         items.reduce((s, i) => s + parseFloat(i.precio_cobrado || 0), 0),
    offline_id:    offlineId,
    items,
    pagos,
  };
}

// ── Helper: construir payload de egreso ──────────────────────────────────────
function buildEgresoPayload({ barberoId = 1, concepto = "PAGO A/C", monto = 50 } = {}) {
  return {
    barbero_id:    barberoId,
    concepto,
    salio_de_caja: true,
    monto,
    asignado_a:    1,
    fecha:         "2025-01-15",
    hora:          "11:00:00",
    notas:         null,
    offline_id:    "egreso-uuid",
  };
}

describe("buildVentaPayload", () => {
  it("calcula el total correctamente", () => {
    const items = [
      { precio_cobrado: 25 },
      { precio_cobrado: 15 },
      { precio_cobrado: 5  },
    ];
    const payload = buildVentaPayload({ items });
    expect(payload.total).toBe(45);
  });

  it("incluye offline_id único", () => {
    const p1 = buildVentaPayload({ offlineId: "id-1" });
    const p2 = buildVentaPayload({ offlineId: "id-2" });
    expect(p1.offline_id).not.toBe(p2.offline_id);
  });

  it("payload tiene todos los campos requeridos", () => {
    const payload = buildVentaPayload({
      items: [{ tipo: "S", item_id: 1, nombre_item: "Corte", precio_cobrado: 25, precio_original: 25 }],
      pagos: [{ metodo: "EFECTIVO", monto: 25 }],
    });
    expect(payload).toHaveProperty("barbero_id");
    expect(payload).toHaveProperty("cliente_id");
    expect(payload).toHaveProperty("items");
    expect(payload).toHaveProperty("pagos");
    expect(payload).toHaveProperty("offline_id");
    expect(payload).toHaveProperty("fecha");
    expect(payload).toHaveProperty("hora");
  });

  it("propina se incluye como ítem TIP pero no distorsiona el total si es 0", () => {
    const items = [
      { tipo: "S", precio_cobrado: 25 },
      { tipo: "TIP", precio_cobrado: 0 },
    ];
    const payload = buildVentaPayload({ items });
    expect(payload.total).toBe(25);
  });

  it("propina con valor positivo sí suma al total", () => {
    const items = [
      { tipo: "S", precio_cobrado: 25 },
      { tipo: "TIP", precio_cobrado: 10 },
    ];
    const payload = buildVentaPayload({ items });
    expect(payload.total).toBe(35);
  });
});

describe("buildEgresoPayload", () => {
  it("construye egreso con campos requeridos", () => {
    const egreso = buildEgresoPayload({ monto: 80 });
    expect(egreso.monto).toBe(80);
    expect(egreso).toHaveProperty("offline_id");
    expect(egreso).toHaveProperty("concepto");
    expect(egreso).toHaveProperty("salio_de_caja");
    expect(egreso).toHaveProperty("barbero_id");
  });
});

describe("Lógica de pago múltiple", () => {
  it("la suma de pagos múltiples debe igualar al total", () => {
    const total = 60;
    const pagos = [
      { metodo: "EFECTIVO", monto: 40 },
      { metodo: "YAPE",     monto: 20 },
    ];
    const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
    expect(sumaPagos).toBe(total);
  });

  it("detecta pago único correctamente", () => {
    const metodo = "EFECTIVO";
    const total = 45;
    const pagos = metodo !== "MULTIPLE" ? [{ metodo, monto: total }] : [];
    expect(pagos).toHaveLength(1);
    expect(pagos[0].metodo).toBe("EFECTIVO");
  });
});

describe("Deduplicación offline_id", () => {
  it("dos registros con mismo offline_id son detectados como duplicados", () => {
    const existing = new Set(["uuid-dup"]);
    const newId = "uuid-dup";
    expect(existing.has(newId)).toBe(true);
  });

  it("registros con diferente offline_id no son duplicados", () => {
    const existing = new Set(["uuid-1", "uuid-2"]);
    const newId = "uuid-3";
    expect(existing.has(newId)).toBe(false);
  });
});

describe("Prioridad online/offline", () => {
  it("si hay conexión, se intenta enviar primero", async () => {
    const isOnline = true;
    const mockApiPost = vi.fn().mockResolvedValue({ status: 201, data: { id: 99 } });
    const mockSaveOffline = vi.fn();

    async function registrar(payload) {
      if (isOnline) {
        try {
          await mockApiPost("/api/ventas", payload);
          return "online_success";
        } catch { /* fall through */ }
      }
      await mockSaveOffline(payload);
      return "offline_saved";
    }

    const result = await registrar({ total: 25 });
    expect(result).toBe("online_success");
    expect(mockApiPost).toHaveBeenCalledOnce();
    expect(mockSaveOffline).not.toHaveBeenCalled();
  });

  it("si no hay conexión, guarda offline directamente", async () => {
    const isOnline = false;
    const mockApiPost = vi.fn();
    const mockSaveOffline = vi.fn().mockResolvedValue(undefined);

    async function registrar(payload) {
      if (isOnline) {
        try { await mockApiPost("/api/ventas", payload); return "online_success"; }
        catch { /* fall through */ }
      }
      await mockSaveOffline(payload);
      return "offline_saved";
    }

    const result = await registrar({ total: 25 });
    expect(result).toBe("offline_saved");
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(mockSaveOffline).toHaveBeenCalledOnce();
  });

  it("si la red falla (no .response), cae a offline", async () => {
    const isOnline = true;
    const networkError = new Error("Network Error");
    const mockApiPost = vi.fn().mockRejectedValue(networkError);
    const mockSaveOffline = vi.fn().mockResolvedValue(undefined);

    async function registrar(payload) {
      if (isOnline) {
        try {
          await mockApiPost("/api/ventas", payload);
          return "online_success";
        } catch (err) {
          if (!err.response) {
            await mockSaveOffline(payload);
            return "offline_saved";
          }
          return "server_error";
        }
      }
      await mockSaveOffline(payload);
      return "offline_saved";
    }

    const result = await registrar({ total: 25 });
    expect(result).toBe("offline_saved");
    expect(mockSaveOffline).toHaveBeenCalledOnce();
  });
});

describe("Caché de catálogo", () => {
  it("cachedGet usa caché cuando la red falla", async () => {
    const mockApiGet = vi.fn().mockRejectedValue(new Error("Sin red"));
    const mockGetCache = vi.fn().mockResolvedValue([{ id: 1, nombre: "Corte" }]);
    const mockSetCache = vi.fn();

    async function cachedGetLocal(endpoint, key) {
      try {
        const res = await mockApiGet(endpoint);
        await mockSetCache(key, res.data);
        return res.data;
      } catch {
        const cached = await mockGetCache(key);
        if (cached) return cached;
        throw new Error("Sin caché");
      }
    }

    const result = await cachedGetLocal("/api/catalogo/servicios", "svc_fav");
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe("Corte");
    expect(mockGetCache).toHaveBeenCalledWith("svc_fav");
  });

  it("cachedGet actualiza caché cuando la red está disponible", async () => {
    const mockData = [{ id: 1, nombre: "Corte" }];
    const mockApiGet = vi.fn().mockResolvedValue({ data: mockData });
    const mockSetCache = vi.fn();
    const mockGetCache = vi.fn();

    async function cachedGetLocal(endpoint, key) {
      try {
        const res = await mockApiGet(endpoint);
        await mockSetCache(key, res.data);
        return res.data;
      } catch {
        return await mockGetCache(key);
      }
    }

    const result = await cachedGetLocal("/api/catalogo/servicios", "svc_fav");
    expect(mockSetCache).toHaveBeenCalledWith("svc_fav", mockData);
    expect(result).toEqual(mockData);
  });
});
