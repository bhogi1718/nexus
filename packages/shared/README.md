# @nexus/shared

Shared business logic and utilities for Nexus desktop and mobile frontends.

**No UI components.** This package contains only:
- API client with authentication
- Socket.IO real-time wrapper
- Crypto service (E2E encryption)
- Chat service (high-level API)
- Auth service (token + state management)
- Platform adapters (storage, config, navigation)

## Installation

```bash
npm install @nexus/shared
```

## Quick Start

### Web (Desktop/Browser)

```javascript
import {
  createWebStorageAdapter,
  createViteConfigAdapter,
  createWebNavigationAdapter,
  createApiClient,
  createAuthService,
  createSocketWrapper,
  createCryptoService,
  createChatService
} from '@nexus/shared';

// Setup adapters
const storageAdapter = createWebStorageAdapter();
const configAdapter = createViteConfigAdapter();
const navigationAdapter = createWebNavigationAdapter();

// Create API client
const apiClient = createApiClient({
  apiUrl: configAdapter.getApiUrl(),
  storageAdapter,
  navigationAdapter
});

// Create auth service
const authService = createAuthService({
  apiClient,
  storageAdapter
});

// Create socket wrapper
const socketWrapper = createSocketWrapper({
  socketUrl: configAdapter.getSocketUrl(),
  getToken: () => storageAdapter.getItem('accessToken')
});

// Create crypto service
const cryptoService = createCryptoService({ storageAdapter });

// Create chat service
const chatService = createChatService({ apiClient });

// Use it
const user = await authService.login({ email, password });
socketWrapper.initialize();
const conversations = await chatService.getConversations();
```

### React Native (Mobile)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  createNativeStorageAdapter,
  createSecureStorageAdapter,
  createEnvConfigAdapter,
  createReactNavigationAdapter,
  createApiClient,
  createAuthService,
  createSocketWrapper,
  createCryptoService,
  createChatService
} from '@nexus/shared';

// Setup adapters
const storageAdapter = createNativeStorageAdapter(AsyncStorage);
const secureStorageAdapter = createSecureStorageAdapter(SecureStore);
const configAdapter = createEnvConfigAdapter(process.env);
const navigationAdapter = createReactNavigationAdapter(navigation);

// Create services (same as web)
const apiClient = createApiClient({
  apiUrl: configAdapter.getApiUrl(),
  storageAdapter,
  navigationAdapter
});

// ... rest is identical
```

## API Reference

### Adapters

Adapters abstract platform-specific APIs so shared code works everywhere.

#### Storage Adapter
```javascript
createWebStorageAdapter()           // localStorage
createNativeStorageAdapter(AsyncStorage)  // React Native
createSecureStorageAdapter(SecureStore)   // Secure storage
createMemoryStorageAdapter()        // In-memory (testing)
```

#### Config Adapter
```javascript
createViteConfigAdapter()           // Vite (browser)
createEnvConfigAdapter(process.env) // Environment variables
createCustomConfigAdapter({...})    // Custom config
```

#### Navigation Adapter
```javascript
createWebNavigationAdapter()        // window.location
createReactNavigationAdapter(nav)   // React Navigation
createReactRouterAdapter(router)    // React Router
createCallbackNavigationAdapter({}) // Custom callbacks
```

### Services

#### API Client
```javascript
const apiClient = createApiClient({
  apiUrl: 'https://api.nexus.com',
  storageAdapter,
  navigationAdapter
});

// All requests automatically include Bearer token
const response = await apiClient.get('/chat/conversations');
```

#### Auth Service
```javascript
const authService = createAuthService({
  apiClient,
  storageAdapter,
  socketWrapper, // optional
  onLogout: () => {} // optional callback
});

await authService.register({ name, email, password });
await authService.login({ email, password });
await authService.logout();
const user = await authService.getProfile();
```

#### Chat Service
```javascript
const chatService = createChatService({ apiClient });

const conversations = await chatService.getConversations();
const messages = await chatService.getMessages(conversationId);
await chatService.sendMessage(conversationId, content);
const contacts = await chatService.getContacts();
await chatService.addContact(email);
```

#### Socket.IO Wrapper
```javascript
const socketWrapper = createSocketWrapper({
  socketUrl: 'https://nexus.com',
  getToken: () => storageAdapter.getItem('accessToken')
});

socketWrapper.initialize();
socketWrapper.joinConversation(conversationId);
await socketWrapper.sendMessage(conversationId, content);

socketWrapper.onMessageReceive((message) => {
  console.log('New message:', message);
});

socketWrapper.startTyping(conversationId);
socketWrapper.stopTyping(conversationId);

socketWrapper.disconnect();
```

#### Crypto Service
```javascript
const cryptoService = createCryptoService({ storageAdapter });

const { publicKey, secretKey } = cryptoService.generateKeypair();
await cryptoService.storeKeys(publicKey, secretKey);

const encrypted = cryptoService.encryptMessage(
  'Hello',
  recipientPublicKey,
  userSecretKey
);
const decrypted = cryptoService.decryptMessage(
  encrypted,
  senderPublicKey,
  userSecretKey
);
```

## Architecture

```
packages/shared/
├── src/
│   ├── api/
│   │   ├── client.js        (Axios with interceptors)
│   │   ├── authApi.js       (Auth endpoints)
│   │   ├── chatApi.js       (Chat endpoints)
│   │   └── index.js
│   │
│   ├── socket/
│   │   ├── wrapper.js       (Socket.IO wrapper)
│   │   └── index.js
│   │
│   ├── auth/
│   │   ├── service.js       (Auth state management)
│   │   └── index.js
│   │
│   ├── crypto/
│   │   ├── service.js       (E2E encryption)
│   │   └── index.js
│   │
│   ├── chat/
│   │   ├── service.js       (Chat operations)
│   │   └── index.js
│   │
│   ├── utils/
│   │   ├── storage.js       (Storage adapters)
│   │   ├── config.js        (Config adapters)
│   │   ├── navigation.js    (Navigation adapters)
│   │   └── index.js
│   │
│   ├── types/
│   │   └── index.js         (JSDoc type definitions)
│   │
│   └── index.js             (Main exports)
│
└── package.json
```

## Dependencies

- `axios` - HTTP client
- `socket.io-client` - WebSocket client
- `tweetnacl` - E2E encryption

## No UI

This package contains **zero UI components**. All UI is in the frontend apps:
- `apps/desktop/` - Desktop React app
- `apps/mobile/` - Mobile React Native app

## Cross-Platform Compatibility

Each frontend implements the platform-specific adapters and passes them to shared services:

- **Desktop Web:** Uses Vite env, localStorage, window.location
- **Mobile React Native:** Uses env vars, AsyncStorage, React Navigation
- **Desktop Electron:** Would use electron-store, electron routing
- **Any other platform:** Implement custom adapters and plug in

## Testing

Create memory adapters for testing:

```javascript
import { createMemoryStorageAdapter } from '@nexus/shared';

const storageAdapter = createMemoryStorageAdapter();
const authService = createAuthService({ apiClient, storageAdapter });
```

## License

Proprietary - Nexus Messenger
