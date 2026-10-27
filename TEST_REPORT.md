# Reporte de Tests — Lógica Offline

**Fecha:** 2025-01-15  
**Resultado:** ✅ 39/39 tests pasando  
**Duración:** ~900ms

---

## Suites de tests

### 1. `offline.api.test.js` — IndexedDB (idb mock)

Tests de las funciones de bajo nivel del api.js:

| Test | Estado |
|------|--------|
| saveOffline guarda un registro correctamente | ✅ |
| saveOffline guarda múltiples registros sin duplicar | ✅ |
| removePending elimina registro correctamente | ✅ |
| getPendingCount retorna 0 cuando no hay pendientes | ✅ |
| getPendingCount retorna número correcto | ✅ |
| setCacheItem / getCacheItem guarda y recupera caché | ✅ |
| getCacheItem retorna null para claves inexistentes | ✅ |
| Caché expira correctamente con TTL negativo | ✅ |
| sincronizarCola — verifica pendientes antes de sync | ✅ |
| sincronizarCola retorna 0 con cola vacía | ✅ |

### 2. `offline.logic.test.js` — Lógica de negocio pura

Tests de la lógica de construcción de payloads y decisiones offline:

| Test | Estado |
|------|--------|
| buildVentaPayload calcula total correctamente | ✅ |
| buildVentaPayload offline_id único por registro | ✅ |
| Payload de venta tiene todos los campos requeridos | ✅ |
| Propina TIP con precio 0 no suma al total | ✅ |
| Propina TIP con precio positivo sí suma al total | ✅ |
| buildEgresoPayload construye con campos requeridos | ✅ |
| Pago múltiple: suma de pagos = total | ✅ |
| Pago único construido correctamente | ✅ |
| Deduplicación: mismo offline_id detectado | ✅ |
| Deduplicación: diferente offline_id no duplicado | ✅ |
| Con conexión: intenta API primero | ✅ |
| Sin conexión: guarda offline directamente | ✅ |
| Error de red (sin .response): cae a offline | ✅ |
| cachedGet usa caché cuando la red falla | ✅ |
| cachedGet actualiza caché con datos frescos | ✅ |

### 3. `sync.queue.test.js` — Cola de sincronización

Tests de la lógica de la cola FIFO y manejo de errores:

| Test | Estado |
|------|--------|
| Cola empieza vacía | ✅ |
| Cola agrega y cuenta elementos | ✅ |
| Cola elimina elementos correctamente | ✅ |
| Cola mantiene orden FIFO | ✅ |
| sync: sincroniza todos con red OK | ✅ |
| sync: llama onProgress con valores correctos | ✅ |
| sync: deja en cola si error de red (sin .response) | ✅ |
| sync: remueve con error 400 de servidor | ✅ |
| sync: remueve con deduplicación 409 | ✅ |
| sync: procesa siguientes si uno falla por red | ✅ |
| Validación: venta sin items es inválida | ✅ |
| Validación: venta con items y pagos es válida | ✅ |
| Validación: egreso sin monto es inválido | ✅ |
| Validación: egreso completo es válido | ✅ |

---

## Casos de borde cubiertos

- **Propina con valor 0**: No infla el total de la venta
- **Error de red vs error de servidor**: Distinción crítica — error de red mantiene en cola para reintentar, error de servidor limpia la cola para no bloquearla
- **Deduplicación por offline_id**: El mismo registro no puede enviarse dos veces
- **Caché expirada**: TTL negativo → null, TTL positivo → datos frescos
- **Cola FIFO**: Los registros se sincronizan en orden de creación
- **Sincronización parcial**: Si un ítem falla por red, los demás se procesan igual

---

## Cómo ejecutar los tests

```bash
cd Barber-v11/frontend

# Una vez
node ./node_modules/vitest/vitest.mjs run

# Con watch (desarrollo)
node ./node_modules/vitest/vitest.mjs

# Con cobertura
node ./node_modules/vitest/vitest.mjs run --coverage
```

