/**
 * Auth API Service
 *
 * High-level authentication endpoints
 * Wraps the axios client with auth-specific methods
 *
 * @param {AxiosInstance} api - Configured axios client
 * @returns {Object} Auth API methods
 */
export const createAuthApi = (api) => ({
  /**
   * Register a new user
   * @param {Object} data - Registration data
   * @param {string} data.name - User name
   * @param {string} data.email - User email
   * @param {string} data.password - User password
   * @returns {Promise<Object>} { user, accessToken, refreshToken }
   */
  register: (data) => api.post('/auth/register', data),

  /**
   * Login with email and password
   * @param {Object} data - Login credentials
   * @param {string} data.email - User email
   * @param {string} data.password - User password
   * @returns {Promise<Object>} { user, accessToken, refreshToken }
   */
  login: (data) => api.post('/auth/login', data),

  /**
   * Logout (invalidates token on server)
   * @returns {Promise<void>}
   */
  logout: () => api.post('/auth/logout'),

  /**
   * Get current user profile
   * @returns {Promise<Object>} { user }
   */
  getProfile: () => api.get('/auth/profile'),

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token from localStorage
   * @returns {Promise<Object>} { accessToken, refreshToken }
   */
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken })
});

export default createAuthApi;
