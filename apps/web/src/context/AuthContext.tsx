'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  settings?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = ApiClient.getToken();
    if (savedToken) {
      setToken(savedToken);
      ApiClient.getMe()
        .then((res) => {
          setUser(res);
        })
        .catch(() => {
          ApiClient.setToken(null);
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.login(email, pass);
      ApiClient.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    return login('demo@tradingterminal.io', 'Demo1234!');
  };

  const register = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.register(email, pass, name);
      ApiClient.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    ApiClient.setToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginAsDemo,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
