import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'medicare_token';
const USER_KEY = 'medicare_user';
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

const normalizeUser = (userData = {}, profile = {}) => {
  return {
    ...userData,
    id: userData.id || userData._id,
    _id: userData._id || userData.id,
    name: userData.name || 'Patient User',
    email: userData.email || '',
    avatar: userData.avatar || FALLBACK_AVATAR,
    bloodGroup: profile.bloodGroup || userData.bloodGroup || 'Not provided',
    medicalID: userData.medicalID || '',
    phone: userData.phone || userData.emergencyContact || '',
  };
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profileResponse = await api.get('/auth/me', { requireAuth: true });
        const normalizedUser = normalizeUser(profileResponse.user, profileResponse.profile || {});
        setUser(normalizedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const persistSession = (token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setIsAuthenticated(true);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password }, { requireAuth: false });
    const nextUser = normalizeUser(response.user, {});
    persistSession(response.token, nextUser);
    return nextUser;
  };

  const register = async (userData) => {
    const payload = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone || userData.emergencyContact,
      role: userData.role || 'patient',
      ...(userData.role === 'doctor' ? { specialization: userData.specialization } : {}),
      ...(userData.role === 'hospital' ? { hospitalName: userData.hospitalName } : {}),
    };

    const response = await api.post('/auth/register', payload, { requireAuth: false });
    const nextUser = normalizeUser(response.user, {});
    persistSession(response.token, nextUser);
    return nextUser;
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await api.post('/auth/logout', {}, { requireAuth: true });
      } catch {
        // Ignore server-side logout errors and clear client session anyway.
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
