/**
 * Config Adapter Interface
 *
 * Different platforms have different configuration sources:
 * - Web (Vite): import.meta.env.VITE_*
 * - React Native: .env or process.env
 * - Desktop: env vars or config files
 *
 * This abstraction allows shared code to work everywhere.
 */

/**
 * @typedef {Object} ConfigAdapter
 * @property {Function} getApiUrl(): string
 * @property {Function} getSocketUrl(): string
 * @property {Function} getEnvironment(): 'development' | 'production'
 */

/**
 * Vite Browser Config Adapter
 * Used by browser-based frontends (desktop web, mobile web)
 *
 * Reads from import.meta.env at module load time
 */
export const createViteConfigAdapter = () => {
  // Capture env at import time (import.meta.env is only available at build time)
  const apiUrl = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
    : 'http://localhost:5000/api';

  const socketUrl = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000')
    : 'http://localhost:5000';

  const environment = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.MODE === 'production' ? 'production' : 'development')
    : 'development';

  return {
    getApiUrl() {
      return apiUrl;
    },
    getSocketUrl() {
      return socketUrl;
    },
    getEnvironment() {
      return environment;
    }
  };
};

/**
 * Environment Variables Config Adapter
 * Used by React Native and other apps that read from process.env
 *
 * Usage:
 * const config = createEnvConfigAdapter(process.env);
 */
export const createEnvConfigAdapter = (env = process.env) => ({
  getApiUrl() {
    return env.REACT_APP_API_URL || env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
  },
  getSocketUrl() {
    return env.REACT_APP_SOCKET_URL || env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  },
  getEnvironment() {
    const isProduction = env.NODE_ENV === 'production' || env.ENVIRONMENT === 'production';
    return isProduction ? 'production' : 'development';
  }
});

/**
 * Custom Config Adapter
 * Used for full control (e.g., reading from config files)
 *
 * Usage:
 * const config = createCustomConfigAdapter({
 *   apiUrl: 'https://api.nexus.com',
 *   socketUrl: 'https://nexus.com',
 *   environment: 'production'
 * });
 */
export const createCustomConfigAdapter = (config) => ({
  getApiUrl() {
    return config.apiUrl || 'http://localhost:5000/api';
  },
  getSocketUrl() {
    return config.socketUrl || 'http://localhost:5000';
  },
  getEnvironment() {
    return config.environment || 'development';
  }
});

// Export Vite adapter as default for browser usage
export default createViteConfigAdapter();
