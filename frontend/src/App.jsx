import { StoreProvider, useStore, ADMIN_ONLY } from "./store/useStore";
import Toast from "./components/Toast";
import Topbar from "./components/Topbar";
import OfflineStatusBar from "./components/OfflineStatusBar";
import Landing from "./pages/Landing";
import BarberSelect from "./pages/BarberSelect";
import HomeBarbero from "./pages/HomeBarbero";
import Registro from "./pages/Registro";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";

function Router() {
  const { state } = useStore();
  const { screen } = state;

  if (screen === "admin") return <Admin />;

  // Panel web solo del admin: únicamente la pantalla de login
  if (ADMIN_ONLY) {
    return (
      <>
        <main className="app-main"><AdminLogin /></main>
        <Toast />
      </>
    );
  }

  const esBarbero = ["barberSelect", "barberHome", "registro"].includes(screen);

  return (
    <div className={esBarbero ? "seccion-barbero" : undefined}>
      <OfflineStatusBar />
      <Topbar />
      <main className="app-main">
        {screen === "landing"      && <Landing />}
        {screen === "barberSelect" && <BarberSelect />}
        {screen === "barberHome"   && <HomeBarbero />}
        {screen === "registro"     && <Registro />}
        {screen === "adminLogin"   && <AdminLogin />}
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
