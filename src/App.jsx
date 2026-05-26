import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminDashboard from "./pages/AdminDashboard.jsx";
import StudentPortal from "./pages/StudentPortal.jsx";
import InstitutionsPage from "./pages/InstitutionsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import CoordinatorsPage from "./pages/CoordinatorsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

import { Toaster } from "sonner";
import { SolicitudProvider } from "./contexts/SolicitudContext.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";

function Gate() {
  const { user, loading } = useAuth();

  if (loading) return null; // o loader

  if (!user) return <Navigate to="/login" replace />;

  return user.role === "COORD" ? (
    <Navigate to="/admin" replace />
  ) : (
    <Navigate to="/portal" replace />
  );
}

function ProtectedRoute({ children, allowRoles }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (Array.isArray(allowRoles) && allowRoles.length) {
    if (!allowRoles.includes(user.role)) return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <SolicitudProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />

        <Routes>
          {/* ✅ sin Home: raíz decide por sesión/rol */}
          <Route path="/" element={<Gate />} />

          {/* ✅ login OTP */}
          <Route path="/login" element={<LoginPage />} />

          {/* ✅ rutas protegidas */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowRoles={["COORD"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal"
            element={
              <ProtectedRoute allowRoles={["STUDENT", "COORD"]}>
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instituciones"
            element={
              <ProtectedRoute allowRoles={["COORD"]}>
                <InstitutionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reportes"
            element={
              <ProtectedRoute allowRoles={["COORD"]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinadores"
            element={
              <ProtectedRoute allowRoles={["COORD"]}>
                <CoordinatorsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowRoles={["COORD"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SolicitudProvider>
  );
}
