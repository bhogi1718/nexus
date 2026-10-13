// The only crypto interface the app uses. It owns this device's identity, one
// session per peer, the trust-on-first-use record for each peer's identity key,
// and a cache of decrypted text (a message key is destroyed once used, so the
// plaintext must be kept to show it again).
import { keysAPI } from '../services/keys';
import { createIdentity, initiateX3DH, respondX3DH } from './x3dh';
import { initiatorState, responderState, ratchetEncrypt, ratchetDecrypt } from './doubleRatchet';
import {
  encodeEnvelope,
  decodeEnvelope,
  authenticatedPart,
  KIND_INITIAL,
  KIND_MESSAGE,
} from './envelope';
import { hmac, toHex, utf8, equalBytes } from './primitives';
import {
  loadIdentity,
  saveIdentity,
  loadSession,
  saveSession,
  deleteSession,
  loadPin,
  savePin,
  loadPlaintext,
  savePlaintext,
  wipeAll,
} from './store';

const LOW_WATER_MARK = 10;
const subtle = globalThis.crypto.subtle;

// One operation at a time per peer, so concurrent sends can't interleave ratchet steps.
const queues = new Map();
const serial = (peerId, task) => {
  const prev = queues.get(peerId) || Promise.resolve();
  const next = prev.catch(() => {}).then(task);
  queues.set(peerId, next);
  return next;
};

const sha256Hex = async (text) => toHex(new Uint8Array(await subtle.digest('SHA-256', utf8(text))));

const sameKey = (a, b) => a && b && equalBytes(a, b);

let identityPromise = null;

/** This device's identity. Created (and its public half uploaded) on first use. */
export const ensureIdentity = () => {
  if (!identityPromise) {
    identityPromise = (async () => {
      const existing = await loadIdentity();
      if (existing) return existing;
      const identity = createIdentity();
      await keysAPI.publishBundle(identity.publicBundle);
      await saveIdentity(identity);
      return identity;
    })();
    identityPromise.catch(() => { identityPromise = null; });
  }
  return identityPromise;
};

/** Tops up one-time prekeys so people can always start a chat with this device. */
export const replenishPreKeys = async () => {
  const identity = await ensureIdentity();
  const { data } = await keysAPI.preKeyCount();
  if (data.count >= LOW_WATER_MARK) return;
  const fresh = createIdentity(20).oneTimePreKeys;
  await keysAPI.addOneTimePreKeys(fresh.map(k => ({ keyId: k.keyId, publicKey: k.publicKey })));
  identity.oneTimePreKeys = [...identity.oneTimePreKeys, ...fresh];
  await saveIdentity(identity);
};

/** Forgets this device's identity and sessions. Call on sign-out. */
export const wipe = async () => {
  identityPromise = null;
  queues.clear();
  await wipeAll();
};

// --- trust --------------------------------------------------------------------

/** Remembers a peer's identity key the first time it's seen. Returns whether it changed since. */
const pinIdentity = async (peerId, identityKeyDh) => {
  const pin = await loadPin(peerId);
  if (!pin) {
    await savePin(peerId, { identityKeyDh, changed: false });
    return { changed: false };
  }
  if (sameKey(pin.identityKeyDh, identityKeyDh)) return { changed: pin.changed };
  const updated = { ...pin, changed: true, newIdentityKeyDh: identityKeyDh };
  await savePin(peerId, updated);
  return { changed: true };
};

/** Whether a peer's identity key has changed since it was first seen. */
export const identityChanged = async (peerId) => Boolean((await loadPin(peerId))?.changed);

/** Accepts a changed identity key after the user has checked the safety number. */
export const acceptNewIdentity = async (peerId) => {
  const pin = await loadPin(peerId);
  if (!pin?.changed) return;
  await savePin(peerId, { identityKeyDh: pin.newIdentityKeyDh, changed: false });
  await deleteSession(peerId);
};

// --- safety numbers -----------------------------------------------------------

/** Five-digit groups for a 60-digit comparison code, identical on both devices. */
export const safetyNumber = async (myIdentityKeyDh, theirIdentityKeyDh) => {
  const [a, b] = [myIdentityKeyDh, theirIdentityKeyDh]
    .map(k => toHex(k))
    .sort();
  const digest = new Uint8Array(await subtle.digest('SHA-512', utf8(`${a}|${b}`)));
  const digits = Array.from(digest.slice(0, 30), (byte) => String(byte % 100).padStart(2, '0')).join('');
  return digits.match(/.{1,5}/g).join(' ');
};

// --- sessions -----------------------------------------------------------------

const establishSession = async (peerId) => {
  const identity = await ensureIdentity();
  const { data } = await keysAPI.fetchBundle(peerId);
  const bundle = data.bundle;
  const initial = await initiateX3DH(identity, bundle);
  const state = await initiatorState(initial.sharedSecret, bundle.signedPreKey.publicKey);

  await pinIdentity(peerId, bundle.identityKeyDh);
  const session = {
    state,
    role: 'initiator',
    confirmed: false,
    initial: {
      identityKeyDh: identity.identityDh.publicKey,
      ephemeralPublicKey: initial.ephemeralPublicKey,
      signedPreKeyId: initial.signedPreKeyId,
      oneTimePreKeyId: initial.oneTimePreKeyId,
    },
    peerIdentityKeyDh: bundle.identityKeyDh,
  };
  await saveSession(peerId, session);
  return session;
};

