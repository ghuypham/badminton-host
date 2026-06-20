// Auth context: track admin session, expose login/logout.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client.ts';
import type { MeResponse } from '../../shared/types.ts';

interface AuthState {
  authenticated: boolean;
  username?: string;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MeResponse>('/auth/me')
      .then((r) => {
        setAuthenticated(r.authenticated);
        setUsername(r.username);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (u: string, p: string) => {
    const r = await api.post<MeResponse>('/auth/login', { username: u, password: p });
    setAuthenticated(r.authenticated);
    setUsername(r.username);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setAuthenticated(false);
    setUsername(undefined);
  };

  return (
    <AuthContext.Provider value={{ authenticated, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
