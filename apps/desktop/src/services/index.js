/**
 * Desktop Services
 *
 * Re-exports from @nexus/shared using web adapters
 * This is the single source of truth for all services in the desktop app
 */

import {
  createWebStorageAdapter,
  createViteConfigAdapter,
  createWebNavigationAdapter,
  createApiClient,
  createAuthService as createAuthServiceBase,
  createSocketWrapper,
  createCryptoService,
  createChatService
} from '@nexus/shared';

// Setup web-specific adapters
const storageAdapter = createWebStorageAdapter();
const configAdapter = createViteConfigAdapter();
const navigationAdapter = createWebNavigationAdapter();

// Create API client with web adapters
export const apiClient = createApiClient({
  apiUrl: configAdapter.getApiUrl(),
  storageAdapter,
  navigationAdapter
});

// Create Socket.IO wrapper
export const socketWrapper = createSocketWrapper({
  socketUrl: configAdapter.getSocketUrl(),
  getToken: async () => await storageAdapter.getItem('accessToken')
});

// Create crypto service
export const cryptoService = createCryptoService({
  storageAdapter
});

// Create chat service
export const chatService = createChatService({
  apiClient
});

// Create auth service (with socket integration)
export const createAuthService = (onLogout) => {
  return createAuthServiceBase({
    apiClient,
    storageAdapter,
    socketWrapper,
    onLogout
  });
};

// Export adapters for advanced use (if needed)
export { storageAdapter, configAdapter, navigationAdapter };
