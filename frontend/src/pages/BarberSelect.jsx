import { useState, useEffect, useCallback, useRef } from "react";
import { api, getCacheItem, setCacheItem } from "../utils/api";
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

  const [error, setError] = useState(false);
  const montado = useRef(true);

  // Lista de barberos: primero la copia guardada (aparece al instante, incluso sin internet)
  // y luego la versión del servidor. Si la red falla (p. ej. el celular recién despierta
  // tras la inactividad), reintenta varias veces en lugar de dejar la pantalla vacía.
  const cargar = useCallback(async () => {
    setError(false);
    try {
      const guardados = await getCacheItem("barberos_activos");
      if (montado.current && guardados?.length) { setBarberos(guardados); setLoading(false); }
    } catch { /* sin caché: seguimos con la red */ }

    for (let intento = 0; intento < 4 && montado.current; intento++) {
      try {
        const r = await api.get("/api/barberos?activo=true");
        const lista = r.data?.data || [];
        if (!montado.current) return;
        setBarberos(lista);
        setLoading(false);
        setCacheItem("barberos_activos", lista, 30 * 24 * 60 * 60 * 1000).catch(() => {});
        return;
      } catch {
        await new Promise((ok) => setTimeout(ok, 1500 * (intento + 1)));
      }
    }
    if (montado.current) { setLoading(false); setError(true); }
  }, []);

  useEffect(() => {
    montado.current = true;
    cargar();
    // Reintentar al volver internet o al volver a primer plano la app
    const alVolver = () => { if (document.visibilityState === "visible") cargar(); };
    window.addEventListener("online", cargar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      montado.current = false;
      window.removeEventListener("online", cargar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

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
            fontFamily: "var(--font-display)", fontSize: "27px",
            letterSpacing: "4px", color: "var(--white)",
          }}>
            REGISTRO DE SERVICIOS Y VENTAS
          </h2>
          <p style={{ fontSize: "15px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginTop: "4px" }}>
            Selecciona tu nombre para ingresar
          </p>
        </div>

        {/* Reloj / Fecha */}
        <div style={{
          background: "var(--orange)", color: "#fff", borderRadius: "10px",
          padding: "10px 20px", textAlign: "center", minWidth: "130px",
        }}>
          <div style={{ fontSize: "15px", letterSpacing: "2px", textTransform: "uppercase", opacity: 0.8 }}>{dia}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "53px", lineHeight: 1, letterSpacing: "2px" }}>
            {numDia}
          </div>
          <div style={{ fontSize: "18px", fontWeight: "600", letterSpacing: "1px" }}>
            {mes} {anio}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "0 28px 28px" }}>
        {loading ? (
          <p style={{ color: "var(--gray)", padding: "40px", textAlign: "center" }}>Cargando barberos…</p>
        ) : barberos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--gray)" }}>
            <p style={{ marginBottom: "16px" }}>
              {error ? "No se pudo cargar la lista de barberos. Revisa la conexión." : "No hay barberos activos."}
            </p>
            <button className="btn-primary" onClick={() => { setLoading(true); cargar(); }}>↻ Reintentar</button>
            <div style={{ marginTop: "12px" }}>
              <button className="btn-ghost" onClick={() => dispatch({ type: "GO", screen: "landing" })}>← Inicio</button>
            </div>
          </div>
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
                  fontSize: "25px",
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
                color: "var(--gray)", fontSize: "17px", cursor: "pointer",
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
