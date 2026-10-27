import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useStore } from "../store/useStore";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function BarberSelect() {
  const { dispatch } = useStore();
  const now = useClock();
  const [barberos, setBarberos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/barberos?activo=true")
      .then((r) => setBarberos(r.data.data || []))
      .catch(() => setBarberos([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (b) => {
    dispatch({ type: "SET_BARBERO", payload: b });
  };

  const dia     = DIAS[now.getDay()];
  const numDia  = now.getDate().toString().padStart(2, "0");
  const mes     = MESES[now.getMonth()];
  const anio    = now.getFullYear();

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", padding: "0" }}>
      {/* Header */}
      <div style={{ padding: "28px 28px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "22px",
            letterSpacing: "4px", color: "var(--white)",
          }}>
            REGISTRO DE SERVICIOS Y VENTAS
          </h2>
          <p style={{ fontSize: "10px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginTop: "4px" }}>
            Selecciona tu nombre para ingresar
          </p>
        </div>

        {/* Reloj / Fecha */}
        <div style={{
          background: "var(--orange)", color: "#fff", borderRadius: "10px",
          padding: "10px 20px", textAlign: "center", minWidth: "130px",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", opacity: 0.8 }}>{dia}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "48px", lineHeight: 1, letterSpacing: "2px" }}>
            {numDia}
          </div>
          <div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "1px" }}>
            {mes} {anio}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "0 28px 28px" }}>
        {loading ? (
          <p style={{ color: "var(--gray)", padding: "40px", textAlign: "center" }}>Cargando barberos…</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "14px",
          }}>
            {barberos.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelect(b)}
                style={{
                  background: "var(--orange)",
                  border: "none",
                  borderRadius: "12px",
                  height: "90px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  letterSpacing: "2px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "filter .15s, transform .1s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "scale(1.03)"; }}
                onMouseOut={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {b.nombre_corto}
              </button>
            ))}

            {/* Volver al inicio */}
            <button
              onClick={() => dispatch({ type: "GO", screen: "landing" })}
              style={{
                background: "transparent",
                border: "1px solid var(--dark4)",
                borderRadius: "12px",
                height: "90px",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--gray)", fontSize: "12px", cursor: "pointer",
              }}
            >
              ← Inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
