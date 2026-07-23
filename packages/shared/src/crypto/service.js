import nacl from 'tweetnacl';

/**
 * Crypto Service for End-to-End Encryption
 *
 * Uses TweetNaCl (libsodium.js port) for:
 * - X25519 key exchange
 * - XSalsa20 symmetric encryption
 *
 * @param {Object} config - Configuration
 * @param {Object} config.storageAdapter - Storage adapter for persisting keys
 * @returns {Object} Crypto service methods
 */
export const createCryptoService = (config) => {
  const { storageAdapter } = config;

  if (!storageAdapter) {
    throw new Error('storageAdapter is required');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // ===== Encoding Helpers =====

  const uint8ArrayToBase64 = (array) => {
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
  };

  const base64ToUint8Array = (base64) => {
    const binary = atob(base64);
    const result = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i);
    }
    return result;
  };

  return {
    /**
     * Generate a new keypair for the user
     * @returns {Object} { publicKey, secretKey } as base64 strings
     */
    generateKeypair() {
      const keyPair = nacl.box.keyPair();
      return {
        publicKey: uint8ArrayToBase64(keyPair.publicKey),
        secretKey: uint8ArrayToBase64(keyPair.secretKey)
      };
    },

    /**
     * Encrypt a message for a recipient
     *
     * @param {string} message - The plaintext message
     * @param {string} recipientPublicKey - Recipient's public key (base64)
     * @param {string} userSecretKey - Sender's secret key (base64)
     * @returns {string} Encrypted message (base64)
     */
    encryptMessage(message, recipientPublicKey, userSecretKey) {
      try {
        // Decode keys from base64
        const publicKeyUint8 = base64ToUint8Array(recipientPublicKey);
        const secretKeyUint8 = base64ToUint8Array(userSecretKey);

        // Generate nonce (24 random bytes)
        const nonce = nacl.randomBytes(24);

        // Encrypt message
        const messageUint8 = encoder.encode(message);
        const encrypted = nacl.box(messageUint8, nonce, publicKeyUint8, secretKeyUint8);

        // Combine nonce + encrypted message
        const fullMessage = new Uint8Array(nonce.length + encrypted.length);
        fullMessage.set(nonce);
        fullMessage.set(encrypted, nonce.length);

        // Encode as base64
        return uint8ArrayToBase64(fullMessage);
      } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt message');
      }
    },

    /**
     * Decrypt a message from a sender
     *
     * @param {string} encryptedMessage - Encrypted message (base64)
     * @param {string} senderPublicKey - Sender's public key (base64)
     * @param {string} userSecretKey - Recipient's secret key (base64)
     * @returns {string} Decrypted plaintext message
     */
    decryptMessage(encryptedMessage, senderPublicKey, userSecretKey) {
      try {
        // Decode keys from base64
        const publicKeyUint8 = base64ToUint8Array(senderPublicKey);
        const secretKeyUint8 = base64ToUint8Array(userSecretKey);

        // Decode encrypted message from base64
        const fullMessageUint8 = base64ToUint8Array(encryptedMessage);

        // Extract nonce (first 24 bytes) and encrypted content (rest)
        const nonce = fullMessageUint8.slice(0, 24);
        const encrypted = fullMessageUint8.slice(24);

        // Decrypt using box.open
        const decrypted = nacl.box.open(encrypted, nonce, publicKeyUint8, secretKeyUint8);

        if (!decrypted) {
          throw new Error('Decryption failed - invalid nonce or keys');
        }

        return decoder.decode(decrypted);
      } catch (error) {
        throw error;
      }
    },

    /**
     * Store encryption keys securely
     *
     * @param {string} publicKey - User's public key
     * @param {string} secretKey - User's secret key
     * @returns {Promise<void>}
     */
    async storeKeys(publicKey, secretKey) {
      await storageAdapter.setItem('user_publicKey', publicKey);
      await storageAdapter.setItem('user_secretKey', secretKey);
    },

    /**
     * Retrieve stored encryption keys
     *
     * @returns {Promise<Object>} { publicKey, secretKey }
     */
    async getKeys() {
      const publicKey = await storageAdapter.getItem('user_publicKey');
      const secretKey = await storageAdapter.getItem('user_secretKey');
      return { publicKey, secretKey };
    },

    /**
     * Clear stored encryption keys (on logout)
     *
     * @returns {Promise<void>}
     */
    async clearKeys() {
      await storageAdapter.removeItem('user_publicKey');
      await storageAdapter.removeItem('user_secretKey');
    }
  };
};

export default createCryptoService;
