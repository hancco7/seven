import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App";

// Service Worker: solo en la versión web (PWA).
// Dentro del APK (Capacitor) los archivos ya vienen en el teléfono; un SW ahí
// guarda una copia vieja de la app y oculta las actualizaciones del APK.
const esApkNativo = !!window.Capacitor?.isNativePlatform?.();
const esPanelAdmin = import.meta.env.VITE_APP_MODE === "admin";
if (esPanelAdmin) document.title = "SE7EN Admin";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  if (esApkNativo || esPanelAdmin) {
    // Limpia el SW y las cachés que dejaron versiones anteriores del APK.
    // Las ventas offline están en IndexedDB y NO se tocan.
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (!regs.length) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload(); // recarga una sola vez ya sin SW
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registrado:", reg.scope))
        .catch((err) => console.warn("SW no disponible:", err));
    });
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
