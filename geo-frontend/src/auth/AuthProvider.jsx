import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api";
import AuthContext from "./AuthContext";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        api.defaults.headers.Authorization = `Bearer ${token}`;
      } catch {
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    api.defaults.headers.Authorization = `Bearer ${data.token}`;
    setUser(jwtDecode(data.token));
  };

  const register = async (email, password) => {
    const { data } = await api.post("/auth/register", { email, password });
    localStorage.setItem("token", data.token);
    api.defaults.headers.Authorization = `Bearer ${data.token}`;
    setUser(jwtDecode(data.token));
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
