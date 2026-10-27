import { useState, useEffect } from "react";
import Modal, { FormField } from "./Modal";
import { api } from "../utils/api";

// ── OtrosSvcModal ─────────────────────────────────────────────────────────────
export function OtrosSvcModal({ onClose, onAgregar }) {
  const [categorias, setCategorias] = useState({});
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [resultados, setResultados] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/catalogo/servicios/categorias").then((r) => setCategorias(r.data)).catch(() => {});
  }, []);

  useEffect(() => { setSub(""); setResultados([]); setSelected(null); }, [cat]);
  useEffect(() => { setSelected(null); }, [sub]);

  const buscar = async () => {
    if (!cat) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ activo: "true" });
      if (cat) params.set("categoria", cat);
      if (sub) params.set("subcategoria", sub);
      const r = await api.get(`/api/catalogo/servicios?${params}`);
      setResultados(r.data.data || []);
    } catch {
      setResultados([]);
    } finally { setLoading(false); }
  };

  const subs = cat ? (categorias[cat] || []) : [];

  return (
    <Modal
      title="Otros Servicios"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!selected}
            onClick={() => { onAgregar(selected); onClose(); }}
          >
            Agregar seleccionado
          </button>
        </>
      }
    >
      {cat && (
        <div className="filter-chain" style={{
          display:"flex", alignItems:"center", gap:"6px",
          background:"var(--orange-dim)", border:"1px solid var(--orange-border)",
          borderRadius:"6px", padding:"6px 12px", marginBottom:"12px", fontSize:"11px",
          color:"var(--color-text-muted)"
        }}>
          <span style={{ color:"var(--orange)", fontWeight:600 }}>Categoría</span>
          <span>→</span>
          <span style={{ background:"var(--orange)", color:"#fff", padding:"2px 8px", borderRadius:"4px", fontSize:"10px", fontWeight:600 }}>{cat}</span>
          {sub && <><span>→</span><span style={{ background:"var(--orange)", color:"#fff", padding:"2px 8px", borderRadius:"4px", fontSize:"10px", fontWeight:600 }}>{sub}</span></>}
        </div>
      )}

      <div style={{ display:"flex", gap:"8px", marginBottom:"10px", flexWrap:"wrap" }}>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ flex:1, minWidth:"130px" }}>
          <option value="">Categoría</option>
          {Object.keys(categorias).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sub} onChange={(e) => setSub(e.target.value)} style={{ flex:1, minWidth:"130px" }} disabled={!cat}>
          <option value="">— Todas —</option>
          {subs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={buscar} disabled={!cat || loading} style={{ whiteSpace:"nowrap" }}>
          {loading ? "…" : "🔍 Buscar"}
        </button>
      </div>

      <div style={{ maxHeight:"280px", overflowY:"auto" }}>
        {resultados.length > 0 && (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
            <thead>
              <tr style={{ background:"var(--dark)" }}>
                <th style={{ padding:"6px 10px", textAlign:"left", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase" }}>Categoría</th>
                <th style={{ padding:"6px 10px", textAlign:"left", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase" }}>Subcategoría</th>
                <th style={{ padding:"6px 10px", textAlign:"left", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase" }}>Servicio</th>
                <th style={{ padding:"6px 10px", textAlign:"right", color:"var(--gray)", fontSize:"10px", textTransform:"uppercase" }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={{
                    cursor:"pointer",
                    background: selected?.id === s.id ? "var(--orange-dim)" : "transparent",
                    borderBottom:"0.5px solid var(--color-border)"
                  }}
                >
                  <td style={{ padding:"7px 10px", color:"var(--color-text-dim)" }}>{s.categoria}</td>
                  <td style={{ padding:"7px 10px", color:"var(--color-text-dim)" }}>{s.subcategoria}</td>
                  <td style={{ padding:"7px 10px", color:"var(--color-text)" }}>{s.nombre}</td>
                  <td style={{ padding:"7px 10px", color:"var(--orange)", fontWeight:600, textAlign:"right" }}>S/ {s.precio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {resultados.length === 0 && cat && !loading && (
          <p style={{ textAlign:"center", color:"var(--gray)", padding:"20px", fontSize:"12px" }}>
            Sin resultados — presiona Buscar
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── OtrosProdModal ────────────────────────────────────────────────────────────
export function OtrosProdModal({ onClose, onAgregar }) {
  const [categorias, setCategorias] = useState({});
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [resultados, setResultados] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/catalogo/productos/categorias").then((r) => setCategorias(r.data)).catch(() => {});
  }, []);

  useEffect(() => { setSub(""); setResultados([]); setSelected(null); }, [cat]);

  const buscar = async () => {
    if (!cat) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ activo: "true" });
      if (cat) params.set("categoria", cat);
      if (sub) params.set("subcategoria", sub);
      const r = await api.get(`/api/catalogo/productos?${params}`);
      setResultados(r.data.data || []);
    } catch { setResultados([]); } finally { setLoading(false); }
  };

  const subs = cat ? (categorias[cat] || []) : [];

  return (
    <Modal title="Otros Productos" onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!selected} onClick={() => { onAgregar(selected); onClose(); }}>
            Agregar seleccionado
          </button>
        </>
      }
    >
      <div style={{ display:"flex", gap:"8px", marginBottom:"10px", flexWrap:"wrap" }}>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ flex:1, minWidth:"130px" }}>
          <option value="">Categoría</option>
          {Object.keys(categorias).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sub} onChange={(e) => setSub(e.target.value)} style={{ flex:1, minWidth:"130px" }} disabled={!cat}>
          <option value="">— Todas —</option>
          {subs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={buscar} disabled={!cat || loading} style={{ whiteSpace:"nowrap" }}>
          {loading ? "…" : "🔍 Buscar"}
        </button>
      </div>
      <div style={{ maxHeight:"280px", overflowY:"auto" }}>
        {resultados.map((p) => (
          <div key={p.id} onClick={() => setSelected(p)} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"8px 10px", cursor:"pointer", borderBottom:"0.5px solid var(--color-border)",
            background: selected?.id === p.id ? "var(--orange-dim)" : "transparent",
          }}>
            <div>
              <div style={{ fontSize:"12px", color:"var(--color-text)" }}>{p.nombre}</div>
              <div style={{ fontSize:"10px", color:"var(--gray)" }}>{p.categoria} · {p.subcategoria}</div>
            </div>
            <span style={{ color:"var(--orange)", fontWeight:600, fontFamily:"var(--font-mono)", fontSize:"13px" }}>
              S/ {p.precio_venta}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── MultiPagoModal ────────────────────────────────────────────────────────────
export function MultiPagoModal({ total, onClose, onConfirmar }) {
  const METODOS = [
    { key: "EFECTIVO", label: "Efectivo", color: "var(--color-efectivo)" },
    { key: "TARJETA",  label: "Tarjeta",  color: "var(--color-tarjeta)" },
    { key: "YAPE",     label: "Yape",     color: "var(--color-yape)" },
    { key: "PLIN",     label: "Plin",     color: "var(--color-plin)" },
  ];

  const [checks, setChecks] = useState({ EFECTIVO: false, TARJETA: false, YAPE: false, PLIN: false });
  const [montos, setMontos] = useState({ EFECTIVO: "", TARJETA: "", YAPE: "", PLIN: "" });

  const suma = METODOS.reduce((acc, m) => checks[m.key] ? acc + (parseFloat(montos[m.key]) || 0) : acc, 0);
  const diff = parseFloat((total - suma).toFixed(2));
  const valido = diff === 0 && Object.values(checks).some(Boolean);

  const toggleCheck = (k) => setChecks((c) => ({ ...c, [k]: !c[k] }));
  const setMonto = (k, v) => setMontos((m) => ({ ...m, [k]: v }));

  const handleConfirmar = () => {
    const pagos = METODOS
      .filter((m) => checks[m.key] && parseFloat(montos[m.key]) > 0)
      .map((m) => ({ metodo: m.key, monto: parseFloat(montos[m.key]) }));
    onConfirmar(pagos);
    onClose();
  };

  return (
    <Modal
      title="Pago Múltiple"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valido} onClick={handleConfirmar}>
            Confirmar pago
          </button>
        </>
      }
    >
      <div style={{ marginBottom:"16px", padding:"10px 14px", background:"var(--dark3)", borderRadius:"8px" }}>
        <span style={{ fontSize:"12px", color:"var(--gray)" }}>Total del pedido: </span>
        <span style={{ fontFamily:"var(--font-mono)", color:"var(--orange)", fontWeight:700, fontSize:"16px" }}>
          S/ {total.toFixed(2)}
        </span>
      </div>

      {METODOS.map((m) => (
        <div key={m.key} style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
          <div
            onClick={() => toggleCheck(m.key)}
            style={{
              width:"20px", height:"20px", border:`1.5px solid ${checks[m.key] ? m.color : "var(--color-border)"}`,
              borderRadius:"4px", display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", background: checks[m.key] ? m.color : "transparent", flexShrink:0,
            }}
          >
            {checks[m.key] && <span style={{ color:"#fff", fontSize:"12px", fontWeight:700 }}>✓</span>}
          </div>
          <span style={{ width:"80px", fontSize:"13px", color: checks[m.key] ? m.color : "var(--color-text-muted)", fontWeight: checks[m.key] ? 600 : 400 }}>
            {m.label}
          </span>
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="0.00"
            value={montos[m.key]}
            disabled={!checks[m.key]}
            onChange={(e) => setMonto(m.key, e.target.value)}
            style={{
              width:"100px", textAlign:"right",
              fontFamily:"var(--font-mono)", color: checks[m.key] ? m.color : "var(--gray)",
              opacity: checks[m.key] ? 1 : 0.4,
            }}
          />
        </div>
      ))}

      <div style={{
        display:"flex", justifyContent:"space-between", marginTop:"8px",
        padding:"10px 14px", background:"var(--dark3)", borderRadius:"8px"
      }}>
        <span style={{ fontSize:"12px", color:"var(--gray)" }}>Suma ingresada:</span>
        <span style={{ fontFamily:"var(--font-mono)", fontWeight:600, color: valido ? "var(--green)" : "var(--color-text)" }}>
          S/ {suma.toFixed(2)}
        </span>
      </div>
      <div style={{
        display:"flex", justifyContent:"space-between", marginTop:"4px",
        padding:"6px 14px"
      }}>
        <span style={{ fontSize:"12px", color:"var(--gray)" }}>Diferencia:</span>
        <span style={{ fontFamily:"var(--font-mono)", fontWeight:600, color: diff !== 0 ? "var(--red)" : "var(--green)" }}>
          {diff > 0 ? `- S/ ${diff.toFixed(2)}` : diff < 0 ? `+ S/ ${Math.abs(diff).toFixed(2)}` : "✓ OK"}
        </span>
      </div>
      {diff !== 0 && (
        <p style={{ fontSize:"11px", color:"var(--red)", textAlign:"center", marginTop:"6px" }}>
          La suma debe coincidir exactamente con el total para confirmar
        </p>
      )}
    </Modal>
  );
}
