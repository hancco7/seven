import { createContext, useContext, useReducer, useCallback } from "react";

// Panel web solo del admin (VITE_APP_MODE=admin): no existen las pantallas del barbero
export const ADMIN_ONLY = import.meta.env.VITE_APP_MODE === "admin";

const initialState = {
  // Navegación
  screen: "landing", // landing | barberSelect | barberHome | registro | adminLogin | admin
  // Sesión barbero
  barberoActual: null,  // { id, nombre_corto, nombres }
  // Sesión admin
  isAdmin: false,
  adminToken: sessionStorage.getItem("se7en_token") || null,
  adminUser:  JSON.parse(sessionStorage.getItem("se7en_user") || "null"),
  // Conectividad
  online: navigator.onLine,
  // Toasts
  toasts: [],
};

function reducer(state, action) {
  switch (action.type) {
    // ── Navegación ──
    case "GO":
      if (ADMIN_ONLY && !["admin", "adminLogin"].includes(action.screen))
        return { ...state, screen: state.isAdmin ? "admin" : "adminLogin" };
      return { ...state, screen: action.screen };

    // ── Barbero ──
    case "SET_BARBERO":
      return { ...state, barberoActual: action.payload, screen: "barberHome" };
    case "CLEAR_BARBERO":
      return { ...state, barberoActual: null, screen: "barberSelect" };

    // ── Admin ──
    case "SET_ADMIN":
      sessionStorage.setItem("se7en_token", action.payload.token);
      sessionStorage.setItem("se7en_user", JSON.stringify(action.payload.user));
      return {
        ...state,
        isAdmin: true,
        adminToken: action.payload.token,
        adminUser: action.payload.user,
        screen: "admin",
      };
    case "LOGOUT_ADMIN":
      sessionStorage.removeItem("se7en_token");
      sessionStorage.removeItem("se7en_user");
      return { ...state, isAdmin: false, adminToken: null, adminUser: null, screen: ADMIN_ONLY ? "adminLogin" : "landing" };

    // ── Online ──
    case "SET_ONLINE": return { ...state, online: action.online };

    // ── Toasts ──
    case "ADD_TOAST": {
      const id = Date.now() + Math.random();
      return { ...state, toasts: [...state.toasts, { id, ...action.payload }] };
    }
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    default: return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    isAdmin: !!initialState.adminToken,
    screen: initialState.adminToken
      ? "admin"
      : (ADMIN_ONLY ? "adminLogin" : "landing"),
  });

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

export function useToast() {
  const { dispatch } = useStore();
  return useCallback(
    (msg, type = "info") => {
      dispatch({ type: "ADD_TOAST", payload: { msg, kind: type } });
    },
    [dispatch]
  );
}
