import axios from 'axios';

/**
 * Create Axios API Client with authentication interceptors
 *
 * Handles:
 * - Request: Adds Bearer token to Authorization header
 * - Response: Handles 401 with automatic token refresh
 * - Queue: Buffers failed requests during token refresh
 * - Logout: Redirects to login on refresh failure
 *
 * @param {Object} config - Configuration
 * @param {string} config.apiUrl - Base API URL
 * @param {Object} config.storageAdapter - Storage adapter for tokens
 * @param {Object} config.navigationAdapter - Navigation adapter for redirects
 * @returns {AxiosInstance} Configured axios instance
 */
export const createApiClient = (config) => {
  const {
    apiUrl,
    storageAdapter,
    navigationAdapter
  } = config;

  if (!apiUrl) {
    throw new Error('apiUrl is required');
  }
  if (!storageAdapter) {
    throw new Error('storageAdapter is required');
  }
  if (!navigationAdapter) {
    throw new Error('navigationAdapter is required');
  }

  const api = axios.create({
    baseURL: apiUrl
  });

  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    isRefreshing = false;
    failedQueue = [];
  };

  // Request interceptor: Add token to Authorization header
  api.interceptors.request.use(
    async (config) => {
      const accessToken = await storageAdapter.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: Handle 401 with token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await storageAdapter.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const { data } = await axios.post(`${apiUrl}/auth/refresh`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = data;
          await storageAdapter.setItem('accessToken', accessToken);
          await storageAdapter.setItem('refreshToken', newRefreshToken);

          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);
          return api(originalRequest);
        } catch (err) {
          processQueue(err, null);
          await storageAdapter.removeItem('accessToken');
          await storageAdapter.removeItem('refreshToken');
          navigationAdapter.redirectToLogin();
          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

export default createApiClient;
