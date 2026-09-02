import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('examai_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('examai_token'));
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [loading, setLoading] = useState(!!localStorage.getItem('examai_token'));

  const persist = (nextUser, nextToken, policy = {}) => {
    setUser(nextUser);
    setToken(nextToken);
    if (policy.requiresEmailVerification !== undefined) {
      setRequiresEmailVerification(Boolean(policy.requiresEmailVerification));
    }
    if (nextToken) localStorage.setItem('examai_token', nextToken);
    else localStorage.removeItem('examai_token');
    if (nextUser) localStorage.setItem('examai_user', JSON.stringify(nextUser));
    else localStorage.removeItem('examai_user');
  };

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('examai_token')) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.me();
      const u = data.data.user;
      setUser(u);
      setRequiresEmailVerification(Boolean(data.data.requiresEmailVerification));
      localStorage.setItem('examai_user', JSON.stringify(u));
    } catch {
      persist(null, null, { requiresEmailVerification: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    persist(data.data.user, data.data.token, {
      requiresEmailVerification: data.data.requiresEmailVerification,
    });
    return data.data.user;
  };

  const register = async (form) => {
    const { data } = await authAPI.register(form);
    return data;
  };

  const logout = () => persist(null, null, { requiresEmailVerification: false });

  const updateUser = (partial) => {
    const next = { ...user, ...partial };
    setUser(next);
    localStorage.setItem('examai_user', JSON.stringify(next));
  };

  const mustVerifyEmailBeforeExam = Boolean(
    requiresEmailVerification && user?.role === 'student' && !user?.isEmailVerified
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!user && !!token,
      requiresEmailVerification,
      mustVerifyEmailBeforeExam,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
    }),
    [user, token, loading, requiresEmailVerification, mustVerifyEmailBeforeExam, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
