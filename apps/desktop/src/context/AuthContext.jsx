import React, { createContext, useState, useEffect } from 'react';
import { apiClient, cryptoService, socketWrapper, createAuthService as createAuthServiceFactory } from '../services';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [authService] = useState(() => createAuthServiceFactory(() => {
    // Logout callback - clear local state
    setAccessToken(null);
    setUser(null);
  }));

  useEffect(() => {
    const checkAuth = async () => {
      if (accessToken) {
        try {
          const userData = await authService.getProfile();
          setUser(userData);
          // Restore encryption keys from server
          if (userData.publicKey && userData.secretKey) {
            await cryptoService.storeKeys(userData.publicKey, userData.secretKey);
          }
          socketWrapper.initialize();
        } catch (error) {
          await authService.clear();
          setAccessToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [accessToken, authService]);

  const register = async (data) => {
    const result = await authService.register(data);
    await authService.storeTokens(result.accessToken, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
    socketWrapper.initialize();
    return result;
  };

  const login = async (data) => {
    const result = await authService.login(data);
    await authService.storeTokens(result.accessToken, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
    socketWrapper.initialize();
    return result;
  };

  // For OTP flows where the API call happens in the page component
  const loginWithToken = async (newAccessToken, newRefreshToken, newUser) => {
    await authService.storeTokens(newAccessToken, newRefreshToken);
    setAccessToken(newAccessToken);
    setUser(newUser);
    socketWrapper.initialize();
  };

  const logout = async () => {
    await authService.logout();
    socketWrapper.disconnect();
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, register, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
