import { useEffect, useRef } from "react";

/** Modal base reutilizable */
export default function Modal({ title, onClose, children, footer, maxWidth = 480 }) {
  const overlayRef = useRef(null);

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Click fuera del modal
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-box" style={{ maxWidth }}>
        <div className="modal-title">
          <span>{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/** FormField helper */
export function FormField({ label, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children}
    </div>
  );
}

/** Tabs helper */
export function ModalTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-full)",
            border: "1px solid",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            background: active === tab ? "var(--orange)" : "transparent",
            color:      active === tab ? "#fff" : "var(--color-text-muted)",
            borderColor: active === tab ? "var(--orange)" : "var(--color-border)",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
