import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_email");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refreshUser, requestOtp, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return ctx;
}
