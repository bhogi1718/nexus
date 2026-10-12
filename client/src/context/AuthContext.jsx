import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';
import { storeKeys, clearKeys } from '../services/cryptoService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));

  useEffect(() => {
    const checkAuth = async () => {
      if (accessToken) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          // Restore this user's encryption keys from the server so decryption
          // works after refresh, on new devices, and when switching accounts
          if (response.data.user.publicKey && response.data.user.secretKey) {
            storeKeys(response.data.user.publicKey, response.data.user.secretKey);
          }
          initializeSocket(accessToken);
        } catch (error) {
          // Only a rejected session should sign the user out. A network blip or
          // server hiccup during page load must not throw away valid tokens.
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setAccessToken(null);
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [accessToken]);

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { accessToken: newAccessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setAccessToken(newAccessToken);
    setUser(response.data.user);
    initializeSocket(newAccessToken);
    return response.data;
  };

  const login = async (data) => {
    const response = await authAPI.login(data);
    const { accessToken: newAccessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setAccessToken(newAccessToken);
    setUser(response.data.user);
    initializeSocket(newAccessToken);
    return response.data;
  };

  // For OTP flows where the API call happens in the page component
  const loginWithToken = (newAccessToken, newRefreshToken, newUser) => {
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setAccessToken(newAccessToken);
    setUser(newUser);
    initializeSocket(newAccessToken);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log('Logout error:', error);
    }
    disconnectSocket();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Keys must not survive logout, or they leak into the next account on a shared browser.
    clearKeys();
    setAccessToken(null);
    setUser(null);
  };

  const updateUser = (patch) => setUser(prev => (prev ? { ...prev, ...patch } : prev));

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, register, login, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
