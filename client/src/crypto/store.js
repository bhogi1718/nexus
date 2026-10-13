// Device-local storage for key material and session state (IndexedDB). Nothing
// here is ever sent to the server.
import { createStore, get, set, del, clear, keys } from 'idb-keyval';

const db = createStore('nexus-e2ee', 'v1');

export const loadIdentity = () => get('identity', db);
export const saveIdentity = (identity) => set('identity', identity, db);

export const loadSession = (peerId) => get(`session:${peerId}`, db);
export const saveSession = (peerId, session) => set(`session:${peerId}`, session, db);
export const deleteSession = (peerId) => del(`session:${peerId}`, db);

export const loadPin = (peerId) => get(`pin:${peerId}`, db);
export const savePin = (peerId, pin) => set(`pin:${peerId}`, pin, db);

export const loadPlaintext = (digest) => get(`plain:${digest}`, db);
export const savePlaintext = (digest, text) => set(`plain:${digest}`, text, db);

// One-shot markers (e.g. first messages that already opened a session).
export const loadFlag = async (name) => Boolean(await get(`flag:${name}`, db));
export const saveFlag = (name) => set(`flag:${name}`, true, db);

/** Removes every key and session on this device (used on sign-out). */
export const wipeAll = async () => {
  await clear(db);
};

export const allKeys = () => keys(db);