/**
 * Encrypts text for a peer. The first message of a session carries the X3DH
 * header; later messages are plain ratchet messages.
 */
export const encryptFor = (peerId, plaintext) => serial(peerId, async () => {
  let session = await loadSession(peerId);
  if (!session) session = await establishSession(peerId);

  const { next, header, nonce, ciphertext, authKey } = await ratchetEncrypt(
    session.state,
    utf8(plaintext)
  );
  const kind = session.confirmed ? KIND_MESSAGE : KIND_INITIAL;
  const parts = { kind, initial: session.initial, header, nonce, ciphertext };
  const tag = await hmac(authKey, authenticatedPart(parts));
  const envelope = encodeEnvelope({ ...parts, tag });

  await saveSession(peerId, { ...session, state: next });
  await savePlaintext(await sha256Hex(envelope), plaintext);
  return envelope;
});

const acceptInitial = async (peerId, parsed) => {
  const identity = await ensureIdentity();
  const spkId = parsed.initial.signedPreKeyId;
  if (spkId !== identity.signedPreKey.keyId) {
    throw new Error('This message was sent using a prekey this device no longer has');
  }

  const opkIndex = parsed.initial.oneTimePreKeyId == null
    ? -1
    : identity.oneTimePreKeys.findIndex(k => k.keyId === parsed.initial.oneTimePreKeyId);
  if (parsed.initial.oneTimePreKeyId != null && opkIndex < 0) {
    throw new Error('This message used a one-time prekey that was already consumed');
  }
  const oneTimePreKey = opkIndex >= 0 ? identity.oneTimePreKeys[opkIndex] : null;

  const sharedSecret = await respondX3DH(
    { identity, signedPreKey: identity.signedPreKey, oneTimePreKey },
    parsed.initial
  );
  // The one-time prekey is single-use: delete it before anything else can fail.
  if (opkIndex >= 0) {
    identity.oneTimePreKeys.splice(opkIndex, 1);
    await saveIdentity(identity);
  }

  const state = responderState(sharedSecret, identity.signedPreKey);
  return {
    state,
    role: 'responder',
    peerIdentityKeyDh: parsed.initial.identityKeyDh,
    initialEphemeralKey: parsed.initial.ephemeralPublicKey,
  };
};

/**
 * Decrypts an incoming message from a peer. Returns the text, or throws if it
 * can't be opened by this device (wrong keys, tampering, or already consumed).
 */
export const decryptFrom = (peerId, envelopeText) => serial(peerId, async () => {
  const digest = await sha256Hex(envelopeText);
  const cached = await loadPlaintext(digest);
  if (cached !== undefined) return cached;

  const parsed = decodeEnvelope(envelopeText);
  if (!parsed) throw new Error('Not an encrypted message');

  let session = await loadSession(peerId);
  if (parsed.kind === KIND_INITIAL) {
    // The same first message can arrive several times before the peer hears from
    // us; its one-time key is already spent, so it must go to the existing session.
    const isRepeat = session?.role === 'responder'
      && sameKey(session.initialEphemeralKey, parsed.initial.ephemeralPublicKey);
    const incomingIsWinner = await tieBreakIsIncoming(peerId, session, parsed);
    if (!isRepeat && (!session || session.confirmed || incomingIsWinner)) {
      const accepted = await acceptInitial(peerId, parsed);
      session = {
        state: accepted.state,
        role: accepted.role,
        confirmed: true,
        peerIdentityKeyDh: accepted.peerIdentityKeyDh,
        initialEphemeralKey: accepted.initialEphemeralKey,
      };
      await pinIdentity(peerId, accepted.peerIdentityKeyDh);
    }
  }
  if (!session) throw new Error('No session with this person yet');

  const { plaintext, state } = await ratchetDecrypt(session.state, {
    header: parsed.header,
    nonce: parsed.nonce,
    ciphertext: parsed.ciphertext,
    tag: parsed.tag,
    authenticated: parsed.authenticated,
  });
  const text = new TextDecoder().decode(plaintext);
  await saveSession(peerId, { ...session, state, confirmed: true });
  await savePlaintext(digest, text);
  return text;
});

// Two people who start chatting at the same moment each create a session. Both
// sides agree on one: the one started by the lower identity key wins.
const tieBreakIsIncoming = async (peerId, session, parsed) => {
  if (!session || session.role !== 'initiator' || session.confirmed) return false;
  const identity = await ensureIdentity();
  const mine = toHex(identity.identityDh.publicKey);
  const theirs = toHex(parsed.initial.identityKeyDh);
  return theirs < mine;
};
