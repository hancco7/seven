/**
 * useOfflineSync
 * Maneja el estado de conectividad y sincronización automática
 * para el flujo de barbero (no aplica al admin).
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { sincronizarCola, getPendingCount } from "../utils/api";
import { useStore } from "../store/useStore";

export function useOfflineSync(onSynced) {
  const { state, dispatch } = useStore();
  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [syncing, setSyncing]           = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError]       = useState(null);
  const isSyncingRef = useRef(false);
  const retryTimerRef = useRef(null);

  // Actualiza el contador de pendientes
  const refreshPendingCount = useCallback(async () => {
    const n = await getPendingCount();
    setPendingCount(n);
  }, []);

  // Intenta sincronizar la cola
  const trySync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);
    setSyncError(null);

    try {
      const count = await sincronizarCola();
      if (count > 0) onSynced?.(count);
      await refreshPendingCount();
    } catch (err) {
      setSyncError(err.message);
      // Reintentar en 30 segundos si falla
      retryTimerRef.current = setTimeout(trySync, 30_000);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [onSynced, refreshPendingCount]);

  useEffect(() => {
    // Carga inicial del contador
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      dispatch({ type: "SET_ONLINE", online: true });
      // Pequeño delay para asegurar que la red está estable
      setTimeout(trySync, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      dispatch({ type: "SET_ONLINE", online: false });
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sincroniza al montar si hay pendientes y hay conexión
    if (navigator.onLine) {
      getPendingCount().then((n) => {
        if (n > 0) trySync();
      });
    }

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [dispatch, trySync, refreshPendingCount]);

  return { isOnline, syncing, pendingCount, syncError, trySync, refreshPendingCount };
}

// Re-export para compatibilidad con el nombre anterior
export { useOfflineSync as useOnline };
