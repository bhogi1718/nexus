// Encrypts key material and session state before it is written to IndexedDB.
// The AES-GCM key is non-extractable: scripts can use it but cannot read its
// bytes, so a copy of the database files (backup, disk image, another OS user)
// is unreadable on its own. It does NOT stop code running inside this origin
// (that is what the CSP is for), and it is not a substitute for a passphrase.
const subtle = globalThis.crypto.subtle;

export const newVaultKey = () =>
  subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

const toB64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// JSON cannot carry bytes; tag them so they come back as Uint8Array.
const replacer = (_k, v) => (v instanceof Uint8Array ? { __u8: toB64(v) } : v);
const reviver = (_k, v) => (v && typeof v === 'object' && typeof v.__u8 === 'string' ? fromB64(v.__u8) : v);

/** True for a value written by `seal` (anything else is a legacy plaintext record). */
export const isSealed = (value) =>
  Boolean(value && typeof value === 'object' && value.v === 1 && value.iv instanceof Uint8Array && value.ct instanceof Uint8Array);

export const seal = async (key, value) => {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value, replacer));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return { v: 1, iv, ct };
};

export const unseal = async (key, sealed) => {
  const data = await subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, key, sealed.ct);
  return JSON.parse(new TextDecoder().decode(data), reviver);
};
