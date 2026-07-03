import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

function isUnauthorized(err) {
  return err?.status === 401 || err?.status === 403;
}

async function loadUserWithRetry(retries = 5) {
  for (let i = 0; i < retries; i += 1) {
    try {
      return await api.me();
    } catch (err) {
      if (isUnauthorized(err)) throw err;
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await loadUserWithRetry();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (!cancelled && isUnauthorized(err)) {
          localStorage.removeItem('token');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();

    const onStorage = (e) => {
      if (e.key !== 'token') return;
      if (e.newValue) {
        loadUserWithRetry(3).then((me) => setUser(me)).catch((err) => {
          if (isUnauthorized(err)) {
            localStorage.removeItem('token');
            setUser(null);
          }
        });
      } else {
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = async (employee_id, password) => {
    const data = await api.login(employee_id, password);
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.unregisterDeviceToken();
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  coo: 'COO',
  branch_manager: 'Branch Manager',
  employee: 'Employee',
};

export const isManagement = (role) =>
  ['super_admin', 'admin', 'coo', 'branch_manager'].includes(role);

export const isAdmin = (role) =>
  ['super_admin', 'admin'].includes(role);

export const canAnnounce = (role) =>
  ['super_admin', 'admin', 'coo'].includes(role);
