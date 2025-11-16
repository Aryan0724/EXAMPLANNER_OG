
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: 'admin' | 'user' | null;
  login: (role: 'admin' | 'user') => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('auth-token');
    const role = Cookies.get('user-role') as 'admin' | 'user' | null;

    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
    setLoading(false);
  }, []);

  const login = (role: 'admin' | 'user') => {
    const token = 'fake-auth-token'; // In a real app, this would come from a server
    Cookies.set('auth-token', token, { expires: 1 });
    Cookies.set('user-role', role, { expires: 1 });
    setIsAuthenticated(true);
    setUserRole(role);
    router.replace('/');
  };

  const logout = () => {
    Cookies.remove('auth-token');
    Cookies.remove('user-role');
    setIsAuthenticated(false);
    setUserRole(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
