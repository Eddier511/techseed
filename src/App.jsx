import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const StudentPortal = lazy(() => import("./pages/StudentPortal.jsx"));
const InstitutionsPage = lazy(() => import("./pages/InstitutionsPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const CoordinatorsPage = lazy(() => import("./pages/CoordinatorsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));

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

        <Suspense fallback={<div role="status">Cargando…</div>}>
        <Routes>
          {/* âœ… sin Home: raÃ­z decide por sesiÃ³n/rol */}
          <Route path="/" element={<Gate />} />

          {/* âœ… login OTP */}
          <Route path="/login" element={<LoginPage />} />

          {/* âœ… rutas protegidas */}
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
        </Suspense>
      </BrowserRouter>
    </SolicitudProvider>
  );
}
