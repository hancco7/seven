/**
 * OfflineStatusBar
 * Barra de estado offline/sincronización visible SOLO en flujo barbero.
 * Muestra: sin conexión, sincronizando, o pendientes en cola.
 */
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useStore, useToast } from "../store/useStore";

export default function OfflineStatusBar() {
  const { state } = useStore();
  // Pantallas del barbero: letra 5 px más grande
  const fsk = ["barberSelect", "barberHome", "registro"].includes(state.screen) ? 5 : 0;
  const toast = useToast();

  const { isOnline, syncing, pendingCount, syncError, trySync } = useOfflineSync(
    (count) => toast(`✓ ${count} registro(s) sincronizado(s) con éxito`, "success")
  );

  // Solo mostrar en flujo barbero
  const isBarberoFlow = ["barberSelect", "barberHome", "registro"].includes(state.screen);
  if (!isBarberoFlow) return null;

  // Nada que mostrar si está online, no sincronizando y no hay pendientes
  if (isOnline && !syncing && pendingCount === 0 && !syncError) return null;

  if (!isOnline) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#7f1d1d", color: "#fecaca",
        padding: "8px 16px", fontSize: (12 + fsk) + "px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "8px", fontFamily: "var(--font-mono)",
        borderBottom: "1px solid #991b1b",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: (14 + fsk) + "px" }}>⚡</span>
          <span>
            <strong>Sin conexión</strong> — Los registros se guardan localmente
            {pendingCount > 0 && (
              <span style={{ marginLeft: "6px", background: "#991b1b", padding: "2px 6px", borderRadius: "10px" }}>
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
        <span style={{ fontSize: (10 + fsk) + "px", opacity: 0.8 }}>Se sincronizará al recuperar internet</span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#1e3a5f", color: "#93c5fd",
        padding: "8px 16px", fontSize: (12 + fsk) + "px",
        display: "flex", alignItems: "center", gap: "8px",
        fontFamily: "var(--font-mono)",
        borderBottom: "1px solid #1d4ed8",
      }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>↺</span>
        <span>Conexión restaurada · Sincronizando {pendingCount} registro(s) pendiente(s)…</span>
      </div>
    );
  }

  if (syncError) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#451a03", color: "#fed7aa",
        padding: "8px 16px", fontSize: (12 + fsk) + "px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "8px", fontFamily: "var(--font-mono)",
        borderBottom: "1px solid #7c2d12",
      }}>
        <span>⚠ Error al sincronizar — {pendingCount} registro(s) pendiente(s)</span>
        <button onClick={trySync} style={{
          background: "#7c2d12", border: "none", color: "#fed7aa",
          padding: "3px 10px", borderRadius: "4px", cursor: "pointer", fontSize: (11 + fsk) + "px",
        }}>
          Reintentar
        </button>
      </div>
    );
  }

  if (pendingCount > 0 && isOnline) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#422006", color: "#fde68a",
        padding: "6px 16px", fontSize: (11 + fsk) + "px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "8px", fontFamily: "var(--font-mono)",
        borderBottom: "1px solid #92400e",
      }}>
        <span>📋 {pendingCount} registro(s) pendiente(s) de sincronizar</span>
        <button onClick={trySync} style={{
          background: "#92400e", border: "none", color: "#fde68a",
          padding: "3px 10px", borderRadius: "4px", cursor: "pointer", fontSize: (11 + fsk) + "px",
        }}>
          Sincronizar ahora
        </button>
      </div>
    );
  }

  return null;
}
