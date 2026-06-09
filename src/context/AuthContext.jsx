import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [estate, setEstate] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.data);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    const handleExpiry = () => {
      setUser(null);
      setEstate(null);
    };
    window.addEventListener('auth:expired', handleExpiry);
    return () => window.removeEventListener('auth:expired', handleExpiry);
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user: u, accessToken, estate: e } = data.data;
    localStorage.setItem('accessToken', accessToken);
    flushSync(() => {
      setUser(u);
      setEstate(e);
    });
    return u;
  };

  const logout = async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    setUser(null);
    setEstate(null);
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    const { user: u, accessToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(u);
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, estate, loading, login, logout, register, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
