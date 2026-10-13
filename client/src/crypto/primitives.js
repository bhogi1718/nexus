// The only module that touches raw crypto. Everything else calls these helpers.
// X25519 / Ed25519 / XSalsa20-Poly1305 come from TweetNaCl; HKDF and HMAC come
// from WebCrypto.
import nacl from 'tweetnacl';

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const KEY_BYTES = 32;

export const randomBytes = (n) => {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
};

export const concat = (...parts) => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

export const equalBytes = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

export const utf8 = (s) => encoder.encode(s);
export const fromUtf8 = (b) => decoder.decode(b);

export const toBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const fromBase64 = (b64) => {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

export const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

// --- X25519 ---------------------------------------------------------------

export const dhKeyPair = () => {
  const kp = nacl.box.keyPair();
  return { publicKey: kp.publicKey, privateKey: kp.secretKey };
};

export const dhKeyPairFromSeed = (seed) => {
  const kp = nacl.box.keyPair.fromSecretKey(seed);
  return { publicKey: kp.publicKey, privateKey: kp.secretKey };
};

export const dh = (privateKey, publicKey) => nacl.scalarMult(privateKey, publicKey);

// --- Ed25519 --------------------------------------------------------------

export const signKeyPair = () => {
  const kp = nacl.sign.keyPair();
  return { publicKey: kp.publicKey, privateKey: kp.secretKey };
};

export const sign = (message, privateKey) => nacl.sign.detached(message, privateKey);

export const verify = (message, signature, publicKey) =>
  nacl.sign.detached.verify(message, signature, publicKey);

// --- HKDF-SHA256 (RFC 5869) -----------------------------------------------

export const hkdf = async (ikm, salt, info, length) => {
  const key = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
};

// --- HMAC-SHA256 ----------------------------------------------------------

export const hmac = async (key, data) => {
  const k = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', k, data));
};

// --- Authenticated encryption ---------------------------------------------
// secretbox has no associated-data input, so authenticity over the header is
// provided by a separate HMAC tag that the caller computes.

export const seal = (plaintext, nonce, key) => nacl.secretbox(plaintext, nonce, key);

export const open = (ciphertext, nonce, key) => nacl.secretbox.open(ciphertext, nonce, key);
