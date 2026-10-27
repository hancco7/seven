import { useEffect, useRef, useState } from "react";

const IDLE_MS    = 60_000; // 1 minuto
const WARNING_MS = 10_000; // 10 segundos de cuenta regresiva

/**
 * useInactivity(onTimeout, enabled)
 * Returns: countdown (null=activo, número=segundos restantes)
 * El componente puede llamar a reset() para cancelar la cuenta atrás.
 */
export function useInactivity(onTimeout, enabled = true) {
  const [countdown, setCountdown] = useState(null);
  const idleTimer     = useRef(null);
  const countdownRef  = useRef(null);

  const clearTimers = () => {
    clearTimeout(idleTimer.current);
    clearInterval(countdownRef.current);
  };

  const reset = () => {
    if (!enabled) return;
    clearTimers();
    setCountdown(null);

    idleTimer.current = setTimeout(() => {
      // Inicia cuenta regresiva de 10 segundos
      let secs = WARNING_MS / 1000;
      setCountdown(secs);

      countdownRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearTimers();
          setCountdown(null);
          onTimeout?.();
        }
      }, 1000);
    }, IDLE_MS);
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    const handler = () => reset();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    reset(); // iniciar al montar

    return () => {
      clearTimers();
      events.forEach((e) => window.removeEventListener(e, handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return countdown; // null = activo, número = segundos restantes
}
