// Double Ratchet (Signal specification, section 3), pure state transitions.
// Every function takes a state and returns a new one, so a failed decrypt can
// never leave a half-advanced chain behind.
import {
  dhKeyPair,
  dh,
  hkdf,
  hmac,
  seal,
  open,
  randomBytes,
  concat,
  equalBytes,
  toHex,
} from './primitives';

export const MAX_SKIP = 1000;
export const MAX_SKIPPED_KEYS = 2000;

const ZERO_SALT = new Uint8Array(32);
const RATCHET_INFO = new TextEncoder().encode('NexusRatchet');
const MESSAGE_INFO = new TextEncoder().encode('NexusMessageKeys');


const u32 = (n) => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
export const readU32 = (bytes, offset) =>
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;

// KDF_RK: new root key and chain key from the current root and a DH output.
const kdfRoot = async (rk, dhOut) => {
  const out = await hkdf(dhOut, rk, RATCHET_INFO, 64);
  return { rk: out.slice(0, 32), ck: out.slice(32, 64) };
};

// KDF_CK: next chain key and the message key for this step.
const kdfChain = async (ck) => ({
  mk: await hmac(ck, new Uint8Array([0x01])),
  nextCk: await hmac(ck, new Uint8Array([0x02])),
});

// Expands a message key into the cipher key, nonce and header-authentication key.
const expandMessageKey = async (mk) => {
  const out = await hkdf(mk, ZERO_SALT, MESSAGE_INFO, 88);
  return { encKey: out.slice(0, 32), nonce: out.slice(32, 56), authKey: out.slice(56, 88) };
};

/** State for the side that sent the first message (it knows the peer's signed prekey). */
export const initiatorState = async (sharedSecret, peerRatchetPublicKey) => {
  const dhs = dhKeyPair();
  const { rk, ck } = await kdfRoot(sharedSecret, dh(dhs.privateKey, peerRatchetPublicKey));
  return {
    rk,
    cks: ck,
    ckr: null,
    dhs,
    dhr: peerRatchetPublicKey,
    ns: 0,
    nr: 0,
    pn: 0,
    skipped: [],
  };
};

/** State for the side that received the first message (its signed prekey is the first ratchet key). */
export const responderState = (sharedSecret, ownRatchetKeyPair) => ({
  rk: sharedSecret,
  cks: null,
  ckr: null,
  dhs: ownRatchetKeyPair,
  dhr: null,
  ns: 0,
  nr: 0,
  pn: 0,
  skipped: [],
});

/**
 * Encrypts one message. Returns the header, nonce and ciphertext that make up
 * the body, plus the next state. The caller adds the tag, which covers its own
 * envelope prefix as well.
 */
export const ratchetEncrypt = async (state, plaintext) => {
  if (!state.cks) throw new Error('Session is not ready to send yet');
  const { mk, nextCk } = await kdfChain(state.cks);
  const { encKey, authKey } = await expandMessageKey(mk);

  const header = concat(state.dhs.publicKey, u32(state.pn), u32(state.ns));
  const nonceBytes = randomBytes(24);
  const ciphertext = seal(plaintext, nonceBytes, encKey);

  const next = { ...state, cks: nextCk, ns: state.ns + 1 };
  return { next, header, nonce: nonceBytes, ciphertext, authKey };
};

const skipMessageKeys = async (state, until) => {
  if (state.nr + MAX_SKIP < until) throw new Error('Too many skipped messages');
  if (!state.ckr) return state;
  let { ckr, nr } = state;
  const skipped = [...state.skipped];
  while (nr < until) {
    const { mk, nextCk } = await kdfChain(ckr);
    skipped.push({ dhr: toHex(state.dhr), n: nr, mk });
    ckr = nextCk;
    nr += 1;
  }
  while (skipped.length > MAX_SKIPPED_KEYS) skipped.shift();
  return { ...state, ckr, nr, skipped };
};

const dhRatchetStep = async (state, newDhr) => {
  const pn = state.ns;
  let next = { ...state, pn, ns: 0, nr: 0 };
  next = { ...next, dhr: newDhr };
  const recv = await kdfRoot(next.rk, dh(next.dhs.privateKey, newDhr));
  const dhs = dhKeyPair();
  const send = await kdfRoot(recv.rk, dh(dhs.privateKey, newDhr));
  return { ...next, rk: send.rk, ckr: recv.ck, cks: send.ck, dhs };
};

/**
 * Decrypts one ratchet message. Throws if the authentication tag doesn't verify,
 * in which case the input state is untouched.
 */
export const ratchetDecrypt = async (state, { header, nonce, ciphertext, tag, authenticated }) => {
  const dhr = header.slice(0, 32);
  const pn = readU32(header, 32);
  const n = readU32(header, 36);

  // A message from a skipped key is decrypted with that key, and only then removed.
  const skippedIdx = state.skipped.findIndex(s => s.dhr === toHex(dhr) && s.n === n);
  if (skippedIdx >= 0) {
    const { mk } = state.skipped[skippedIdx];
    const { encKey, authKey } = await expandMessageKey(mk);
    if (!equalBytes(await hmac(authKey, authenticated), tag)) throw new Error('Message authentication failed');
    const plaintext = open(ciphertext, nonce, encKey);
    if (!plaintext) throw new Error('Message authentication failed');
    const skipped = state.skipped.filter((_, i) => i !== skippedIdx);
    return { plaintext, state: { ...state, skipped } };
  }

  let working = state;
  if (!state.dhr || !equalBytes(dhr, state.dhr)) {
    working = await skipMessageKeys({ ...state, ckr: state.ckr }, pn);
    working = await dhRatchetStep(working, dhr);
  }
  working = await skipMessageKeys(working, n);
  if (!working.ckr) throw new Error('No receiving chain');

  const { mk, nextCk } = await kdfChain(working.ckr);
  const { encKey, authKey } = await expandMessageKey(mk);
  if (!equalBytes(await hmac(authKey, authenticated), tag)) throw new Error('Message authentication failed');
  const plaintext = open(ciphertext, nonce, encKey);
  if (!plaintext) throw new Error('Message authentication failed');

  return {
    plaintext,
    state: { ...working, ckr: nextCk, nr: working.nr + 1 },
  };
};
