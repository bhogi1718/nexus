import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL
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

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
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
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw Object.assign(new Error('No refresh token available'), { sessionEnded: true });
        }

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        processQueue(null, data.accessToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Only a rejected refresh token ends the session. A network blip while
        // refreshing must not throw away a session that is still valid.
        const status = err.response?.status;
        if (err.sessionEnded || status === 401 || status === 400) {
          endSession();
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// Clears everything tied to the signed-in account, including encryption keys,
// so nothing carries over to whoever signs in next on this browser.
const endSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user_publicKey');
  localStorage.removeItem('user_secretKey');
  if (!['/login', '/signup', '/'].includes(window.location.pathname)) {
    window.location.href = '/login';
  }
};

export const authAPI = {
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  updateSettings: (data) => api.patch('/auth/settings', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken })
};

export default api;
