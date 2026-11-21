// Device-local storage for key material and session state (IndexedDB). Nothing
// here is ever sent to the server. Identity keys, ratchet state and the cache of
// decrypted text are encrypted at rest (see vault.js); records written before
// that existed are read as-is and re-encrypted the next time they are saved.
import { createStore, get, set, del, clear, keys } from 'idb-keyval';
import { newVaultKey, isSealed, seal, unseal } from './vault';

const db = createStore('nexus-e2ee', 'v1');

let vaultKeyPromise = null;
const vaultKey = () => {
  if (!vaultKeyPromise) {
    vaultKeyPromise = (async () => {
      const existing = await get('vault-key', db);
      if (existing) return existing;
      const created = await newVaultKey();
      await set('vault-key', created, db);
      return created;
    })();
    vaultKeyPromise.catch(() => { vaultKeyPromise = null; });
  }
  return vaultKeyPromise;
};

const putSecret = async (name, value) => set(name, await seal(await vaultKey(), value), db);

const getSecret = async (name) => {
  const stored = await get(name, db);
  if (stored === undefined || !isSealed(stored)) {
    // Legacy plaintext record: upgrade it in place.
    if (stored !== undefined) await putSecret(name, stored);
    return stored;
  }
  return unseal(await vaultKey(), stored);
};

export const loadIdentity = () => getSecret('identity');
export const saveIdentity = (identity) => putSecret('identity', identity);

export const loadSession = (peerId) => getSecret(`session:${peerId}`);
export const saveSession = (peerId, session) => putSecret(`session:${peerId}`, session);
export const deleteSession = (peerId) => del(`session:${peerId}`, db);

// Public keys only, so these stay readable.
export const loadPin = (peerId) => get(`pin:${peerId}`, db);
export const savePin = (peerId, pin) => set(`pin:${peerId}`, pin, db);

export const loadPlaintext = (digest) => getSecret(`plain:${digest}`);
export const savePlaintext = (digest, text) => putSecret(`plain:${digest}`, text);

// One-shot markers (e.g. first messages that already opened a session).
export const loadFlag = async (name) => Boolean(await get(`flag:${name}`, db));
export const saveFlag = (name) => set(`flag:${name}`, true, db);

/** Removes every key and session on this device (used on sign-out). */
export const wipeAll = async () => {
  vaultKeyPromise = null;
  await clear(db);
};

export const allKeys = () => keys(db);
