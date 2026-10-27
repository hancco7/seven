import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Modal, { FormField } from "./Modal";
import { api, saveOffline } from "../utils/api";
import { useStore, useToast } from "../store/useStore";
import { useOfflineSync } from "../hooks/useOfflineSync";

const CONCEPTOS = ["PAGO A/C", "COMPRA PRODUCTOS", "OTROS EGRESOS"];

export default function EgresoModal({ onClose, onSaved }) {
  const { state } = useStore();
  const toast = useToast();
  const { isOnline, refreshPendingCount } = useOfflineSync();
  const [barberos, setBarberos] = useState([]);
  const [form, setForm] = useState({
    concepto: "",
    salio_de_caja: "true",
    monto: "",
    asignado_a: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get("/api/barberos/asignables")
      .then((r) => setBarberos(r.data.data || []))
      .catch(() => {
        api.get("/api/barberos?activo=true")
          .then((r) => setBarberos(r.data.data || []))
          .catch(() => {});
      });
  }, []);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.concepto) errs.concepto = "Selecciona un concepto";
    if (!form.monto || isNaN(parseFloat(form.monto)) || parseFloat(form.monto) <= 0)
      errs.monto = "Monto inválido";
    if (!form.asignado_a) errs.asignado_a = "Selecciona a quién se asigna";
    return errs;
  };

  const handleGuardar = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const offline_id = uuidv4();
    const now = new Date();
    const payload = {
      barbero_id:    state.barberoActual?.id,
      concepto:      form.concepto,
      salio_de_caja: form.salio_de_caja === "true",
      monto:         parseFloat(form.monto),
      asignado_a:    form.asignado_a ? parseInt(form.asignado_a) : null,
      fecha:         `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`,
      hora:          now.toLocaleTimeString("en-GB", { hour12: false }).slice(0, 8),
      notas:         form.notas || null,
      offline_id,
    };

    if (isOnline) {
      try {
        await api.post("/api/egresos", payload);
        toast("Egreso registrado ✓", "success");
        onSaved?.();
        onClose();
        return;
      } catch (err) {
        if (!err.response) {
          // Error de red → caer a offline
        } else {
          toast("Error al registrar egreso", "error");
          setSaving(false);
          return;
        }
      }
    }

    // Guardar offline
    await saveOffline({ offline_id, endpoint: "/api/egresos", payload });
    await refreshPendingCount();
    toast("Sin conexión — Egreso guardado localmente ✓", "warning");
    onSaved?.();
    onClose();
    setSaving(false);
  };

  return (
    <Modal
      title="Registrar Egreso"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando…" : isOnline ? "Guardar egreso" : "Guardar offline"}
          </button>
        </>
      }
    >
      {!isOnline && (
        <div style={{ background: "#422006", border: "1px solid #92400e", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "11px", color: "#fde68a" }}>
          ⚡ Sin conexión — el egreso se guardará localmente y se sincronizará después
        </div>
      )}

      <FormField label="Concepto">
        <select value={form.concepto} onChange={(e) => set("concepto", e.target.value)}>
          <option value="">— Seleccionar —</option>
          {CONCEPTOS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.concepto && <span style={{ color: "var(--red)", fontSize: "11px" }}>{errors.concepto}</span>}
      </FormField>

      <FormField label="¿Salió de caja?">
        <select value={form.salio_de_caja} onChange={(e) => set("salio_de_caja", e.target.value)}>
          <option value="true">Sí – salió de caja</option>
          <option value="false">No – otro medio</option>
        </select>
      </FormField>

      <FormField label="Monto (S/)">
        <input type="number" min="0" step="0.5" placeholder="0.00" value={form.monto} onChange={(e) => set("monto", e.target.value)} />
        {errors.monto && <span style={{ color: "var(--red)", fontSize: "11px" }}>{errors.monto}</span>}
      </FormField>

      <FormField label="Asignado a *">
        <select value={form.asignado_a} onChange={(e) => set("asignado_a", e.target.value)}>
          <option value="">— Seleccionar —</option>
          {barberos.map((u) => {
            const roles = [u.es_barbero && "barbero", u.es_admin && "admin"].filter(Boolean).join("/");
            return <option key={u.id} value={u.id}>{u.nombre_corto} ({roles})</option>;
          })}
        </select>
        {errors.asignado_a && <span style={{ color: "var(--red)", fontSize: "11px" }}>{errors.asignado_a}</span>}
      </FormField>

      <FormField label="Notas (opcional)">
        <textarea rows={2} maxLength={500} placeholder="Observaciones..." value={form.notas}
          onChange={(e) => set("notas", e.target.value)} style={{ resize: "vertical" }} />
      </FormField>

      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
        Fecha: {new Date().toLocaleDateString("es-PE")} (automática)
      </div>
    </Modal>
  );
}
