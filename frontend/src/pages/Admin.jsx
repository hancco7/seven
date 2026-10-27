import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useStore, useToast } from "../store/useStore";
import { v4 as uuidv4 } from "uuid";
import { MultiPagoModal } from "../components/Modals";

// ── Sección Reportes ──────────────────────────────────────────────────────────
function SectionReportes() {
  const toast = useToast();
  // Usa fecha LOCAL (no UTC) para evitar desfase en Lima UTC-5
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };

  const [filtros, setFiltros] = useState({ desde: firstOfMonth(), hasta: today(), barbero_id: "" });
  const [barberos, setBarberos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState("resumen");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/api/barberos?activo=true").then((r) => setBarberos(r.data.data || [])).catch(() => {}); }, []);

  const buildQ = () => {
    const p = new URLSearchParams();
    if (filtros.desde) p.set("desde", filtros.desde);
    if (filtros.hasta) p.set("hasta", filtros.hasta);
    if (filtros.barbero_id) p.set("barbero_id", filtros.barbero_id);
    return p.toString();
  };

  const consultar = async () => {
    setLoading(true);
    try {
      const q = buildQ();
      const [res, det] = await Promise.all([
        api.get(`/api/reportes/resumen?${q}`),
        api.get(`/api/reportes/general?${q}`),
      ]);
      setResumen(res.data);
      setDetalle(det.data);
    } catch { toast("Error cargando reportes", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { consultar(); }, []); // eslint-disable-line

  const fmt = (n) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 });

  const exportarCSV = () => {
    if (!detalle?.ventas?.length) return;
    const headers = ["Fecha","Barbero","Ítem","Tipo","Precio","Efectivo","Tarjeta","Yape","Plin"];
    const rows = detalle.ventas.map((v) => [v.fecha?.slice(0,10),v.barbero,v.nombre_item,v.tipo,v.precio_cobrado,v.efectivo||0,v.tarjeta||0,v.yape||0,v.plin||0]);
    const csv = [headers,...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" }));
    a.download = `SE7EN_${filtros.desde}_${filtros.hasta}.csv`;
    a.click();
  };

  return (
    <div style={{ padding:"16px" }}>
      {/* Filtros */}
      <div className="card" style={{ marginBottom:"16px" }}>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"flex-end" }}>
          {[["Desde","desde","date"],["Hasta","hasta","date"]].map(([l,k,t])=>(
            <div key={k} className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">{l}</label>
              <input type={t} value={filtros[k]} max={today()} onChange={(e)=>setFiltros(f=>({...f,[k]:e.target.value}))} style={{ width:"140px" }} />
            </div>
          ))}
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Barbero</label>
            <select value={filtros.barbero_id} onChange={(e)=>setFiltros(f=>({...f,barbero_id:e.target.value}))} style={{ width:"160px" }}>
              <option value="">Todos los barberos</option>
              {barberos.map((b)=><option key={b.id} value={b.id}>{b.nombre_corto}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={consultar} disabled={loading}>
            {loading ? "Cargando…" : "🔍 Consultar"}
          </button>
          <button className="btn-secondary" onClick={exportarCSV}>📥 Exportar CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
        {["resumen","detallado"].map((t)=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"7px 20px", borderRadius:"var(--radius-full)", border:"1px solid", fontSize:"12px", fontWeight:600, cursor:"pointer", background:tab===t?"var(--orange)":"transparent", color:tab===t?"#fff":"var(--color-text-muted)", borderColor:tab===t?"var(--orange)":"var(--color-border)" }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── RESUMEN ─────────────────────────────────────────────────────────── */}
      {tab === "resumen" && resumen && (
        <>
          {/* KPIs globales */}
          <div className="kpi-grid" style={{ marginBottom:"16px" }}>
            <div className="kpi-card">
              <div className="kpi-label">Total Ventas</div>
              <div className="kpi-value">{fmt(resumen.totales?.ventas)}</div>
              <div style={{ marginTop:"6px", paddingTop:"6px", borderTop:"1px solid var(--dark3)", display:"flex", flexDirection:"column", gap:"2px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px" }}>
                  <span style={{ color:"var(--gray)" }}>✂ Servicios</span>
                  <span style={{ color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{fmt(resumen.totales?.ventas_servicios)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px" }}>
                  <span style={{ color:"var(--gray)" }}>🧴 Productos</span>
                  <span style={{ color:"var(--blue)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{fmt(resumen.totales?.ventas_productos)}</span>
                </div>
              </div>
            </div>
            <div className="kpi-card"><div className="kpi-label">Propinas</div><div className="kpi-value neutral">{fmt(resumen.totales?.propinas)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Egresos</div><div className="kpi-value egresos">{fmt(resumen.totales?.egresos)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Efectivo Neto</div><div className="kpi-value neto">{fmt(resumen.totales?.efectivo_neto)}</div></div>
          </div>

          {/* ① Por Método de Pago */}
          {resumen.por_metodo?.length > 0 && (
            <div className="card" style={{ marginBottom:"12px" }}>
              <h4 style={{ fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", color:"var(--orange)", marginBottom:"10px" }}>① Por Método de Pago</h4>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                <thead><tr>{["Método","Total cobrado","# Transacciones"].map((h)=><th key={h} style={{ padding:"6px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left" }}>{h}</th>)}</tr></thead>
                <tbody>{resumen.por_metodo.map((m)=>(
                  <tr key={m.metodo} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
                    <td style={{ padding:"7px 10px" }}><span className={`badge-${m.metodo?.toLowerCase()}`} style={{ fontWeight:600 }}>{m.metodo}</span></td>
                    <td style={{ padding:"7px 10px", fontFamily:"var(--font-mono)" }}>{fmt(m.total)}</td>
                    <td style={{ padding:"7px 10px", color:"var(--gray)" }}>{m.cantidad}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* ② Por Barbero */}
          {resumen.por_barbero?.length > 0 && (
            <div className="card" style={{ marginBottom:"12px" }}>
              <h4 style={{ fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", color:"var(--orange)", marginBottom:"10px" }}>② Por Barbero</h4>
              <div className="scroll-x">
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr>{["Barbero","# Reg","Vtas. Servicios","Vtas. Productos","Total Ventas","Propinas","Egresos"].map((h)=>(
                      <th key={h} style={{ padding:"6px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{resumen.por_barbero.map((b)=>(
                    <tr key={b.barbero_id} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
                      <td style={{ padding:"7px 10px", fontWeight:700 }}>{b.nombre}</td>
                      <td style={{ padding:"7px 10px", color:"var(--gray)", textAlign:"center" }}>{parseInt(b.num_registros)||0}</td>
                      <td style={{ padding:"7px 10px", color:"var(--color-yape)", fontFamily:"var(--font-mono)" }}>{fmt(b.ventas_servicios)}</td>
                      <td style={{ padding:"7px 10px", color:"var(--blue)", fontFamily:"var(--font-mono)" }}>{fmt(b.ventas_productos)}</td>
                      <td style={{ padding:"7px 10px", color:"var(--orange)", fontFamily:"var(--font-mono)", fontWeight:700 }}>{fmt(b.ventas)}</td>
                      <td style={{ padding:"7px 10px", color:"var(--gray)", fontFamily:"var(--font-mono)" }}>{fmt(b.propinas)}</td>
                      <td style={{ padding:"7px 10px", color:"var(--red)", fontFamily:"var(--font-mono)" }}>{fmt(b.egresos)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ③ Egresos por Concepto */}
          {resumen.egresos_por_concepto?.length > 0 && (
            <div className="card">
              <h4 style={{ fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", color:"var(--red)", marginBottom:"10px" }}>③ Egresos por Concepto</h4>
              <div className="scroll-x">
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr>
                      {["Concepto","Asignado a","Monto Total","Salió de Caja ✓","Salió de Caja ✗"].map((h)=>(
                        <th key={h} style={{ padding:"6px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.egresos_por_concepto.map((e,i)=>(
                      <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
                        <td style={{ padding:"7px 10px", fontWeight:600 }}>{e.concepto}</td>
                        <td style={{ padding:"7px 10px", color:"var(--gray)" }}>{e.asignado_nombre}</td>
                        <td style={{ padding:"7px 10px", color:"var(--red)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{fmt(e.total)}</td>
                        <td style={{ padding:"7px 10px", color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{fmt(e.monto_caja_si)}</td>
                        <td style={{ padding:"7px 10px", color:"var(--gray)", fontFamily:"var(--font-mono)" }}>{fmt(e.monto_caja_no)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop:"1.5px solid var(--red)" }}>
                      <td colSpan={2} style={{ padding:"7px 10px", fontFamily:"var(--font-display)", fontSize:"11px", letterSpacing:"1px" }}>TOTAL EGRESOS</td>
                      <td style={{ padding:"7px 10px", color:"var(--red)", fontFamily:"var(--font-mono)", fontWeight:700 }}>
                        {fmt(resumen.egresos_por_concepto.reduce((a,e)=>a+e.total,0))}
                      </td>
                      <td style={{ padding:"7px 10px", color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:700 }}>
                        {fmt(resumen.egresos_por_concepto.reduce((a,e)=>a+e.monto_caja_si,0))}
                      </td>
                      <td style={{ padding:"7px 10px", color:"var(--gray)", fontFamily:"var(--font-mono)", fontWeight:700 }}>
                        {fmt(resumen.egresos_por_concepto.reduce((a,e)=>a+e.monto_caja_no,0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── DETALLADO — estilo pivot como HomeBarbero ───────────────────────── */}
      {tab === "detallado" && detalle && (
        <>
          {/* Tabla ventas estilo pivot */}
          <div className="card" style={{ marginBottom:"12px" }}>
            <h4 style={{ fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", color:"var(--orange)", marginBottom:"10px" }}>
              ① Ventas — {detalle.ventas?.length || 0} registros
            </h4>
            {(detalle.ventas||[]).length === 0 ? (
              <p style={{ color:"var(--gray)", textAlign:"center", padding:"16px", fontSize:"12px" }}>Sin ventas en el período</p>
            ) : (
              <div className="scroll-x">
                <table className="pivot-table">
                  <thead>
                    <tr>
                      <th>Fecha · Hora</th>
                      <th>Barbero</th>
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
                    {(detalle.ventas||[]).map((v) => {
                      const items = Array.isArray(v.items) ? v.items : [];
                      const fechaHora = `${v.fecha?.slice(0,10)} ${v.hora?.slice(0,5)}`;
                      return items.map((item, idx) => (
                        <tr key={`${v.id}-${idx}`}>
                          {idx === 0 && (
                            <td rowSpan={items.length} style={{ fontSize:"10px", color:"var(--gray)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>
                              {fechaHora}{v.es_manual && <span style={{ color:"var(--orange)", fontSize:"9px", marginLeft:"4px" }}>MANUAL</span>}
                            </td>
                          )}
                          {idx === 0 && (
                            <td rowSpan={items.length} style={{ fontWeight:600, fontSize:"11px" }}>{v.barbero}</td>
                          )}
                          <td style={{ color:"var(--color-text)" }}>{item.nombre}</td>
                          <td>1</td>
                          <td style={{ color:"var(--orange)" }}>S/ {item.precio}</td>
                          {idx === 0 ? (
                            <>
                              <td className="col-efectivo">{parseFloat(v.efectivo)>0?fmt(v.efectivo):"—"}</td>
                              <td className="col-tarjeta">{parseFloat(v.tarjeta)>0?fmt(v.tarjeta):"—"}</td>
                              <td className="col-yape">{parseFloat(v.yape)>0?fmt(v.yape):"—"}</td>
                              <td className="col-plin">{parseFloat(v.plin)>0?fmt(v.plin):"—"}</td>
                            </>
                          ) : (
                            <><td></td><td></td><td></td><td></td></>
                          )}
                        </tr>
                      ));
                    })}
                    {/* Fila total */}
                    <tr className="total-row">
                      <td colSpan={3} style={{ fontFamily:"var(--font-display)", letterSpacing:"1px" }}>TOTAL</td>
                      <td>{detalle.ventas?.length || 0}</td>
                      <td>{fmt((detalle.ventas||[]).reduce((a,v)=>a+parseFloat(v.total||0),0))}</td>
                      <td className="col-efectivo">{fmt((detalle.ventas||[]).reduce((a,v)=>a+parseFloat(v.efectivo||0),0))}</td>
                      <td className="col-tarjeta">{fmt((detalle.ventas||[]).reduce((a,v)=>a+parseFloat(v.tarjeta||0),0))}</td>
                      <td className="col-yape">{fmt((detalle.ventas||[]).reduce((a,v)=>a+parseFloat(v.yape||0),0))}</td>
                      <td className="col-plin">{fmt((detalle.ventas||[]).reduce((a,v)=>a+parseFloat(v.plin||0),0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabla egresos detallados */}
          {(detalle.egresos||[]).length > 0 && (
            <div className="card">
              <h4 style={{ fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", color:"var(--red)", marginBottom:"10px" }}>
                ② Egresos — {detalle.egresos?.length || 0} registros
              </h4>
              <div className="scroll-x">
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr>
                      {["Fecha · Hora","Barbero","Concepto","Asignado a","Notas","Monto"].map(h=>(
                        <th key={h} style={{ padding:"6px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                      <th style={{ padding:"6px 10px", background:"var(--dark)", color:"var(--color-yape)", fontSize:"10px", textTransform:"uppercase", textAlign:"center", whiteSpace:"nowrap" }}>Salió de Caja ✓</th>
                      <th style={{ padding:"6px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"center", whiteSpace:"nowrap" }}>Salió de Caja ✗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detalle.egresos||[]).map((e,i)=>(
                      <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
                        <td style={{ padding:"6px 10px", fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--gray)", whiteSpace:"nowrap" }}>
                          {e.fecha?.slice(0,10)} {e.hora?.slice(0,5)}
                        </td>
                        <td style={{ padding:"6px 10px", fontWeight:600 }}>{e.barbero}</td>
                        <td style={{ padding:"6px 10px" }}>{e.concepto}</td>
                        <td style={{ padding:"6px 10px", color:"var(--gray)", fontSize:"11px" }}>{e.asignado_nombre||"—"}</td>
                        <td style={{ padding:"6px 10px", color:"var(--gray)", fontSize:"11px" }}>{e.notas||"—"}</td>
                        <td style={{ padding:"6px 10px", color:"var(--red)", fontFamily:"var(--font-mono)", fontWeight:600 }}>{fmt(e.monto)}</td>
                        <td style={{ padding:"6px 10px", color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:600, textAlign:"center" }}>
                          {e.salio_de_caja ? fmt(e.monto) : "—"}
                        </td>
                        <td style={{ padding:"6px 10px", color:"var(--gray)", fontFamily:"var(--font-mono)", fontWeight:600, textAlign:"center" }}>
                          {!e.salio_de_caja ? fmt(e.monto) : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop:"1.5px solid var(--red)" }}>
                      <td colSpan={5} style={{ padding:"7px 10px", fontFamily:"var(--font-display)", fontSize:"11px", letterSpacing:"1px" }}>TOTAL EGRESOS</td>
                      <td style={{ padding:"7px 10px", color:"var(--red)", fontFamily:"var(--font-mono)", fontWeight:700 }}>
                        {fmt((detalle.egresos||[]).reduce((a,e)=>a+parseFloat(e.monto||0),0))}
                      </td>
                      <td style={{ padding:"7px 10px", color:"var(--color-yape)", fontFamily:"var(--font-mono)", fontWeight:700, textAlign:"center" }}>
                        {fmt((detalle.egresos||[]).filter(e=>e.salio_de_caja).reduce((a,e)=>a+parseFloat(e.monto||0),0))}
                      </td>
                      <td style={{ padding:"7px 10px", color:"var(--gray)", fontFamily:"var(--font-mono)", fontWeight:700, textAlign:"center" }}>
                        {fmt((detalle.egresos||[]).filter(e=>!e.salio_de_caja).reduce((a,e)=>a+parseFloat(e.monto||0),0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sección Usuarios ─────────────────────────────────────────────────────────
function SectionBarberos() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const emptyForm = { tipo_documento:"DNI", nro_documento:"", nombres:"", apellidos:"", nombre_corto:"", es_barbero:true, es_admin:false, password:"" };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const cargar = () => api.get("/api/usuarios").then((r) => setUsuarios(r.data.data || [])).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    try {
      if (editando) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/api/usuarios/${editando}`, payload);
        toast("Usuario actualizado", "success");
      } else {
        await api.post("/api/usuarios", form);
        toast("Usuario creado", "success");
      }
      cargar(); setShowForm(false); setEditando(null); setForm(emptyForm);
    } catch (e) { toast(e.response?.data?.error || "Error guardando", "error"); }
  };

  const toggleActivo = async (u) => {
    try { await api.put(`/api/usuarios/${u.id}`, { activo: !u.activo }); cargar(); }
    catch { toast("Error actualizando", "error"); }
  };

  const thS = { padding:"8px 12px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" };

  return (
    <div style={{ padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <h3 style={{ fontFamily:"var(--font-display)", fontSize:"18px", letterSpacing:"2px", color:"var(--orange)" }}>USUARIOS & BARBEROS</h3>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm(emptyForm); }}>+ Nuevo usuario</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:"16px" }}>
          <h4 style={{ marginBottom:"12px", color:"var(--color-text-muted)", fontSize:"12px" }}>{editando ? "Editar" : "Nuevo"} usuario</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Tipo doc</label>
              <select value={form.tipo_documento} onChange={(e)=>set("tipo_documento",e.target.value)}><option>DNI</option><option>RUC</option></select>
            </div>
            {[["Nro. doc","nro_documento"],["Nombres","nombres"],["Apellidos","apellidos"],["Nombre corto (login)","nombre_corto"]].map(([l,k])=>(
              <div key={k} className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">{l}</label>
                <input value={form[k]} onChange={(e)=>set(k,e.target.value)} />
              </div>
            ))}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Contraseña {editando ? "(dejar vacío = sin cambio)" : form.es_admin ? "*" : "(opcional)"}</label>
              <input type="password" value={form.password} onChange={(e)=>set("password",e.target.value)} placeholder={editando?"••••••••":""} />
            </div>
          </div>
          <div style={{ display:"flex", gap:"20px", marginTop:"12px", padding:"10px 0", borderTop:"1px solid var(--color-border)" }}>
            <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", cursor:"pointer" }}>
              <input type="checkbox" checked={form.es_barbero} onChange={(e)=>set("es_barbero",e.target.checked)} />
              Es Barbero
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", cursor:"pointer" }}>
              <input type="checkbox" checked={form.es_admin} onChange={(e)=>set("es_admin",e.target.checked)} />
              Es Administrador
            </label>
          </div>
          {form.es_admin && (
            <p style={{ fontSize:"11px", color:"var(--orange)", marginTop:"6px" }}>
              ⚠ Los administradores ingresan con su Nombre Corto y contraseña.
            </p>
          )}
          <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
            <button className="btn-primary" onClick={guardar}>Guardar</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="scroll-x">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
          <thead><tr>{["Tipo Doc","Nro. Doc","Nombres","Apellidos","Nombre corto","Estado","Admin","Barbero","Acciones"].map((h)=>(
            <th key={h} style={thS}>{h}</th>
          ))}</tr></thead>
          <tbody>{usuarios.map((u)=>(
            <tr key={u.id} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
              <td style={{ padding:"8px 12px" }}>{u.tipo_documento}</td>
              <td style={{ padding:"8px 12px", fontFamily:"var(--font-mono)" }}>{u.nro_documento}</td>
              <td style={{ padding:"8px 12px" }}>{u.nombres}</td>
              <td style={{ padding:"8px 12px" }}>{u.apellidos}</td>
              <td style={{ padding:"8px 12px", fontWeight:600, color:"var(--orange)" }}>{u.nombre_corto}</td>
              <td style={{ padding:"8px 12px" }}><span style={{ color:u.activo?"var(--green)":"var(--red)", fontWeight:600, fontSize:"11px" }}>{u.activo?"Activo":"Inactivo"}</span></td>
              <td style={{ padding:"8px 12px", textAlign:"center", color:u.es_admin?"var(--orange)":"var(--gray)" }}>{u.es_admin?"✓":"—"}</td>
              <td style={{ padding:"8px 12px", textAlign:"center", color:u.es_barbero?"var(--color-yape)":"var(--gray)" }}>{u.es_barbero?"✓":"—"}</td>
              <td style={{ padding:"8px 12px" }}>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:"11px" }} onClick={() => {
                    setEditando(u.id);
                    setForm({ tipo_documento:u.tipo_documento, nro_documento:u.nro_documento, nombres:u.nombres, apellidos:u.apellidos, nombre_corto:u.nombre_corto, es_barbero:u.es_barbero, es_admin:u.es_admin, password:"" });
                    setShowForm(true);
                  }}>✏️ Editar</button>
                  <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:"11px", color:u.activo?"var(--red)":"var(--green)" }} onClick={() => toggleActivo(u)}>
                    {u.activo?"Desactivar":"Activar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sección Catálogo genérico ─────────────────────────────────────────────────
function SectionCatalogo({ tipo }) {
  const toast = useToast();
  const endpoint = tipo === "servicios" ? "/api/catalogo/servicios" : "/api/catalogo/productos";
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ categoria:"", subcategoria:"", nombre:"", precio:"", precio_venta:"", es_favorito: false });
  const [editando, setEditando] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const cargar = () => api.get(endpoint).then((r) => setItems(r.data.data || [])).catch(() => {});
  useEffect(() => { cargar(); }, [tipo]);

  const guardar = async () => {
    try {
      const payload = tipo === "servicios"
        ? { categoria:form.categoria, subcategoria:form.subcategoria, nombre:form.nombre, precio:parseFloat(form.precio), es_favorito:form.es_favorito }
        : { categoria:form.categoria, subcategoria:form.subcategoria, nombre:form.nombre, precio_venta:parseFloat(form.precio_venta), es_favorito:form.es_favorito };
      if (editando) await api.put(`${endpoint}/${editando}`, payload);
      else await api.post(endpoint, payload);
      toast("Guardado ✓", "success"); cargar(); setShowForm(false); setEditando(null);
    } catch (e) { toast(e.response?.data?.error || "Error", "error"); }
  };

  const toggleActivo = async (item) => {
    try { await api.put(`${endpoint}/${item.id}`, { activo: !item.activo }); cargar(); }
    catch { toast("Error", "error"); }
  };

  const precioKey = tipo === "servicios" ? "precio" : "precio_venta";

  return (
    <div style={{ padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <h3 style={{ fontFamily:"var(--font-display)", fontSize:"18px", letterSpacing:"2px", color:"var(--orange)" }}>
          MAESTRO {tipo.toUpperCase()}
        </h3>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm({ categoria:"", subcategoria:"", nombre:"", precio:"", precio_venta:"", es_favorito:false }); }}>+ Nuevo</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:"16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
            {[["Categoría","categoria"],["Subcategoría","subcategoria"],["Nombre","nombre"]].map(([l,k])=>(
              <div key={k} className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">{l}</label>
                <input value={form[k]} onChange={(e)=>setForm(f=>({...f,[k]:e.target.value}))} />
              </div>
            ))}
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Precio (S/)</label>
              <input type="number" value={form[precioKey]} onChange={(e)=>setForm(f=>({...f,[precioKey]:e.target.value}))} />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">¿Favorito?</label>
              <label style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"8px" }}>
                <input type="checkbox" checked={form.es_favorito} onChange={(e)=>setForm(f=>({...f,es_favorito:e.target.checked}))} style={{ width:"auto", accentColor:"var(--orange)" }} />
                <span style={{ fontSize:"12px" }}>Mostrar en favoritos</span>
              </label>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
            <button className="btn-primary" onClick={guardar}>Guardar</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="scroll-x">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
          <thead><tr>{["Categoría","Subcategoría","Nombre","Precio","Favorito","Estado","Acciones"].map((h)=>(
            <th key={h} style={{ padding:"7px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
          ))}</tr></thead>
          <tbody>{items.map((item)=>(
            <tr key={item.id} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
              <td style={{ padding:"7px 10px" }}>{item.categoria}</td>
              <td style={{ padding:"7px 10px" }}>{item.subcategoria}</td>
              <td style={{ padding:"7px 10px", fontWeight:500 }}>{item.nombre}</td>
              <td style={{ padding:"7px 10px", color:"var(--orange)", fontFamily:"var(--font-mono)" }}>S/ {item[precioKey]}</td>
              <td style={{ padding:"7px 10px", textAlign:"center" }}>{item.es_favorito?"⭐":"—"}</td>
              <td style={{ padding:"7px 10px" }}><span style={{ color: item.activo?"var(--green)":"var(--gray)", fontSize:"11px", fontWeight:600 }}>{item.activo?"Activo":"Inactivo"}</span></td>
              <td style={{ padding:"7px 10px" }}>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button className="btn-ghost" style={{ padding:"3px 8px", fontSize:"11px" }} onClick={() => { setEditando(item.id); setForm({ categoria:item.categoria, subcategoria:item.subcategoria, nombre:item.nombre, [precioKey]:item[precioKey], es_favorito:item.es_favorito }); setShowForm(true); }}>✏️</button>
                  <button className="btn-ghost" style={{ padding:"3px 8px", fontSize:"11px", color:item.activo?"var(--red)":"var(--green)" }} onClick={() => toggleActivo(item)}>{item.activo?"↓ Desact.":"↑ Activar"}</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sección Clientes ──────────────────────────────────────────────────────────
function SectionClientes() {
  const [q, setQ] = useState("");
  const [clientes, setClientes] = useState([]);
  const buscar = () => api.get(`/api/clientes?q=${encodeURIComponent(q)}`).then((r) => setClientes(r.data.data || [])).catch(() => {});
  return (
    <div style={{ padding:"16px" }}>
      <h3 style={{ fontFamily:"var(--font-display)", fontSize:"18px", letterSpacing:"2px", color:"var(--orange)", marginBottom:"16px" }}>MAESTRO CLIENTES</h3>
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
        <input placeholder="Buscar por nombre o documento…" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&buscar()} style={{ maxWidth:"360px" }} />
        <button className="btn-primary" onClick={buscar}>Buscar</button>
      </div>
      <div className="scroll-x">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
          <thead><tr>{["Tipo Doc","Nro. Doc","Nombres","Apellidos","Celular"].map((h)=>(
            <th key={h} style={{ padding:"7px 10px", background:"var(--dark)", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
          ))}</tr></thead>
          <tbody>{clientes.filter((c)=>!c.es_generico).map((c)=>(
            <tr key={c.id} style={{ borderBottom:"0.5px solid var(--color-border)" }}>
              <td style={{ padding:"7px 10px" }}>{c.tipo_documento}</td>
              <td style={{ padding:"7px 10px", fontFamily:"var(--font-mono)" }}>{c.nro_documento}</td>
              <td style={{ padding:"7px 10px", fontWeight:500 }}>{c.nombres}</td>
              <td style={{ padding:"7px 10px" }}>{c.apellidos}</td>
              <td style={{ padding:"7px 10px", color:"var(--gray)" }}>{c.nro_celular||"—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sección Registro Manual ───────────────────────────────────────────────────
function SectionRegistroManual() {
  const { state } = useStore();
  const toast = useToast();
  const [barberos, setBarberos] = useState([]);
  const [svcFav, setSvcFav] = useState([]);
  const [prodFav, setProdFav] = useState([]);
  const [clienteGenerico, setClienteGenerico] = useState(null);
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const [form, setForm] = useState({ barbero_id:"", fecha: todayStr(), hora:"" });
  const [items, setItems] = useState([]);
  const [metodo, setMetodo] = useState(null);       // EFECTIVO/YAPE/PLIN/TARJETA o "MULTIPLE"
  const [showMulti, setShowMulti] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/barberos?activo=true"),
      api.get("/api/catalogo/servicios?favoritos=true"),
      api.get("/api/catalogo/productos?favoritos=true"),
      api.get("/api/clientes/generico"),
    ]).then(([b,s,p,g]) => {
      setBarberos(b.data.data||[]);
      setSvcFav(s.data.data?.slice(0,4)||[]);
      setProdFav(p.data.data?.slice(0,4)||[]);
      setClienteGenerico(g.data);
    }).catch(()=>{});
  }, []);

  const agregarItem = (item, tipo) => setItems((prev) => [...prev, { key:uuidv4(), tipo, item_id:item.id, nombre_item:item.nombre, precio_cobrado: tipo==="S"?item.precio:item.precio_venta, precio_original: tipo==="S"?item.precio:item.precio_venta }]);
  const eliminar = (key) => setItems((prev) => prev.filter((i)=>i.key!==key));
  const editarPrecio = (key, val) => setItems((prev) => prev.map((i)=>i.key===key?{...i,precio_cobrado:val}:i));

  const total = items.reduce((acc,i)=>acc+parseFloat(i.precio_cobrado||0),0);

  const puedeRegistrar = form.barbero_id && form.fecha && items.length > 0 && metodo !== null;

  const registrar = async (pagosFinales) => {
    setSaving(true);
    try {
      await api.post("/api/ventas", {
        barbero_id: parseInt(form.barbero_id),
        cliente_id: clienteGenerico?.id,
        registrado_por: state.adminUser?.id,
        es_manual: true,
        fecha: form.fecha,
        hora: form.hora || null,
        total,
        offline_id: uuidv4(),
        items: items.map(({tipo,item_id,nombre_item,precio_cobrado,precio_original})=>({tipo,item_id,nombre_item,precio_cobrado:parseFloat(precio_cobrado),precio_original})),
        pagos: pagosFinales,
      });
      toast("Venta registrada manualmente ✓", "success");
      setItems([]); setMetodo(null);
    } catch (e) { toast(e.response?.data?.error || "Error", "error"); }
    finally { setSaving(false); }
  };

  const handleRegistrar = () => {
    if (metodo === "MULTIPLE") {
      setShowMulti(true);
    } else {
      registrar([{ metodo, monto: total }]);
    }
  };

  const METODOS = ["EFECTIVO","YAPE","PLIN","TARJETA"];
  const btnBarb = (b) => ({
    padding:"7px 12px", borderRadius:"var(--radius-full)", fontSize:"11px", fontWeight:700,
    cursor:"pointer", border:"1.5px solid",
    background: form.barbero_id===String(b.id) ? "var(--orange)" : "var(--dark2)",
    color:       form.barbero_id===String(b.id) ? "#fff"           : "var(--gray)",
    borderColor: form.barbero_id===String(b.id) ? "var(--orange)"  : "var(--dark3)",
    letterSpacing:"1px",
  });

  return (
    <div style={{ padding:"16px" }}>
      <h3 style={{ fontFamily:"var(--font-display)", fontSize:"18px", letterSpacing:"2px", color:"var(--orange)", marginBottom:"16px" }}>REGISTRO MANUAL DE VENTA</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:"16px", minHeight:"500px" }}>
        {/* Izq */}
        <div>
          {/* Barbero — botones */}
          <div className="form-group">
            <label className="form-label">Barbero que realizó la venta</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:"4px" }}>
              {barberos.map((b)=>(
                <button key={b.id} onClick={()=>setForm(f=>({...f,barbero_id:String(b.id)}))} style={btnBarb(b)}>
                  {b.nombre_corto}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de la venta</label>
            <input type="date" value={form.fecha} max={todayStr()} onChange={(e)=>setForm(f=>({...f,fecha:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Hora aproximada (opcional)</label>
            <input type="time" value={form.hora} onChange={(e)=>setForm(f=>({...f,hora:e.target.value}))} />
          </div>

          <div style={{ fontSize:"9px",color:"var(--gray)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px" }}>Servicios favoritos</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px" }}>
            {svcFav.map((s)=>(
              <button key={s.id} onClick={()=>agregarItem(s,"S")} style={{ background:"var(--dark2)",border:"1px solid var(--dark3)",borderRadius:"7px",padding:"8px",cursor:"pointer",textAlign:"left" }}>
                <div style={{ fontSize:"10px",color:"var(--white)",fontWeight:500 }}>{s.nombre}</div>
                <div style={{ fontSize:"11px",color:"var(--orange)",fontWeight:600 }}>S/ {s.precio}</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize:"9px",color:"var(--gray)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px" }}>Productos favoritos</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"12px" }}>
            {prodFav.map((p)=>(
              <button key={p.id} onClick={()=>agregarItem(p,"P")} style={{ background:"var(--dark2)",border:"1px solid var(--dark3)",borderRadius:"7px",padding:"7px",cursor:"pointer",textAlign:"left" }}>
                <div style={{ fontSize:"10px",color:"var(--white)" }}>{p.nombre}</div>
                <div style={{ fontSize:"11px",color:"var(--orange)" }}>S/ {p.precio_venta}</div>
              </button>
            ))}
          </div>

          {/* Forma de pago */}
          <div style={{ fontSize:"9px",color:"var(--gray)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"5px" }}>Forma de pago</div>
          <div style={{ display:"flex",gap:"5px",flexWrap:"wrap" }}>
            {METODOS.map((m)=>(
              <button key={m} onClick={()=>setMetodo(m)} style={{ flex:1,minWidth:"60px",padding:"6px",borderRadius:"5px",fontSize:"9px",fontWeight:600,cursor:"pointer",border:"1.5px solid", background:metodo===m?"var(--orange)":"var(--dark2)", color:metodo===m?"#fff":"var(--gray)", borderColor:metodo===m?"var(--orange)":"var(--dark3)" }}>{m}</button>
            ))}
            <button onClick={()=>setMetodo("MULTIPLE")} style={{ flex:1,minWidth:"70px",padding:"6px",borderRadius:"5px",fontSize:"9px",fontWeight:600,cursor:"pointer",border:"1.5px dashed", background:metodo==="MULTIPLE"?"var(--orange-dim)":"transparent", color:metodo==="MULTIPLE"?"var(--orange)":"var(--gray)", borderColor:metodo==="MULTIPLE"?"var(--orange)":"var(--dark3)" }}>MÚLTIPLE ✦</button>
          </div>
        </div>

        {/* Der */}
        <div style={{ display:"flex",flexDirection:"column" }}>
          <div style={{ background:"var(--dark3)",borderRadius:"8px",padding:"10px 12px",marginBottom:"12px",fontSize:"11px",color:"var(--gray)" }}>
            ℹ️ Esta venta quedará registrada como <strong style={{ color:"var(--orange)" }}>Ingreso manual</strong> en los reportes, identificada con el administrador que la creó.
          </div>
          <div style={{ flex:1,overflowY:"auto" }}>
            {items.map((item)=>(
              <div key={item.key} style={{ display:"grid",gridTemplateColumns:"1fr 60px 30px 20px",gap:"4px",padding:"6px 0",borderBottom:"0.5px solid var(--color-border)",alignItems:"center" }}>
                <span style={{ fontSize:"11px",color:"var(--white)" }}>{item.nombre_item}</span>
                <input type="number" value={item.precio_cobrado} onChange={(e)=>editarPrecio(item.key,e.target.value)} style={{ padding:"3px 5px",fontSize:"11px",color:"var(--orange)",fontFamily:"var(--font-mono)",background:"var(--dark3)",border:"1px solid var(--orange)",borderRadius:"4px",width:"60px" }} />
                <span className={`tag-${item.tipo.toLowerCase()}`}>{item.tipo}</span>
                <button onClick={()=>eliminar(item.key)} style={{ background:"var(--dark3)",border:"none",borderRadius:"3px",color:"var(--gray)",fontSize:"10px",cursor:"pointer" }}>×</button>
              </div>
            ))}
            {items.length===0 && <p style={{ color:"var(--gray)",textAlign:"center",padding:"30px",fontSize:"12px" }}>Selecciona servicios o productos</p>}
          </div>
          <div style={{ borderTop:"2px solid var(--orange)",padding:"10px 0 6px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:"12px",color:"var(--gray)",fontWeight:600 }}>TOTAL</span>
            <span style={{ fontFamily:"var(--font-display)",fontSize:"28px",color:"var(--orange)" }}>S/ {total.toFixed(2)}</span>
          </div>
          <button className="btn-primary" disabled={!puedeRegistrar||saving} onClick={handleRegistrar} style={{ width:"100%",padding:"12px" }}>
            {saving?"Registrando…":"Registrar Venta"}
          </button>
        </div>
      </div>

      {showMulti && (
        <MultiPagoModal
          total={total}
          onClose={() => setShowMulti(false)}
          onConfirmar={(pagos) => { registrar(pagos); setShowMulti(false); }}
        />
      )}
    </div>
  );
}

// ── Admin Panel Principal ─────────────────────────────────────────────────────
const SECCIONES = [
  { id:"reportes",  label:"Reportes",         icon:"📊" },
  { id:"barberos",  label:"Usuarios / Barberos", icon:"👤" },
  { id:"servicios", label:"Maestro Servicios", icon:"✂️" },
  { id:"productos", label:"Maestro Productos", icon:"🧴" },
  { id:"clientes",  label:"Maestro Clientes",  icon:"🗂️" },
  { id:"manual",    label:"Registro Manual",   icon:"📝" },
];

export default function Admin() {
  const { state, dispatch } = useStore();
  const [seccion, setSeccion] = useState("reportes");

  return (
    <div style={{ minHeight:"100vh", background:"var(--black)", display:"grid", gridTemplateColumns:"220px 1fr" }}>
      {/* Sidebar */}
      <div style={{ background:"var(--dark)", borderRight:"1px solid var(--color-border)", padding:"20px 0" }}>
        <div style={{ padding:"0 16px 20px", borderBottom:"1px solid var(--color-border)" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"20px", letterSpacing:"3px", color:"var(--orange)" }}>SE7EN</div>
          <div style={{ fontSize:"11px", color:"var(--gray)", marginTop:"2px" }}>
            {state.adminUser?.nombre_corto} · Admin
          </div>
        </div>

        <nav style={{ padding:"12px 8px" }}>
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              style={{
                display:"flex", alignItems:"center", gap:"10px", width:"100%",
                padding:"9px 12px", borderRadius:"var(--radius-md)", border:"none",
                marginBottom:"2px", cursor:"pointer", fontSize:"13px", textAlign:"left",
                background: seccion===s.id ? "var(--orange-dim)" : "transparent",
                color:      seccion===s.id ? "var(--orange)" : "var(--color-text-muted)",
                fontWeight: seccion===s.id ? 600 : 400,
                borderLeft: seccion===s.id ? "3px solid var(--orange)" : "3px solid transparent",
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding:"12px 16px", borderTop:"1px solid var(--color-border)", marginTop:"auto" }}>
          <button className="btn-ghost" style={{ width:"100%", fontSize:"12px" }}
            onClick={() => dispatch({ type:"LOGOUT_ADMIN" })}>
            ← Cerrar sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ overflowY:"auto", maxHeight:"100vh" }}>
        {seccion === "reportes"  && <SectionReportes />}
        {seccion === "barberos"  && <SectionBarberos />}
        {seccion === "servicios" && <SectionCatalogo tipo="servicios" />}
        {seccion === "productos" && <SectionCatalogo tipo="productos" />}
        {seccion === "clientes"  && <SectionClientes />}
        {seccion === "manual"    && <SectionRegistroManual />}
      </div>
    </div>
  );
}
