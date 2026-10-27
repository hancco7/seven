import { useEffect } from "react";
import { useStore } from "../store/useStore";

const ICONS = { success: "✓", error: "✕", info: "ℹ", warning: "⚠" };
const DURATION = 3500;

function ToastItem({ toast }) {
  const { dispatch } = useStore();

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch({ type: "REMOVE_TOAST", id: toast.id });
    }, DURATION);
    return () => clearTimeout(t);
  }, [toast.id, dispatch]);

  return (
    <div className={`toast toast-${toast.kind || "info"}`}>
      <span>{ICONS[toast.kind] || "ℹ"}</span>
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button
        onClick={() => dispatch({ type: "REMOVE_TOAST", id: toast.id })}
        style={{ background: "none", color: "inherit", fontSize: "14px", padding: "0 4px", opacity: .7 }}
      >
        ×
      </button>
    </div>
  );
}

export default function Toast() {
  const { state } = useStore();
  if (!state.toasts.length) return null;
  return (
    <div className="toast-container">
      {state.toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
