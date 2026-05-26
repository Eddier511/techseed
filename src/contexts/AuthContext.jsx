import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("user_email", res.data.user?.email || "");
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

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
      value={{ user, loading, requestOtp, verifyOtp, logout }}
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
