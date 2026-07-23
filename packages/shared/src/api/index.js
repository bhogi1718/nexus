/**
 * API Module
 *
 * Exports:
 * - createApiClient() - Create axios instance with auth interceptors
 * - createAuthApi() - Auth API methods
 * - createChatApi() - Chat API methods
 */

export { createApiClient } from './client.js';
export { createAuthApi } from './authApi.js';
export { createChatApi } from './chatApi.js';
