import { StoreProvider, useStore } from "./store/useStore";
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

  return (
    <>
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
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
