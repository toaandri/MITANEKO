import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, AuthUser } from './api';

const TOKEN_KEY = 'mitaneko_access';
const REFRESH_KEY = 'mitaneko_refresh';
const USER_KEY = 'mitaneko_user';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  registerWithToken: (payload: {
    token_code: string;
    telephone: string;
    password: string;
    pseudonyme: string;
    nom?: string;
    prenom?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (access: string, refresh: string, u: AuthUser) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, access],
      [REFRESH_KEY, refresh],
      [USER_KEY, JSON.stringify(u)],
    ]);
    setToken(access);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [[, access], [, rawUser]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
        if (access && rawUser) {
          setToken(access);
          setUser(JSON.parse(rawUser) as AuthUser);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const isEmail = identifier.includes('@');
      const body = isEmail
        ? { email: identifier.trim(), password }
        : { telephone: identifier.trim(), password };
      const res = await apiRequest<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', { method: 'POST', body });
      await persist(res.data.accessToken, res.data.refreshToken, res.data.user);
    },
    [persist],
  );

  const registerWithToken = useCallback(
    async (payload: {
      token_code: string;
      telephone: string;
      password: string;
      pseudonyme: string;
      nom?: string;
      prenom?: string;
    }) => {
      const res = await apiRequest<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>('/auth/register-with-token', { method: 'POST', body: payload });
      await persist(res.data.accessToken, res.data.refreshToken, res.data.user);
    },
    [persist],
  );

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const res = await apiRequest<AuthUser>('/users/profile', { token });
    setUser(res.data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data));
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      registerWithToken,
      logout,
      refreshProfile,
    }),
    [user, token, loading, login, registerWithToken, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
