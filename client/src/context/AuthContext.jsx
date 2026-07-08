import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';
import { storeKeys } from '../services/cryptoService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          // Restore this user's encryption keys from the server so decryption
          // works after refresh, on new devices, and when switching accounts
          if (response.data.user.publicKey && response.data.user.secretKey) {
            storeKeys(response.data.user.publicKey, response.data.user.secretKey);
          }
          initializeSocket(token);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const register = async (data) => {
    const response = await authAPI.register(data);
    localStorage.setItem('token', response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    initializeSocket(response.data.token);
    return response.data;
  };

  const login = async (data) => {
    const response = await authAPI.login(data);
    localStorage.setItem('token', response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    initializeSocket(response.data.token);
    return response.data;
  };

  // For OTP flows where the API call happens in the page component
  const loginWithToken = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    initializeSocket(newToken);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log('Logout error:', error);
    }
    disconnectSocket();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, register, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
