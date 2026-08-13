import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../api/apiClient";

const AuthContext = createContext(null);
const INACTIVITY_WARNING_MS = 50 * 60 * 1000;
const WARNING_COUNTDOWN_SECONDS = 10 * 60;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(
    WARNING_COUNTDOWN_SECONDS,
  );
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const sessionWarningOpenRef = useRef(false);

  useEffect(() => {
    sessionWarningOpenRef.current = sessionWarningOpen;
  }, [sessionWarningOpen]);

  const clearSessionTimers = useCallback(() => {
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get("/auth/me");
    setUser(res.data.user);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("user_email", res.data.user?.email || "");
    return res.data.user;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const refreshIfAuthenticated = () => {
      if (!localStorage.getItem("token")) return;
      refreshUser().catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfAuthenticated();
      }
    };

    window.addEventListener("focus", refreshIfAuthenticated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshIfAuthenticated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshUser]);

  const logout = useCallback(() => {
    clearSessionTimers();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_email");
    setSessionWarningOpen(false);
    setWarningCountdown(WARNING_COUNTDOWN_SECONDS);
    setUser(null);
  }, [clearSessionTimers]);

  const startInactivityTimer = useCallback(() => {
    if (!localStorage.getItem("token")) return;

    clearSessionTimers();
    setSessionWarningOpen(false);
    setWarningCountdown(WARNING_COUNTDOWN_SECONDS);

    warningTimeoutRef.current = window.setTimeout(() => {
      setSessionWarningOpen(true);
      setWarningCountdown(WARNING_COUNTDOWN_SECONDS);

      countdownIntervalRef.current = window.setInterval(() => {
        setWarningCountdown((current) => {
          if (current <= 1) {
            logout();
            return 0;
          }

          return current - 1;
        });
      }, 1000);
    }, INACTIVITY_WARNING_MS);
  }, [clearSessionTimers, logout]);

  useEffect(() => {
    if (!user) {
      clearSessionTimers();
      return;
    }

    const activityEvents = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    const handleActivity = () => {
      if (sessionWarningOpenRef.current) return;
      startInactivityTimer();
    };

    startInactivityTimer();
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true }),
    );

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity),
      );
      clearSessionTimers();
    };
  }, [clearSessionTimers, startInactivityTimer, user]);

  const extendSession = async () => {
    const res = await api.post("/auth/refresh");
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("user_email", res.data.user?.email || "");
    setUser(res.data.user);
    startInactivityTimer();
    return res.data.user;
  };

  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  };

  const requestOtp = async (email) => {
    const res = await api.post("/auth/mock/request", { email });
    return res.data;
  };

  const verifyOtp = async (email, code, nombre) => {
    const res = await api.post("/auth/mock/verify", { email, code, nombre });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("user_email", res.data.user?.email || "");
    setUser(res.data.user);
    startInactivityTimer();
    return res.data.user;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refreshUser, requestOtp, verifyOtp, logout }}
    >
      {children}
      {sessionWarningOpen && user && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Sesión inactiva
            </p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              ¿Quieres mantener tu sesión activa?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              No hemos detectado actividad reciente. Por seguridad, cerraremos
              tu sesión automáticamente en:
            </p>
            <p className="mt-4 text-center font-mono text-4xl font-bold text-slate-900">
              {formatCountdown(warningCountdown)}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={logout}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cerrar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  extendSession().catch(logout);
                }}
                className="rounded-xl bg-[rgba(2,14,159,1)] px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-900"
              >
                Mantener sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return ctx;
}
