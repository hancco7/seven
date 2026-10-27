import { useStore } from "../store/useStore";
import { useOnline } from "../hooks/useOnline";

export default function Landing() {
  const { dispatch } = useStore();
  const { isOnline, syncing } = useOnline();

  return (
    <div style={{
      minHeight: "100vh", background: "var(--black)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 28px", textAlign: "center",
    }}>
      {/* Banner online/offline */}
      {(!isOnline || syncing) && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, padding: "8px 16px",
          background: syncing ? "#14532d" : "#7c2d12",
          color: syncing ? "#86efac" : "#fed7aa",
          fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          zIndex: 50,
        }}>
          <span>{syncing ? "↺" : "⚡"}</span>
          <span>
            {syncing
              ? "✓ Conexión restaurada · Sincronizando registros pendientes..."
              : "⚠ Sin conexión · Trabajando offline · Los datos se guardan localmente"}
          </span>
        </div>
      )}

      {/* Logo */}
      <div style={{ marginBottom: "48px" }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(56px, 10vw, 96px)",
          letterSpacing: "6px",
          color: "var(--white)",
          lineHeight: 1,
        }}>
          SE<span style={{ color: "var(--orange)" }}>7</span>EN
        </h1>
        <p style={{
          fontSize: "11px", letterSpacing: "5px", color: "var(--gray)",
          textTransform: "uppercase", marginTop: "8px",
        }}>
          Barbershop Club · Sistema de Gestión
        </p>
      </div>

      {/* Botones de rol */}
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
        {/* Barbero */}
        <button
          onClick={() => dispatch({ type: "GO", screen: "barberSelect" })}
          style={{
            width: "170px", height: "120px", borderRadius: "14px",
            background: "var(--orange)", color: "#fff", border: "none",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "12px", cursor: "pointer",
            fontSize: "13px", fontWeight: "700", letterSpacing: "1.5px",
            textTransform: "uppercase", transition: "transform .15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          Barbero
        </button>

        {/* Admin */}
        <button
          onClick={() => dispatch({ type: "GO", screen: "adminLogin" })}
          style={{
            width: "170px", height: "120px", borderRadius: "14px",
            background: "transparent", color: "#fff",
            border: "2px solid #444",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "12px", cursor: "pointer",
            fontSize: "13px", fontWeight: "600", letterSpacing: "1.5px",
            textTransform: "uppercase", transition: "all .15s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.color = "var(--orange)"; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#fff"; }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Admin
        </button>
      </div>

      {/* Footer */}
      <p style={{ marginTop: "60px", fontSize: "10px", color: "#444", letterSpacing: "2px", textTransform: "uppercase" }}>
        v7.0 · 2026
      </p>
    </div>
  );
}
