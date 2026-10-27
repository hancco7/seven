# Manual de Funcionalidad Offline — Flujo Barbero

## Resumen

La lógica offline aplica **exclusivamente al flujo del barbero** (pantallas: Selección de barbero, Home del barbero, Registro de ventas, Modal de egresos). El admin siempre requiere conexión.

---

## ¿Cómo funciona?

### Arquitectura

```
[Barbero registra venta/egreso]
         │
         ▼
  ¿Hay conexión?
    ┌────┴────┐
   SÍ        NO
    │          │
    ▼          ▼
 POST API   Guardar en
 /ventas    IndexedDB
    │       (cola local)
    │          │
    ▼          │
  Éxito ───► Done
              │
    ──────────┘
    Al recuperar internet:
    ▼
 sincronizarCola()
    │
    ▼
 Envía cada pendiente
 a la API → elimina de cola
```

### Almacenamiento local

Se usa **IndexedDB** (base de datos del navegador/WebView) mediante la librería `idb`.

Base de datos: `se7en_offline` (versión 2)

| Store | Propósito |
|-------|-----------|
| `pending_requests` | Cola de ventas/egresos pendientes de sincronizar |
| `barber_cache` | Caché del catálogo (servicios, productos, cliente genérico) |

---

## Comportamiento por escenario

### Escenario 1: Conexión disponible (normal)

1. Barbero registra venta → se envía directamente a la API
2. Si la API responde OK → listo, sin registro local
3. Si la API falla por error de red → se guarda localmente (fallback automático)

### Escenario 2: Sin conexión

1. Barbero abre la app → catálogo cargado desde caché (si ya se usó antes con conexión)
2. Barbero registra venta → se guarda en IndexedDB con un `offline_id` único (UUID v4)
3. Aparece banner rojo: **"Sin conexión — Guardado localmente"**
4. El badge del contador muestra cuántos registros están pendientes

### Escenario 3: Conexión recuperada

1. El evento `window.online` dispara automáticamente `sincronizarCola()`
2. Barra azul: **"Sincronizando N registro(s) pendiente(s)…"**
3. Cada registro se envía en orden (FIFO) al backend
4. El backend verifica duplicados por `offline_id` antes de insertar
5. Al terminar: toast verde **"✓ N registro(s) sincronizado(s) con éxito"**

---

## Deduplicación

Cada registro tiene un `offline_id` (UUID v4) generado en el frontend.

El backend verifica antes de insertar:
```sql
SELECT id FROM ventas WHERE offline_id = $1
```
Si ya existe → devuelve `200 { duplicado: true }` y no inserta de nuevo.

Esto garantiza que aunque el barbero pierda y recupere conexión múltiples veces, **nunca se duplicará un registro**.

---

## Caché del catálogo

Los datos del catálogo (servicios favoritos, productos favoritos, cliente genérico) se cachean localmente por **1 hora**.

- Si hay conexión → actualiza caché y muestra datos frescos
- Si no hay conexión → usa caché (banner amarillo: "Catálogo en caché")
- Si no hay caché y no hay conexión → toast de aviso

---

## Indicadores visuales

| Estado | Color | Ubicación | Mensaje |
|--------|-------|-----------|---------|
| Sin conexión | 🔴 Rojo | Barra fija arriba | "Sin conexión — Guardado localmente" |
| Sincronizando | 🔵 Azul | Barra fija arriba | "Sincronizando N registro(s)…" |
| Pendientes con conexión | 🟡 Amarillo | Barra fija arriba | "N pendiente(s) — [Sincronizar ahora]" |
| Error de sync | 🟠 Naranja | Barra fija arriba | "Error al sincronizar — [Reintentar]" |
| Registro guardado offline | 🟡 Toast | Esquina inferior | "Sin conexión — Venta guardada localmente ✓" |
| Catálogo en caché | 🟡 Banner | Panel de registro | "Catálogo en caché" |

---

## Limitaciones

- **Sin conexión no se puede crear clientes nuevos** (la búsqueda de clientes requiere API). Se usa el cliente genérico como alternativa.
- **El catálogo en caché no se actualiza** si se agregan nuevos servicios/productos mientras el dispositivo está offline. Al recuperar conexión, el caché se actualiza en el siguiente acceso.
- **El flujo admin no tiene soporte offline** — si el admin pierde conexión, las acciones fallaran y mostraran error.

---

## Estructura de archivos nuevos/modificados

```
frontend/src/
├── utils/
│   └── api.js                    ← MODIFICADO: caché + cola mejorada
├── hooks/
│   ├── useOfflineSync.js         ← NUEVO: hook central de sync
│   └── useOnline.js              ← MODIFICADO: re-export compatibilidad
├── components/
│   ├── OfflineStatusBar.jsx      ← NUEVO: barra de estado
│   ├── EgresoModal.jsx           ← MODIFICADO: soporte offline
│   └── Topbar.jsx                ← MODIFICADO: usa nuevo hook
├── pages/
│   └── Registro.jsx              ← MODIFICADO: catálogo en caché + offline
└── App.jsx                       ← MODIFICADO: incluye OfflineStatusBar
```

