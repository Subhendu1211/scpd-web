import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginRequest, AdminLoginResponse } from "./api";

interface AdminAuthState {
  token: string | null;
  user: AdminLoginResponse["user"] | null;
  loading: boolean;
  error: string | null;
  login(_credentials: { email: string; password: string }): Promise<boolean>;
  logout(): void;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

const TOKEN_KEY = "scpd_admin_token";
const USER_KEY = "scpd_admin_user";

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminLoginResponse["user"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.warn("Failed to parse stored admin user", err);
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  const login = useCallback(async (_credentials: { email: string; password: string }) => {
    const { email, password } = _credentials;
    setLoading(true);
    setError(null);
    try {
      const result = await loginRequest(email, password);
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || "Unable to login";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, error, login, logout }),
    [token, user, loading, error, login, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    return {
      token: null,
      user: null,
      loading: false,
      error: "Admin auth provider unavailable",
      login: async () => false,
      logout: () => {},
    };
  }
  return ctx;
}

export function useRequireAdmin() {
  const auth = useAdminAuth();
  return !!auth.token;
}
