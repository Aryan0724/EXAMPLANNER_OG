
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
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const role = Cookies.get('user-role') as 'admin' | 'user' | null;
    setUserRole(role);
    setLoading(false);
  }, []);
  
  const isAuthenticated = !!userRole;

  const login = (role: 'admin' | 'user') => {
    const token = 'fake-auth-token'; // In a real app, this would come from a server
    Cookies.set('auth-token', token, { expires: 1 });
    Cookies.set('user-role', role, { expires: 1 });
    setUserRole(role);
    // Use a hard redirect to ensure the middleware re-evaluates the cookie
    window.location.href = '/';
  };

  const logout = () => {
    Cookies.remove('auth-token');
    Cookies.remove('user-role');
    setUserRole(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, logout, loading }}>
      {children}
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
