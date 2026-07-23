/**
 * Auth Service
 *
 * Manages authentication state and token persistence
 * Uses storage adapter for cross-platform compatibility
 *
 * @param {Object} config - Configuration
 * @param {Object} config.apiClient - Configured axios instance
 * @param {Object} config.storageAdapter - Storage adapter
 * @param {Object} config.socketWrapper - Socket.IO wrapper
 * @param {Function} config.onLogout - Optional logout callback
 * @returns {Object} Auth service methods
 */
export const createAuthService = (config) => {
  const {
    apiClient,
    storageAdapter,
    socketWrapper,
    onLogout
  } = config;

  if (!apiClient) throw new Error('apiClient is required');
  if (!storageAdapter) throw new Error('storageAdapter is required');

  return {
    /**
     * Register new user
     *
     * @param {Object} data - Registration data
     * @param {string} data.name - User name
     * @param {string} data.email - User email
     * @param {string} data.password - User password
     * @returns {Promise<Object>} { user, accessToken, refreshToken }
     */
    async register(data) {
      const response = await apiClient.post('/auth/register', data);
      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      await storageAdapter.setItem('accessToken', accessToken);
      await storageAdapter.setItem('refreshToken', refreshToken);

      // Initialize socket if available
      if (socketWrapper) {
        socketWrapper.initialize();
      }

      return { user, accessToken, refreshToken };
    },

    /**
     * Login user
     *
     * @param {Object} data - Login credentials
     * @param {string} data.email - User email
     * @param {string} data.password - User password
     * @returns {Promise<Object>} { user, accessToken, refreshToken }
     */
    async login(data) {
      const response = await apiClient.post('/auth/login', data);
      const { user, accessToken, refreshToken } = response.data;

      // Store tokens
      await storageAdapter.setItem('accessToken', accessToken);
      await storageAdapter.setItem('refreshToken', refreshToken);

      // Initialize socket if available
      if (socketWrapper) {
        socketWrapper.initialize();
      }

      return { user, accessToken, refreshToken };
    },

    /**
     * Logout user
     *
     * @returns {Promise<void>}
     */
    async logout() {
      try {
        // Notify server
        await apiClient.post('/auth/logout');
      } catch (error) {
        console.log('Logout error:', error);
      }

      // Disconnect socket if available
      if (socketWrapper) {
        socketWrapper.disconnect();
      }

      // Clear tokens
      await storageAdapter.removeItem('accessToken');
      await storageAdapter.removeItem('refreshToken');

      // Call logout callback if provided
      onLogout?.();
    },

    /**
     * Get current user profile
     *
     * @returns {Promise<Object>} { user }
     */
    async getProfile() {
      const response = await apiClient.get('/auth/profile');
      return response.data.user;
    },

    /**
     * Get stored access token
     *
     * @returns {Promise<string|null>} Access token or null
     */
    async getAccessToken() {
      return await storageAdapter.getItem('accessToken');
    },

    /**
     * Get stored refresh token
     *
     * @returns {Promise<string|null>} Refresh token or null
     */
    async getRefreshToken() {
      return await storageAdapter.getItem('refreshToken');
    },

    /**
     * Store user tokens manually
     * Used when auth happens via OAuth or other flow
     *
     * @param {string} accessToken - Access token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<void>}
     */
    async storeTokens(accessToken, refreshToken) {
      await storageAdapter.setItem('accessToken', accessToken);
      await storageAdapter.setItem('refreshToken', refreshToken);

      // Initialize socket if available
      if (socketWrapper) {
        socketWrapper.initialize();
      }
    },

    /**
     * Clear all auth data
     *
     * @returns {Promise<void>}
     */
    async clear() {
      // Disconnect socket if available
      if (socketWrapper) {
        socketWrapper.disconnect();
      }

      // Clear tokens
      await storageAdapter.removeItem('accessToken');
      await storageAdapter.removeItem('refreshToken');
    }
  };
};

export default createAuthService;
