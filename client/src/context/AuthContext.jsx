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
    let cancelled = false;

    const checkAuth = async (attempt = 0) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await authAPI.getProfile();
        if (cancelled) return;
        setUser(response.data.user);
        // Restore this user's encryption keys from the server so decryption
        // works after refresh, on new devices, and when switching accounts
        if (response.data.user.publicKey && response.data.user.secretKey) {
          storeKeys(response.data.user.publicKey, response.data.user.secretKey);
        }
        initializeSocket(accessToken);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        const status = error.response?.status;
        // Only a rejected session signs the user out.
        if (status === 401 || status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          clearKeys();
          setAccessToken(null);
          setLoading(false);
          return;
        }
        // A network blip or server hiccup during page load: keep the session and
        // retry briefly instead of bouncing the user to the login screen.
        if (attempt < 3) {
          setTimeout(() => checkAuth(attempt + 1), 1500 * (attempt + 1));
        } else {
          setLoading(false);
        }
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, [accessToken]);

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
    <AuthContext.Provider value={{ user, loading, accessToken, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
