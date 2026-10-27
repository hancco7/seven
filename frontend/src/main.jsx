import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App";

// Registrar Service Worker generado por Workbox/VitePWA
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // VitePWA con generateSW registra automáticamente via virtual:pwa-register
  // Este bloque es fallback manual por si el auto-registro falla
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("SW registrado:", reg.scope))
      .catch((err) => console.warn("SW no disponible:", err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
