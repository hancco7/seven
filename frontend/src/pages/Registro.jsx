import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { api, saveOffline, cachedGet } from "../utils/api";
import { useStore, useToast } from "../store/useStore";
import { useInactivity } from "../hooks/useInactivity";
import { useOfflineSync } from "../hooks/useOfflineSync";
import Modal, { FormField, ModalTabs } from "../components/Modal";
import { OtrosSvcModal, OtrosProdModal, MultiPagoModal } from "../components/Modals";

const METODOS_PAGO = ["EFECTIVO", "YAPE", "PLIN", "TARJETA"];
const fmt = (n) => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 });

/* ── Modal Cliente ─────────────────────────────────────────────────────────── */
function ClienteModal({ onClose, onSelect }) {
  const [tab, setTab] = useState("Buscar");
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [form, setForm] = useState({ tipo_documento: "DNI", nro_documento: "", nombres: "", apellidos: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { isOnline } = useOfflineSync();

  const buscar = async () => {
    if (!q.trim()) return;
    try {
      const r = await api.get(`/api/clientes?q=${encodeURIComponent(q)}`);
      setResultados(r.data.data || []);
    } catch {
      if (!isOnline) toast("Sin conexión — no se puede buscar clientes", "warning");
      else toast("Error buscando clientes", "error");
    }
  };

  const crearCliente = async () => {
    if (!form.nro_documento || !form.nombres) return;
    if (!isOnline) { toast("Sin conexión — no se puede crear cliente ahora", "warning"); return; }
    setSaving(true);
    try {
      const r = await api.post("/api/clientes", form);
      onSelect(r.data);
      onClose();
    } catch { toast("Error creando cliente", "error"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Buscar / Crear Cliente" onClose={onClose}>
      <ModalTabs tabs={["Buscar", "Crear nuevo"]} active={tab} onChange={setTab} />

      {tab === "Buscar" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input placeholder="Nombre, apellido o nro. documento…" value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()} style={{ flex: 1 }} />
            <button className="btn-primary" onClick={buscar} disabled={!isOnline}>Buscar</button>
          </div>
          {!isOnline && (
            <p style={{ color: "var(--orange)", fontSize: "11px", marginBottom: "8px" }}>
              ⚡ Sin conexión — búsqueda no disponible
            </p>
          )}
          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {resultados.map((c) => (
              <div key={c.id} onClick={() => { onSelect(c); onClose(); }}
                style={{ display: "grid", gridTemplateColumns: "80px 110px 1fr", padding: "8px 10px",
                  borderBottom: "0.5px solid var(--color-border)", cursor: "pointer", fontSize: "12px",
                  color: "var(--color-text-dim)", gap: "8px" }}
                onMouseOver={(e) => e.currentTarget.style.background = "var(--orange-dim)"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                <span>{c.tipo_documento} {c.nro_documento}</span>
                <span>{c.nombres}</span>
                <span style={{ color: "var(--gray)" }}>{c.apellidos}</span>
              </div>
            ))}
            {resultados.length === 0 && q && <p style={{ color: "var(--gray)", textAlign: "center", padding: "16px", fontSize: "12px" }}>Sin resultados</p>}
          </div>
        </>
      )}

      {tab === "Crear nuevo" && (
        <>
          <FormField label="Tipo documento">
            <select value={form.tipo_documento} onChange={(e) => setForm(f => ({ ...f, tipo_documento: e.target.value }))}>
              <option>DNI</option><option>RUC</option><option>Pasaporte</option>
            </select>
          </FormField>
          <FormField label="Nro. documento">
            <input value={form.nro_documento} onChange={(e) => setForm(f => ({ ...f, nro_documento: e.target.value }))} />
          </FormField>
          <FormField label="Nombres"><input value={form.nombres} onChange={(e) => setForm(f => ({ ...f, nombres: e.target.value }))} /></FormField>
          <FormField label="Apellidos"><input value={form.apellidos} onChange={(e) => setForm(f => ({ ...f, apellidos: e.target.value }))} /></FormField>
          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={crearCliente} disabled={saving || !isOnline || !form.nro_documento || !form.nombres}>
              {saving ? "Guardando…" : isOnline ? "Guardar cliente" : "Sin conexión"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ── Registro Principal ────────────────────────────────────────────────────── */
export default function Registro() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const { barberoActual } = state;
  const { isOnline, refreshPendingCount } = useOfflineSync();

  const [svcFav, setSvcFav]                   = useState([]);
  const [prodFav, setProdFav]                 = useState([]);
  const [cliente, setCliente]                 = useState(null);
  const [clienteGenerico, setClienteGenerico] = useState(null);
  const [items, setItems]                     = useState([]);
  const [propina, setPropina]                 = useState(false);
  const [metodo, setMetodo]                   = useState(null);
  const [pagosMultiple, setPagosMultiple]     = useState([]);
  const [catalogoOffline, setCatalogoOffline] = useState(false);

  const [showCliente, setShowCliente] = useState(false);
  const [showSvc, setShowSvc]         = useState(false);
  const [showProd, setShowProd]       = useState(false);
  const [showMulti, setShowMulti]     = useState(false);
  const [saving, setSaving]           = useState(false);

  const countdown = useInactivity(() => dispatch({ type: "CLEAR_BARBERO" }));

  // Cargar catálogo con caché (funciona offline si ya se cargó antes)
  const cargarCatalogo = useCallback(async () => {
    try {
      const [svc, prod, gen] = await Promise.all([
        cachedGet("/api/catalogo/servicios?favoritos=true", "svc_favoritos"),
        cachedGet("/api/catalogo/productos?favoritos=true", "prod_favoritos"),
        cachedGet("/api/clientes/generico", "cliente_generico", 24 * 60 * 60 * 1000),
      ]);
      setSvcFav(svc.data?.slice(0, 4) || []);
      setProdFav(prod.data?.slice(0, 4) || []);
      const g = gen;
      setClienteGenerico(g);
      setCliente(g);
      setCatalogoOffline(false);
    } catch (err) {
      setCatalogoOffline(true);
      toast("Sin conexión — usando catálogo en caché", "warning");
    }
  }, [toast]);

  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

  const agregarItem = (item, tipo) => {
    setItems((prev) => [...prev, {
      key: uuidv4(), tipo, item_id: item.id,
      nombre_item: item.nombre,
      precio_cobrado: tipo === "S" ? item.precio : item.precio_venta,
      precio_original: tipo === "S" ? item.precio : item.precio_venta,
    }]);
  };

  const editarPrecio = (key, val) =>
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, precio_cobrado: val } : i));

  const eliminarItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));

  const togglePropina = () => {
    if (!propina) {
      setItems((prev) => [...prev, { key: "propina", tipo: "TIP", item_id: null, nombre_item: "PROPINA", precio_cobrado: 0, precio_original: 0 }]);
    } else {
      setItems((prev) => prev.filter((i) => i.key !== "propina"));
    }
    setPropina((p) => !p);
  };

  const total = items.reduce((acc, i) => acc + parseFloat(i.precio_cobrado || 0), 0);

  const tieneItems    = items.filter((i) => i.tipo !== "TIP").length > 0;
  const tienePago     = metodo !== null;
  const tieneCliente  = cliente !== null;
  const puedeRegistrar = tieneItems && tienePago && tieneCliente;

  const limpiar = () => {
    setItems([]);
    setPropina(false);
    setMetodo(null);
    setPagosMultiple([]);
    setCliente(clienteGenerico);
  };

  const registrar = async (pagosFinales) => {
    setSaving(true);
    const offline_id = uuidv4();
    const now = new Date();
    const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hora = now.toLocaleTimeString("en-GB", { hour12: false }).slice(0, 8);

    const payload = {
      barbero_id:     barberoActual.id,
      cliente_id:     cliente.id,
      registrado_por: null,
      es_manual:      false,
      fecha,
      hora,
      total,
      offline_id,
      items: items.map(({ tipo, item_id, nombre_item, precio_cobrado, precio_original }) =>
        ({ tipo, item_id, nombre_item, precio_cobrado: parseFloat(precio_cobrado), precio_original })),
      pagos: pagosFinales,
    };

    if (isOnline) {
      try {
        await api.post("/api/ventas", payload);
        toast("Venta registrada ✓", "success");
        limpiar();
        dispatch({ type: "GO", screen: "barberHome" });
        return;
      } catch (err) {
        if (!err.response) {
          // Error de red → caer a offline
        } else {
          toast("Error al registrar venta", "error");
          setSaving(false);
          return;
        }
      }
    }

    // Guardar offline
    await saveOffline({ offline_id, endpoint: "/api/ventas", payload });
    await refreshPendingCount();
    toast("Sin conexión — Venta guardada localmente ✓", "warning");
    limpiar();
    dispatch({ type: "GO", screen: "barberHome" });
    setSaving(false);
  };

  const handleRegistrar = () => {
    if (metodo === "MULTIPLE") setShowMulti(true);
    else registrar([{ metodo, monto: total }]);
  };

  const now = new Date();

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "grid", gridTemplateColumns: "1fr 1.3fr" }}>
      {/* Panel Izquierdo */}
      <div style={{ padding: "18px", borderRight: "1px solid var(--dark3)", overflowY: "auto" }}>
        {countdown !== null && (
          <div className="inactivity-banner">
            ⏱ Sin actividad · El sistema cerrará la sesión en <strong>{countdown}</strong> s · Toca para continuar
          </div>
        )}

        {catalogoOffline && (
          <div style={{ background: "#422006", border: "1px solid #92400e", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "11px", color: "#fde68a" }}>
            📋 Catálogo en caché — se actualizará al recuperar conexión
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{ background: "var(--orange)", color: "#fff", borderRadius: "var(--radius-full)", padding: "4px 12px 4px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
              {barberoActual?.nombre_corto?.[0]}
            </div>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>{barberoActual?.nombre_corto}</span>
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--gray)", marginBottom: "14px" }}>
          {now.toLocaleDateString("es-PE")} · {now.toLocaleTimeString("es-PE")}
        </div>

        {/* Cliente */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "5px" }}>Cliente</div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{ width: "14px", height: "14px", border: "1.5px solid var(--orange)", borderRadius: "3px", background: cliente ? "var(--orange)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {cliente && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
            </div>
            <span style={{ fontSize: "11px", color: "var(--gray-light)" }}>
              {cliente ? (cliente.es_generico ? "Cliente genérico" : `${cliente.nombres} ${cliente.apellidos}`.trim()) : "Sin cliente"}
            </span>
            <button onClick={() => setShowCliente(true)}
              style={{ marginLeft: "auto", background: "var(--dark2)", border: "1px solid var(--dark3)", borderRadius: "5px", padding: "5px 9px", fontSize: "10px", color: "var(--gray)", cursor: "pointer" }}>
              🔍 Buscar
            </button>
          </div>
        </div>

        {/* Servicios favoritos */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "9px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Servicios (favoritos)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
            {svcFav.map((s) => (
              <button key={s.id} onClick={() => agregarItem(s, "S")}
                style={{ background: "var(--dark2)", border: "1px solid var(--dark3)", borderRadius: "7px", padding: "9px", cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--orange)"}
                onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--dark3)"}>
                <div style={{ fontSize: "10px", color: "var(--white)", fontWeight: 500 }}>{s.nombre}</div>
                <div style={{ fontSize: "12px", color: "var(--orange)", fontWeight: 600, marginTop: "2px" }}>S/ {s.precio}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowSvc(true)} style={{ width: "100%", background: "transparent", border: "1px dashed #444", borderRadius: "7px", padding: "7px", fontSize: "10px", color: "#555", cursor: "pointer" }}>
            + Otros servicios →
          </button>
        </div>

        {/* Productos favoritos */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "9px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Productos (favoritos)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
            {prodFav.map((p) => (
              <button key={p.id} onClick={() => agregarItem(p, "P")}
                style={{ background: "var(--dark2)", border: "1px solid var(--dark3)", borderRadius: "7px", padding: "7px", display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", transition: "border-color .15s" }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--orange)"}
                onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--dark3)"}>
                <div style={{ width: "24px", height: "24px", background: "var(--dark3)", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 }}>🧴</div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--white)" }}>{p.nombre}</div>
                  <div style={{ fontSize: "11px", color: "var(--orange)" }}>S/ {p.precio_venta}</div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowProd(true)} style={{ width: "100%", background: "transparent", border: "1px dashed #444", borderRadius: "7px", padding: "7px", fontSize: "10px", color: "#555", cursor: "pointer" }}>
            + Otros productos →
          </button>
        </div>

        {/* Propina */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "5px" }}>Propina</div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={propina} onChange={togglePropina} style={{ width: "auto", accentColor: "var(--orange)" }} />
            <span style={{ fontSize: "12px", color: "var(--gray-light)" }}>💰 Agregar propina al cobro</span>
          </label>
        </div>

        {/* Forma de pago */}
        <div>
          <div style={{ fontSize: "9px", color: "var(--gray)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "5px" }}>Forma de pago</div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {METODOS_PAGO.map((m) => (
              <button key={m} onClick={() => setMetodo(m)}
                style={{ flex: 1, minWidth: "60px", padding: "7px 4px", borderRadius: "5px", fontSize: "9px", fontWeight: 600, textAlign: "center", cursor: "pointer", border: "1.5px solid",
                  background: metodo === m ? "var(--orange)" : "var(--dark2)",
                  color: metodo === m ? "#fff" : "var(--gray)",
                  borderColor: metodo === m ? "var(--orange)" : "var(--dark3)" }}>
                {m}
              </button>
            ))}
            <button onClick={() => setMetodo("MULTIPLE")}
              style={{ flex: 1, minWidth: "60px", padding: "7px 4px", borderRadius: "5px", fontSize: "9px", fontWeight: 600, cursor: "pointer",
                border: "1.5px dashed",
                background: metodo === "MULTIPLE" ? "var(--orange-dim)" : "transparent",
                color: "var(--orange)", borderColor: "var(--orange)" }}>
              Múltiple ⊕
            </button>
          </div>
        </div>
      </div>

      {/* Panel Derecho */}
      <div style={{ padding: "4px 18px 18px 18px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "10px", fontSize: "11px", color: "var(--gray)" }}>
          <div><span style={{ color: "var(--color-text-muted)" }}>CLIENTE</span> &nbsp; {cliente ? (cliente.es_generico ? "CLIENTE GENÉRICO" : `${cliente.nombres} ${cliente.apellidos}`.toUpperCase()) : "—"}</div>
          <div><span style={{ color: "var(--color-text-muted)" }}>BARBERO</span> &nbsp; {barberoActual?.nombre_corto}</div>
          {!isOnline && (
            <div style={{ color: "#fca5a5", fontSize: "10px", marginTop: "4px" }}>
              ⚡ Modo sin conexión — se guardará localmente
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 55px 50px 45px 24px", gap: "3px", fontSize: "9px", color: "var(--gray)", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid var(--dark3)", paddingBottom: "6px", marginBottom: "6px" }}>
            <span>Servicio/Producto</span><span>Precio</span><span>Pago</span><span>T</span><span></span>
          </div>
          {items.map((item) => (
            <div key={item.key} style={{ display: "grid", gridTemplateColumns: "1fr 55px 50px 45px 24px", gap: "3px", padding: "6px 0", borderBottom: "0.5px solid var(--dark3)", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: item.tipo === "TIP" ? "var(--orange)" : "var(--white)" }}>
                {item.tipo === "TIP" ? "💰" : ""} {item.nombre_item}
              </span>
              <input
                type="number" value={item.precio_cobrado} min="0" step="0.5"
                onChange={(e) => editarPrecio(item.key, e.target.value)}
                onFocus={(e) => { if (parseFloat(e.target.value) === 0) editarPrecio(item.key, ""); }}
                onBlur={(e) => { if (e.target.value === "") editarPrecio(item.key, 0); }}
                style={{ padding: "3px 5px", fontSize: "11px", color: "var(--orange)", fontFamily: "var(--font-mono)", background: "var(--dark3)", border: "1px solid var(--orange)", borderRadius: "4px", width: "52px", textAlign: "right" }}
              />
              <span style={{ fontSize: "9px", color: "var(--gray)" }}>{metodo === "MULTIPLE" ? "MULT." : (metodo || "—")}</span>
              <span className={`tag-${item.tipo.toLowerCase()}`}>{item.tipo}</span>
              <button onClick={() => eliminarItem(item.key)} style={{ background: "var(--dark3)", border: "none", borderRadius: "3px", color: "var(--gray)", fontSize: "10px", cursor: "pointer", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          ))}
          {items.length === 0 && (
            <p style={{ color: "var(--gray)", textAlign: "center", padding: "30px", fontSize: "12px" }}>
              Selecciona servicios o productos para comenzar
            </p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 8px", borderTop: "2px solid var(--orange)", marginTop: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--gray)", letterSpacing: "1px", textTransform: "uppercase" }}>TOTAL</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "30px", color: "var(--orange)", letterSpacing: "2px" }}>
            S/ {total.toFixed(2)}
          </span>
        </div>

        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          <button
            className="btn-primary"
            style={{ flex: 1, opacity: puedeRegistrar ? 1 : 0.45, cursor: puedeRegistrar ? "pointer" : "not-allowed" }}
            disabled={!puedeRegistrar || saving}
            onClick={handleRegistrar}
          >
            {saving ? "Registrando…" : isOnline ? "Registrar" : "Guardar offline"}
          </button>
          <button className="btn-secondary" onClick={limpiar}>Limpiar</button>
          <button className="btn-ghost" onClick={() => dispatch({ type: "GO", screen: "barberHome" })}>← Volver</button>
        </div>
      </div>

      {showCliente && <ClienteModal onClose={() => setShowCliente(false)} onSelect={setCliente} />}
      {showSvc  && <OtrosSvcModal  onClose={() => setShowSvc(false)}  onAgregar={(s) => agregarItem(s, "S")} />}
      {showProd && <OtrosProdModal onClose={() => setShowProd(false)} onAgregar={(p) => agregarItem(p, "P")} />}
      {showMulti && (
        <MultiPagoModal
          total={total}
          onClose={() => setShowMulti(false)}
          onConfirmar={(pagos) => registrar(pagos)}
        />
      )}
    </div>
  );
}
