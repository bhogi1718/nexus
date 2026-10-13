import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';
import { bootstrap, wipe } from '../crypto/sessionManager';

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
        initializeSocket(accessToken);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        const status = error.response?.status;
        // Only a rejected session signs the user out.
        if (status === 401 || status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          await wipe();
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

  // Encryption identity for whoever is signed in. Failure is not fatal here:
  // the chat shows an error when a message can't be encrypted or opened.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    bootstrap(user).catch(err => console.error('Encryption setup failed:', err));
    // Only the account matters here, not profile edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
    await wipe();
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
