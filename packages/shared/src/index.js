/**
 * Nexus Shared Package
 *
 * Business logic and utilities shared between desktop and mobile frontends
 *
 * Exports:
 * - API: createApiClient, createAuthApi, createChatApi
 * - Socket: createSocketWrapper
 * - Auth: createAuthService
 * - Crypto: createCryptoService
 * - Chat: createChatService
 * - Utils: Storage, Config, Navigation adapters
 * - Types: JSDoc type definitions
 */

// API exports
export {
  createApiClient,
  createAuthApi,
  createChatApi
} from './api/index.js';

// Socket exports
export { createSocketWrapper } from './socket/index.js';

// Auth exports
export { createAuthService } from './auth/index.js';

// Crypto exports
export { createCryptoService } from './crypto/index.js';

// Chat exports
export { createChatService } from './chat/index.js';

// Utils exports (adapters)
export {
  // Storage adapters
  createWebStorageAdapter,
  createNativeStorageAdapter,
  createSecureStorageAdapter,
  createMemoryStorageAdapter,
  webStorageAdapter,
  // Config adapters
  createViteConfigAdapter,
  createEnvConfigAdapter,
  createCustomConfigAdapter,
  viteConfig,
  // Navigation adapters
  createWebNavigationAdapter,
  createReactNavigationAdapter,
  createReactRouterAdapter,
  createCallbackNavigationAdapter,
  webNavigationAdapter
} from './utils/index.js';
