/**
 * Utils Module
 *
 * Exports adapters and helpers for cross-platform compatibility
 */

// Storage Adapters
export {
  createWebStorageAdapter,
  createNativeStorageAdapter,
  createSecureStorageAdapter,
  createMemoryStorageAdapter,
  default as webStorageAdapter
} from './storage.js';

// Config Adapters
export {
  createViteConfigAdapter,
  createEnvConfigAdapter,
  createCustomConfigAdapter,
  default as viteConfig
} from './config.js';

// Navigation Adapters
export {
  createWebNavigationAdapter,
  createReactNavigationAdapter,
  createReactRouterAdapter,
  createCallbackNavigationAdapter,
  default as webNavigationAdapter
} from './navigation.js';
