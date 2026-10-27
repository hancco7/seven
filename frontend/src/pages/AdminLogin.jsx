import { useState } from "react";
import { api } from "../utils/api";
import { useStore, useToast } from "../store/useStore";

export default function AdminLogin() {
  const { dispatch } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) {
      setError("Ingresa usuario y contraseña");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/api/auth/login", form);
      dispatch({ type: "SET_ADMIN", payload: { token: r.data.token, user: r.data.user } });
      toast(`Bienvenido, ${r.data.user.nombre_corto}`, "success");
    } catch (err) {
      const msg = err.response?.data?.error || "Error de conexión";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--dark)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px",
    }}>
      {/* Logo */}
      <div style={{ fontFamily:"var(--font-display)", fontSize:"28px", letterSpacing:"4px", color:"var(--white)", marginBottom:"32px" }}>
        SE<span style={{ color:"var(--orange)" }}>7</span>EN
      </div>

      {/* Card */}
      <div style={{
        background: "var(--dark2)", border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "360px",
      }}>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:"22px", letterSpacing:"3px", color:"var(--white)", textAlign:"center", marginBottom:"24px" }}>
          ACCESO ADMINISTRADOR
        </h2>

        {error && (
          <div style={{ background:"#450a0a", color:"#fca5a5", border:"1px solid #dc262644", borderRadius:"6px", padding:"8px 12px", marginBottom:"16px", fontSize:"12px", textAlign:"center" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom:"14px" }}>
          <label style={{ fontSize:"10px", color:"var(--gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"5px" }}>
            Usuario
          </label>
          <input
            type="text"
            placeholder="Nombre corto o email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="username" style={{ textTransform:"uppercase" }}
          />
        </div>

        <div style={{ marginBottom:"20px" }}>
          <label style={{ fontSize:"10px", color:"var(--gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"5px" }}>
            Contraseña
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="current-password"
          />
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", padding: "12px" }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Verificando…" : "INGRESAR →"}
        </button>

        <p style={{ textAlign:"center", fontSize:"10px", color:"var(--gray)", marginTop:"16px" }}>
          Sesión válida por 8 horas · Protegido con JWT + bcrypt
        </p>

        <button
          onClick={() => dispatch({ type: "GO", screen: "landing" })}
          style={{ display:"block", margin:"12px auto 0", background:"none", border:"none", color:"var(--gray)", fontSize:"11px", cursor:"pointer" }}
        >
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
