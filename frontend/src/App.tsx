import { Navigate, Route, Routes } from "react-router-dom";
import { isAuthenticated } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import FlightLogPage from "./pages/FlightLogPage";
import AddFlightPage from "./pages/AddFlightPage";
import EditFlightPage from "./pages/EditFlightPage";
import MapPage from "./pages/MapPage";
import StatsPage from "./pages/StatsPage";
import ImportPage from "./pages/ImportPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="flights" element={<FlightLogPage />} />
        <Route path="flights/new" element={<AddFlightPage />} />
        <Route path="flights/:id/edit" element={<EditFlightPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="import" element={<ImportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
