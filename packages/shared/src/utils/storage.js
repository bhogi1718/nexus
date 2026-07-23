/**
 * Storage Adapter Interface
 *
 * Different platforms need different storage:
 * - Web: localStorage (sync)
 * - Mobile Native: AsyncStorage (async)
 * - Desktop: electron-store (async)
 *
 * This abstraction allows shared code to work everywhere.
 */

/**
 * @typedef {Object} StorageAdapter
 * @property {Function} getItem(key: string): Promise<string|null>
 * @property {Function} setItem(key: string, value: string): Promise<void>
 * @property {Function} removeItem(key: string): Promise<void>
 * @property {Function} clear(): Promise<void>
 */

/**
 * Web Storage Adapter (localStorage)
 * Used by browser-based frontends (desktop web, mobile web)
 */
export const createWebStorageAdapter = () => ({
  async getItem(key) {
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    localStorage.removeItem(key);
  },
  async clear() {
    localStorage.clear();
  }
});

/**
 * Native Storage Adapter (AsyncStorage)
 * Used by React Native mobile app
 *
 * Usage:
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * const adapter = createNativeStorageAdapter(AsyncStorage);
 */
export const createNativeStorageAdapter = (AsyncStorage) => ({
  async getItem(key) {
    return await AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
  },
  async clear() {
    await AsyncStorage.clear();
  }
});

/**
 * Secure Storage Adapter
 * Used by React Native for sensitive data (tokens, keys)
 *
 * Usage:
 * import * as SecureStore from 'expo-secure-store';
 * const adapter = createSecureStorageAdapter(SecureStore);
 */
export const createSecureStorageAdapter = (SecureStore) => ({
  async getItem(key) {
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
  async clear() {
    // Note: SecureStore doesn't have built-in clear
    // Apps should implement this by deleting known keys
    console.warn('SecureStore.clear() not implemented - delete keys individually');
  }
});

/**
 * In-Memory Storage Adapter (for testing)
 */
export const createMemoryStorageAdapter = () => {
  const store = new Map();

  return {
    async getItem(key) {
      return store.get(key) || null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
    async clear() {
      store.clear();
    }
  };
};

// Export the web adapter as default for browser usage
export default createWebStorageAdapter();
