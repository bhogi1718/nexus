import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Per-device preferences. Account-level privacy settings (read receipts, last
// seen) live on the server instead, because they change what other people see.
const DEFAULTS = {
  enterToSend: true,
  notifications: false,
  notificationPreview: true,
};

const STORAGE_KEY = 'nexus:preferences';

const load = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};

const PreferencesContext = createContext(null);

export const PreferencesProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(load);

  const setPreference = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable: keep the change for this session only
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, setPreference }), [prefs, setPreference]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
};
