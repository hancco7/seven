import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import { useStore, useToast } from "../store/useStore";
import { useInactivity } from "../hooks/useInactivity";
import EgresoModal from "../components/EgresoModal";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

const fmt = (n) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 });
const fmtMonto = (n) => parseFloat(n || 0) > 0 ? fmt(n) : "—";

export default function HomeBarbero() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { barberoActual } = state;
  const now = useClock();
  const [data, setData] = useState(null);
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [egresoOpen, setEgresoOpen] = useState(false);

  const countdown = useInactivity(() => {
    dispatch({ type: "CLEAR_BARBERO" });
  });

  const cargar = useCallback(async () => {
    if (!barberoActual) return;
    try {
      const [pivotRes, egresosRes] = await Promise.all([
        api.get(`/api/ventas/pivot/${barberoActual.id}`),
        api.get(`/api/egresos/dia/${barberoActual.id}`),
      ]);
      setData(pivotRes.data);
      setEgresos(egresosRes.data?.egresos || []);
    } catch { toast("Error cargando datos del día", "error"); }
    finally { setLoading(false); }
  }, [barberoActual, toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const kpis            = data?.kpis || {};
  const ventas          = data?.ventas || [];
  const egresoTotal     = parseFloat(data?.egresosTotal || 0);
  const egresosCaja     = parseFloat(data?.egresosCaja || 0);
  const efectivoIngreso = parseFloat(data?.efectivoIngreso || 0);
  const totalPropinas   = parseFloat(kpis.total_propinas || 0);
  const totalVentas     = parseFloat(kpis.total_ventas || 0) - totalPropinas;
  const efectivoNeto    = efectivoIngreso - egresosCaja;
  const ventasServicios = parseFloat(kpis.ventas_servicios || 0);
  const ventasProductos = parseFloat(kpis.ventas_productos || 0);

  const fechaStr = now.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
  const horaStr  = now.toLocaleTimeString("es-PE");

  const thStyle = {
    padding: "7px 10px", background: "var(--dark)", color: "var(--gray)",
    fontSize: "15px", textTransform: "uppercase", letterSpacing: "1px",
    textAlign: "left", whiteSpace: "nowrap",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", padding: "16px" }}>
      {/* Banner inactividad */}
      {countdown !== null && (
        <div className="inactivity-banner">
          <span>⏱</span>
          <span>Sin actividad · El sistema cerrará la sesión en <strong>{countdown}</strong> segundos · Toca para continuar</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "var(--orange)", color: "#fff", borderRadius: "var(--radius-full)",
            padding: "5px 14px 5px 8px", marginBottom: "6px",
          }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize: "16px", fontWeight:700 }}>
              {barberoActual?.nombre_corto?.[0]}
            </div>
            <span style={{ fontSize: "18px", fontWeight:700, letterSpacing:"1px" }}>
              {barberoActual?.nombre_corto}
            </span>
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize: "16px", color:"var(--gray)" }}>
            {fechaStr} · {horaStr}
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button className="btn-primary" onClick={() => dispatch({ type: "GO", screen: "registro" })}>
            ＋ Nueva Venta
          </button>
          <button className="btn-secondary" onClick={() => setEgresoOpen(true)}>
            ▼ Registrar Egreso
          </button>
          <button className="btn-ghost" onClick={() => dispatch({ type: "CLEAR_BARBERO" })}>
            ← Cerrar
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="kpi-grid" style={{ marginBottom: "16px" }}>
          <div className="kpi-card">
            <div className="kpi-label">Registros</div>
            <div className="kpi-value neutral">{parseInt(kpis.num_registros) || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Ventas</div>
            <div className="kpi-value">{fmt(totalVentas)}</div>
            <div style={{ marginTop:"6px", paddingTop:"6px", borderTop:"1px solid var(--dark3)", display:"flex", flexDirection:"column", gap:"2px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", columnGap:"8px", fontSize: "15px" }}>
                <span style={{ color:"var(--gray)" }}>✂ Servicios</span>
                <span style={{ color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:600, whiteSpace:"nowrap", marginLeft:"auto" }}>{fmt(ventasServicios)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", columnGap:"8px", fontSize: "15px" }}>
                <span style={{ color:"var(--gray)" }}>🧴 Productos</span>
                <span style={{ color:"var(--blue)", fontFamily:"var(--font-mono)", fontWeight:600, whiteSpace:"nowrap", marginLeft:"auto" }}>{fmt(ventasProductos)}</span>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Propinas</div>
            <div className="kpi-value neutral">{fmt(totalPropinas)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Egresos</div>
            <div className="kpi-value egresos">{fmt(egresoTotal)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Efectivo Neto</div>
            <div className="kpi-value neto">{fmt(efectivoNeto)}</div>
          </div>
        </div>
      )}

      {/* Tabla pivot de ventas */}
      <div className="card" style={{ marginBottom: "12px" }}>
        <h3 style={{ fontSize: "16px", textTransform:"uppercase", letterSpacing:"2px", color:"var(--orange)", marginBottom:"12px" }}>
          Ventas del día
        </h3>
        {loading ? (
          <p style={{ color:"var(--gray)", textAlign:"center", padding:"20px" }}>Cargando…</p>
        ) : ventas.length === 0 ? (
          <p style={{ color:"var(--gray)", textAlign:"center", padding:"20px", fontSize: "17px" }}>Sin ventas registradas hoy</p>
        ) : (
          <div className="scroll-x">
            <table className="pivot-table pivot-table-xl">
              <thead>
                <tr>
                  <th>Registro</th>
                  <th>Servicio / Producto</th>
                  <th>Nro</th>
                  <th>Precio</th>
                  <th className="col-efectivo">Efectivo</th>
                  <th className="col-tarjeta">Tarjeta</th>
                  <th className="col-yape">Yape</th>
                  <th className="col-plin">Plin</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => {
                  const items = Array.isArray(v.items) ? v.items : [];
                  return items.map((item, idx) => (
                    <tr key={`${v.id}-${idx}`}>
                      {idx === 0 && (
                        <td rowSpan={items.length} style={{ fontSize: "15px", color:"var(--gray)", fontFamily:"var(--font-mono)" }}>
                          {v.hora?.slice(0,5)}{v.es_manual && <span style={{ color:"var(--orange)", fontSize: "14px", marginLeft:"4px" }}>MANUAL</span>}
                        </td>
                      )}
                      <td style={{ color:"var(--color-text)" }}>{item.nombre}</td>
                      <td>1</td>
                      <td style={{ color:"var(--orange)" }}>S/ {item.precio}</td>
                      {idx === 0 ? (
                        <>
                          <td className="col-efectivo">{fmtMonto(v.efectivo)}</td>
                          <td className="col-tarjeta">{fmtMonto(v.tarjeta)}</td>
                          <td className="col-yape">{fmtMonto(v.yape)}</td>
                          <td className="col-plin">{fmtMonto(v.plin)}</td>
                        </>
                      ) : (
                        <><td></td><td></td><td></td><td></td></>
                      )}
                    </tr>
                  ));
                })}
                {/* Total */}
                <tr className="total-row">
                  <td colSpan={2} style={{ fontFamily:"var(--font-display)", letterSpacing:"1px" }}>TOTAL VENTAS DÍA</td>
                  <td>{parseInt(kpis.num_registros) || 0}</td>
                  <td>{fmt(kpis.total_ventas)}</td>
                  <td className="col-efectivo">{fmt(ventas.reduce((a, v) => a + parseFloat(v.efectivo || 0), 0))}</td>
                  <td className="col-tarjeta">{fmt(ventas.reduce((a, v) => a + parseFloat(v.tarjeta || 0), 0))}</td>
                  <td className="col-yape">{fmt(ventas.reduce((a, v) => a + parseFloat(v.yape || 0), 0))}</td>
                  <td className="col-plin">{fmt(ventas.reduce((a, v) => a + parseFloat(v.plin || 0), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla de egresos del día */}
      <div className="card" style={{ marginBottom: "12px" }}>
        <h3 style={{ fontSize: "16px", textTransform:"uppercase", letterSpacing:"2px", color:"var(--red)", marginBottom:"12px" }}>
          Egresos del día {egresos.length > 0 && <span style={{ color:"var(--gray)", fontWeight:400 }}>({egresos.length})</span>}
        </h3>
        {loading ? (
          <p style={{ color:"var(--gray)", textAlign:"center", padding:"12px" }}>Cargando…</p>
        ) : egresos.length === 0 ? (
          <p style={{ color:"var(--gray)", textAlign:"center", padding:"12px", fontSize: "17px" }}>Sin egresos registrados hoy</p>
        ) : (
          <div className="scroll-x">
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize: "17px" }}>
              <thead>
                <tr>
                  {["Hora","Concepto","Asignado a","Notas","Monto"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                  <th style={{ ...thStyle, color:"var(--color-yape)", textAlign:"center" }}>Salió de Caja ✓</th>
                  <th style={{ ...thStyle, color:"var(--gray)", textAlign:"center" }}>Salió de Caja ✗</th>
                </tr>
              </thead>
              <tbody>
                {egresos.map((e) => (
                  <tr key={e.id} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
                    <td style={{ padding:"7px 10px", fontFamily:"var(--font-mono)", fontSize: "15px", color:"var(--gray)", whiteSpace:"nowrap" }}>
                      {e.hora?.slice(0,5)}
                    </td>
                    <td style={{ padding:"7px 10px", fontWeight:600 }}>{e.concepto}</td>
                    <td style={{ padding:"7px 10px", color:"var(--gray)", fontSize: "16px" }}>{e.asignado_nombre || "—"}</td>
                    <td style={{ padding:"7px 10px", color:"var(--gray)", fontSize: "16px" }}>{e.notas || "—"}</td>
                    <td style={{ padding:"7px 10px", color:"var(--red)", fontFamily:"var(--font-mono)", fontWeight:600 }}>
                      {fmt(e.monto)}
                    </td>
                    <td style={{ padding:"7px 10px", textAlign:"center", fontFamily:"var(--font-mono)", fontWeight:600, color:"var(--color-yape)" }}>
                      {e.salio_de_caja ? fmt(e.monto) : "—"}
                    </td>
                    <td style={{ padding:"7px 10px", textAlign:"center", fontFamily:"var(--font-mono)", fontWeight:600, color:"var(--gray)" }}>
                      {!e.salio_de_caja ? fmt(e.monto) : "—"}
                    </td>
                  </tr>
                ))}
                {/* Total */}
                <tr style={{ borderTop:"1.5px solid var(--red)" }}>
                  <td colSpan={4} style={{ padding:"7px 10px", fontFamily:"var(--font-display)", letterSpacing:"1px", fontSize: "16px" }}>
                    TOTAL EGRESOS DÍA
                  </td>
                  <td style={{ padding:"7px 10px", color:"var(--red)", fontFamily:"var(--font-mono)", fontWeight:700 }}>
                    {fmt(egresos.reduce((a, e) => a + parseFloat(e.monto || 0), 0))}
                  </td>
                  <td style={{ padding:"7px 10px", color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:700, textAlign:"center" }}>
                    {fmt(egresos.filter(e=>e.salio_de_caja).reduce((a,e)=>a+parseFloat(e.monto||0),0))}
                  </td>
                  <td style={{ padding:"7px 10px", color:"var(--gray)", fontFamily:"var(--font-mono)", fontWeight:700, textAlign:"center" }}>
                    {fmt(egresos.filter(e=>!e.salio_de_caja).reduce((a,e)=>a+parseFloat(e.monto||0),0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ display:"flex", gap:"16px", fontSize: "15px", color:"var(--gray)", flexWrap:"wrap" }}>
        {[["Efectivo","var(--color-efectivo)"],["Tarjeta","var(--color-tarjeta)"],["Yape","var(--color-yape)"],["Plin","var(--color-plin)"]].map(([l,c]) => (
          <span key={l} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
            <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:c, display:"inline-block" }}></span>
            {l}
          </span>
        ))}
      </div>

      {egresoOpen && (
        <EgresoModal
          onClose={() => setEgresoOpen(false)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}
