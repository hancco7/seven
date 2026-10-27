/**
 * Tests de la cola de sincronización
 * Verifica: orden de sincronización, manejo de errores, progreso.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulación simplificada de la cola
class SyncQueue {
  constructor() {
    this.items = new Map();
  }

  async add(item) {
    this.items.set(item.offline_id, { ...item, savedAt: Date.now() });
  }

  async remove(id) {
    this.items.delete(id);
  }

  async getAll() {
    return [...this.items.values()].sort((a, b) => a.savedAt - b.savedAt);
  }

  async count() {
    return this.items.size;
  }

  async sync(postFn, onProgress) {
    const pending = await this.getAll();
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        await postFn(item.endpoint, item.payload);
        await this.remove(item.offline_id);
        synced++;
        onProgress?.(synced, pending.length, failed);
      } catch (err) {
        if (err.status === 200 || err.status === 409) {
          // Deduplicado → remover
          await this.remove(item.offline_id);
          synced++;
        } else if (!err.response) {
          // Error de red → dejar
          failed++;
        } else {
          // Error servidor → remover
          await this.remove(item.offline_id);
          failed++;
        }
      }
    }
    return { synced, failed };
  }
}

let queue;
beforeEach(() => { queue = new SyncQueue(); });

describe("SyncQueue básica", () => {
  it("empieza vacía", async () => {
    expect(await queue.count()).toBe(0);
  });

  it("agrega y cuenta elementos", async () => {
    await queue.add({ offline_id: "q1", endpoint: "/api/ventas", payload: {} });
    await queue.add({ offline_id: "q2", endpoint: "/api/egresos", payload: {} });
    expect(await queue.count()).toBe(2);
  });

  it("elimina elementos correctamente", async () => {
    await queue.add({ offline_id: "del1", endpoint: "/api/ventas", payload: {} });
    await queue.remove("del1");
    expect(await queue.count()).toBe(0);
  });

  it("mantiene orden de inserción (FIFO)", async () => {
    await queue.add({ offline_id: "first", endpoint: "/api/ventas", payload: { order: 1 } });
    await new Promise(r => setTimeout(r, 2)); // ensure different timestamps
    await queue.add({ offline_id: "second", endpoint: "/api/ventas", payload: { order: 2 } });
    const items = await queue.getAll();
    expect(items[0].offline_id).toBe("first");
    expect(items[1].offline_id).toBe("second");
  });
});

describe("SyncQueue.sync — casos exitosos", () => {
  it("sincroniza todos cuando la red está OK", async () => {
    await queue.add({ offline_id: "s1", endpoint: "/api/ventas", payload: { total: 25 } });
    await queue.add({ offline_id: "s2", endpoint: "/api/egresos", payload: { monto: 10 } });

    const mockPost = vi.fn().mockResolvedValue({ status: 201 });
    const { synced, failed } = await queue.sync(mockPost);

    expect(synced).toBe(2);
    expect(failed).toBe(0);
    expect(await queue.count()).toBe(0);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it("llama onProgress con los valores correctos", async () => {
    await queue.add({ offline_id: "p1", endpoint: "/api/ventas", payload: {} });
    await queue.add({ offline_id: "p2", endpoint: "/api/ventas", payload: {} });

    const mockPost = vi.fn().mockResolvedValue({ status: 201 });
    const progress = [];
    await queue.sync(mockPost, (synced, total, failed) => {
      progress.push({ synced, total, failed });
    });

    expect(progress).toHaveLength(2);
    expect(progress[0]).toEqual({ synced: 1, total: 2, failed: 0 });
    expect(progress[1]).toEqual({ synced: 2, total: 2, failed: 0 });
  });
});

describe("SyncQueue.sync — manejo de errores", () => {
  it("deja en cola si es error de red (sin .response)", async () => {
    await queue.add({ offline_id: "net1", endpoint: "/api/ventas", payload: {} });

    const networkErr = new Error("Network Error"); // sin .response
    const mockPost = vi.fn().mockRejectedValue(networkErr);
    const { synced, failed } = await queue.sync(mockPost);

    expect(synced).toBe(0);
    expect(failed).toBe(1);
    expect(await queue.count()).toBe(1); // sigue en cola
  });

  it("remueve si el servidor responde con error 400 (datos inválidos)", async () => {
    await queue.add({ offline_id: "bad1", endpoint: "/api/ventas", payload: {} });

    const serverErr = { response: { status: 400 }, message: "Bad Request" };
    const mockPost = vi.fn().mockRejectedValue(serverErr);
    const { synced, failed } = await queue.sync(mockPost);

    expect(failed).toBe(1);
    expect(await queue.count()).toBe(0); // removido para no bloquear cola
  });

  it("remueve si el servidor indica deduplicado (status 409)", async () => {
    await queue.add({ offline_id: "dup1", endpoint: "/api/ventas", payload: {} });

    const dupErr = { status: 409, message: "Duplicate" };
    const mockPost = vi.fn().mockRejectedValue(dupErr);
    const { synced } = await queue.sync(mockPost);

    expect(synced).toBe(1);
    expect(await queue.count()).toBe(0);
  });

  it("procesa los demás si uno falla con error de red", async () => {
    await queue.add({ offline_id: "ok1", endpoint: "/api/ventas", payload: {} });
    await queue.add({ offline_id: "fail1", endpoint: "/api/ventas", payload: {} });
    await queue.add({ offline_id: "ok2", endpoint: "/api/ventas", payload: {} });

    const networkErr = new Error("Network Error");
    const mockPost = vi.fn()
      .mockResolvedValueOnce({ status: 201 })     // ok1
      .mockRejectedValueOnce(networkErr)           // fail1 → queda en cola
      .mockResolvedValueOnce({ status: 201 });     // ok2

    const { synced, failed } = await queue.sync(mockPost);
    expect(synced).toBe(2);
    expect(failed).toBe(1);
    expect(await queue.count()).toBe(1); // solo fail1 queda
  });
});

describe("Validación de payload", () => {
  it("venta sin items es inválida", () => {
    const payload = { barbero_id: 1, cliente_id: 2, items: [], pagos: [{ metodo: "EFECTIVO", monto: 0 }] };
    const isValid = payload.items.length > 0 && payload.pagos.length > 0;
    expect(isValid).toBe(false);
  });

  it("venta con items y pagos es válida", () => {
    const payload = {
      barbero_id: 1, cliente_id: 2,
      items: [{ tipo: "S", item_id: 1, nombre_item: "Corte", precio_cobrado: 25 }],
      pagos: [{ metodo: "EFECTIVO", monto: 25 }],
    };
    const isValid = !!(payload.items.length > 0 && payload.pagos.length > 0 && payload.barbero_id && payload.cliente_id);
    expect(isValid).toBe(true);
  });

  it("egreso sin monto es inválido", () => {
    const form = { concepto: "PAGO A/C", monto: "", asignado_a: "1" };
    const errs = {};
    if (!form.monto || isNaN(parseFloat(form.monto)) || parseFloat(form.monto) <= 0)
      errs.monto = "Monto inválido";
    expect(errs.monto).toBeDefined();
  });

  it("egreso con todos los campos es válido", () => {
    const form = { concepto: "PAGO A/C", monto: "50", asignado_a: "1" };
    const errs = {};
    if (!form.concepto) errs.concepto = "error";
    if (!form.monto || isNaN(parseFloat(form.monto)) || parseFloat(form.monto) <= 0) errs.monto = "error";
    if (!form.asignado_a) errs.asignado_a = "error";
    expect(Object.keys(errs)).toHaveLength(0);
  });
});
