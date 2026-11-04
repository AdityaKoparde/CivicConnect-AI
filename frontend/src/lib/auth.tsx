/** Session state: the JWT lives in an httpOnly cookie, so we only track the
 *  user object returned by GET /api/auth/me. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiGet, apiPost, ApiError } from './api';
import type { Role, UserView } from './types';

interface AuthState {
  user: UserView | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserView>;
  register: (input: { email: string; password: string; name: string; phone?: string }) => Promise<UserView>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiGet<{ user: UserView }>('/auth/me');
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setUser(null);
      else setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ user: UserView }>('/auth/login', { email, password });
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; phone?: string }) => {
      const res = await apiPost<{ user: UserView }>('/auth/register', input);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiPost<{ ok: boolean }>('/auth/logout');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const isStaffRole = (role: Role): boolean =>
  role === 'SUPER_ADMIN' || role === 'DEPARTMENT_ADMIN' || role === 'DEPARTMENT_OFFICER';
