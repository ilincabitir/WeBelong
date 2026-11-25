import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loginRequest, meRequest, registerRequest } from '../api/auth';
import type { RegisterBody, User } from '../api/auth';
import { clearToken, getToken, setToken } from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterBody) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first render: if a token exists, validate it against /auth/me.
  useEffect(() => {
    let active = true;

    if (!getToken()) {
      setLoading(false);
      return;
    }

    meRequest()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest({ username, password });
    setToken(response.token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterBody) => {
    const response = await registerRequest(data);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await meRequest();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, refreshUser, logout }),
    [user, loading, login, register, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}