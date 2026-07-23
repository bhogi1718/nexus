import nacl from 'tweetnacl';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Convert Uint8Array to base64 string (safe for binary data)
const uint8ArrayToBase64 = (array) => {
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
};

// Convert base64 string to Uint8Array
const base64ToUint8Array = (base64) => {
  const binary = atob(base64);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
};

// For key conversion (keys are already base64, just decode)
const base64ToUint8ArrayDirect = (base64String) => {
  return base64ToUint8Array(base64String);
};

/**
 * Generate a new keypair for the user
 * @returns {Object} { publicKey, secretKey } as base64 strings
 */
export const generateKeypair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: uint8ArrayToBase64(keyPair.publicKey),
    secretKey: uint8ArrayToBase64(keyPair.secretKey)
  };
};

/**
 * Encrypt a message for a recipient
 * @param {string} message - The plaintext message
 * @param {string} recipientPublicKey - Recipient's public key (base64)
 * @param {string} userSecretKey - Sender's secret key (base64)
 * @returns {string} Encrypted message (base64)
 */
export const encryptMessage = (message, recipientPublicKey, userSecretKey) => {
  try {
    // Decode keys from base64
    const publicKeyUint8 = base64ToUint8ArrayDirect(recipientPublicKey);
    const secretKeyUint8 = base64ToUint8ArrayDirect(userSecretKey);

    // Generate nonce (24 random bytes)
    const nonce = nacl.randomBytes(24);

    // Encrypt message
    const messageUint8 = encoder.encode(message);
    const encrypted = nacl.box(messageUint8, nonce, publicKeyUint8, secretKeyUint8);

    // Combine nonce + encrypted message and encode to base64
    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);

    // Encode the full message (nonce + encrypted) as base64
    return uint8ArrayToBase64(fullMessage);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt a message from a sender
 * @param {string} encryptedMessage - Encrypted message (base64)
 * @param {string} senderPublicKey - Sender's public key (base64)
 * @param {string} userSecretKey - Recipient's secret key (base64)
 * @returns {string} Decrypted plaintext message
 */
export const decryptMessage = (encryptedMessage, senderPublicKey, userSecretKey) => {
  try {
    // Decode keys from base64
    const publicKeyUint8 = base64ToUint8ArrayDirect(senderPublicKey);
    const secretKeyUint8 = base64ToUint8ArrayDirect(userSecretKey);

    // Decode encrypted message from base64
    const fullMessageUint8 = base64ToUint8Array(encryptedMessage);

    // Extract nonce (first 24 bytes) and encrypted content (rest)
    const nonce = fullMessageUint8.slice(0, 24);
    const encrypted = fullMessageUint8.slice(24);

    // The box shared key is symmetric, so this works with either
    // (senderPublic, recipientSecret) or (recipientPublic, senderSecret)
    const decrypted = nacl.box.open(encrypted, nonce, publicKeyUint8, secretKeyUint8);

    if (!decrypted) {
      throw new Error('Decryption failed - invalid nonce or keys');
    }

    return decoder.decode(decrypted);
  } catch (error) {
    throw error;
  }
};

/**
 * Store keys securely in localStorage
 * Note: In production, use secure storage like IndexedDB with encryption
 */
export const storeKeys = (publicKey, secretKey) => {
  localStorage.setItem('user_publicKey', publicKey);
  // WARNING: Storing secret key in localStorage is not ideal
  // In production, use more secure methods or prompt user for password
  localStorage.setItem('user_secretKey', secretKey);
};

/**
 * Retrieve keys from localStorage
 */
export const getKeys = () => {
  return {
    publicKey: localStorage.getItem('user_publicKey'),
    secretKey: localStorage.getItem('user_secretKey')
  };
};

/**
 * Clear keys from localStorage (on logout)
 */
export const clearKeys = () => {
  localStorage.removeItem('user_publicKey');
  localStorage.removeItem('user_secretKey');
};
