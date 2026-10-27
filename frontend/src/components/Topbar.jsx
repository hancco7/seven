import { useStore, useToast } from "../store/useStore";
import { useOfflineSync } from "../hooks/useOfflineSync";

export default function Topbar() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { isOnline, syncing, pendingCount } = useOfflineSync((count) => {
    toast(`✓ ${count} registro(s) sincronizado(s)`, "success");
  });

  const { barberoActual, adminUser, isAdmin } = state;
  const currentUser = isAdmin ? adminUser?.nombre_corto : barberoActual?.nombre_corto;

  const handleLogout = () => {
    if (isAdmin) dispatch({ type: "LOGOUT_ADMIN" });
    else dispatch({ type: "CLEAR_BARBERO" });
  };

  // Banner offline/syncing (solo flujo barbero)
  const isBarberoFlow = ["barberSelect", "barberHome", "registro"].includes(state.screen);
  const showBanner = isBarberoFlow && (!isOnline || syncing);

  return (
    <>
      {showBanner && (
        <div className={syncing ? "topbar-syncing" : "topbar-offline"}>
          <span>{syncing ? "↺" : "⚡"}</span>
          <span>
            {syncing
              ? `Sincronizando ${pendingCount} registro(s) pendiente(s)…`
              : "Sin conexión · Guardado localmente — se sincronizará al recuperar internet"}
          </span>
          {!syncing && pendingCount > 0 && (
            <span style={{ marginLeft: "8px", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {currentUser && isAdmin && (
        <div style={{
          background: "var(--dark)", borderBottom: "1px solid var(--color-border)",
          padding: "8px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", fontSize: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", letterSpacing: "2px", color: "var(--orange)" }}>
              SE7EN
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--orange)", color: "#fff", borderRadius: "var(--radius-full)", padding: "3px 10px 3px 7px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700" }}>
                AD
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "1px" }}>
                ADMIN · {currentUser}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: isOnline ? "var(--green)" : "var(--red)", fontSize: "11px" }}>
              {isOnline ? "● En línea" : "● Sin conexión"}
            </span>
            <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: "var(--radius-sm)", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}>
              ← Salir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
