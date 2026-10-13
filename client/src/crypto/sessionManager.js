// The only crypto interface the app uses. It owns this device's identity, one
// session per peer, the trust-on-first-use record for each peer's identity key,
// and a cache of decrypted text (a message key is destroyed once used, so the
// plaintext must be kept to show a message again).
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
import { hmac, toHex, utf8, equalBytes, toBase64, fromBase64 } from './primitives';
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
  loadFlag,
  saveFlag,
  wipeAll,
} from './store';

const LOW_WATER_MARK = 10;
const REFILL_BATCH = 20;
const subtle = globalThis.crypto.subtle;

export class EncryptionUnavailableError extends Error {}

// One operation at a time per peer, so concurrent sends and receives can't
// interleave ratchet steps and lose state.
const queues = new Map();
const serial = (peerId, task) => {
  const prev = queues.get(peerId) || Promise.resolve();
  const next = prev.catch(() => {}).then(task);
  queues.set(peerId, next);
  return next;
};

const sha256Hex = async (text) => toHex(new Uint8Array(await subtle.digest('SHA-256', utf8(text))));
const sameKey = (a, b) => Boolean(a && b && equalBytes(a, b));

// --- wire format for keys (the API speaks base64) -------------------------------

const encodeBundle = (bundle) => ({
  identityKeyDh: toBase64(bundle.identityKeyDh),
  identityKeySig: toBase64(bundle.identityKeySig),
  signedPreKey: {
    keyId: bundle.signedPreKey.keyId,
    publicKey: toBase64(bundle.signedPreKey.publicKey),
    signature: toBase64(bundle.signedPreKey.signature),
  },
  oneTimePreKeys: bundle.oneTimePreKeys.map(k => ({ keyId: k.keyId, publicKey: toBase64(k.publicKey) })),
});

const decodePeerBundle = (b) => ({
  identityKeyDh: fromBase64(b.identityKeyDh),
  identityKeySig: fromBase64(b.identityKeySig),
  signedPreKey: {
    keyId: b.signedPreKey.keyId,
    publicKey: fromBase64(b.signedPreKey.publicKey),
    signature: fromBase64(b.signedPreKey.signature),
  },
  oneTimePreKey: b.oneTimePreKey
    ? { keyId: b.oneTimePreKey.keyId, publicKey: fromBase64(b.oneTimePreKey.publicKey) }
    : null,
});

// --- identity -------------------------------------------------------------------

let currentUserId = null;
let identityPromise = null;

/**
 * Ties the key store to the signed-in account. If the store holds another
 * account's keys (a sign-out that never wiped), they are destroyed first.
 */
export const bindUser = async (userId) => {
  currentUserId = String(userId);
  const existing = await loadIdentity();
  if (existing && existing.ownerId !== currentUserId) {
    await wipe();
    currentUserId = String(userId);
  }
};

const publish = async (identity) => {
  await keysAPI.publishBundle(encodeBundle({
    identityKeyDh: identity.identityDh.publicKey,
    identityKeySig: identity.identitySig.publicKey,
    signedPreKey: identity.signedPreKey,
    oneTimePreKeys: identity.oneTimePreKeys,
  }));
  identity.published = true;
  await saveIdentity(identity);
};

/**
 * This device's identity, created on first use. It is saved locally *before*
 * being published, so the server can never advertise keys this device lacks.
 */
export const ensureIdentity = () => {
  if (!currentUserId) return Promise.reject(new Error('No signed-in user'));
  if (!identityPromise) {
    identityPromise = (async () => {
      let identity = await loadIdentity();
      if (!identity) {
        const fresh = createIdentity();
        identity = {
          ownerId: currentUserId,
          identityDh: fresh.identityDh,
          identitySig: fresh.identitySig,
          signedPreKey: fresh.signedPreKey,
          oneTimePreKeys: fresh.oneTimePreKeys,
          published: false,
        };
        await saveIdentity(identity);
      }
      if (!identity.published) await publish(identity);
      return identity;
    })();
    identityPromise.catch(() => { identityPromise = null; });
  }
  return identityPromise;
};

/** This device's public identity key, for safety numbers. */
export const myIdentityKey = async () => (await ensureIdentity()).identityDh.publicKey;

/**
 * Makes sure the server advertises *this* device's keys. Signing in elsewhere
 * replaces them (one active device per account), so the device being used
 * re-publishes when it notices.
 */
export const syncPublishedIdentity = async (serverIdentityKeyDh) => {
  const identity = await ensureIdentity();
  const local = toBase64(identity.identityDh.publicKey);
  if (serverIdentityKeyDh && serverIdentityKeyDh === local) return;
  await publish(identity);
};

/** Tops up one-time prekeys so people can always start a chat with this device. */
export const replenishPreKeys = async () => {
  const identity = await ensureIdentity();
  const { data } = await keysAPI.preKeyCount();
  if (data.count >= LOW_WATER_MARK) return;
  const fresh = createIdentity(REFILL_BATCH).oneTimePreKeys;
  // Saved first: a key the server hands out must always have its private half here.
  identity.oneTimePreKeys = [...identity.oneTimePreKeys, ...fresh];
  await saveIdentity(identity);
  await keysAPI.addOneTimePreKeys(fresh.map(k => ({ keyId: k.keyId, publicKey: toBase64(k.publicKey) })));
};

/** Forgets this device's identity, sessions and decrypted history. Call on sign-out. */
export const wipe = async () => {
  identityPromise = null;
  currentUserId = null;
  queues.clear();
  await wipeAll();
};

// --- trust on first use ---------------------------------------------------------

const pinIdentity = async (peerId, identityKeyDh) => {
  const pin = await loadPin(peerId);
  if (!pin) {
    await savePin(peerId, { identityKeyDh, changed: false });
    return false;
  }
  if (sameKey(pin.identityKeyDh, identityKeyDh)) return pin.changed;
  await savePin(peerId, { ...pin, changed: true, newIdentityKeyDh: identityKeyDh });
  return true;
};

/**
 * Compares a peer's currently advertised identity key with the one we have a
 * session for. A difference means they moved to a new device (or someone is
 * impersonating them): the old session is dropped and the change is flagged.
 */
export const syncPeerIdentity = (peerId, identityKeyDhBase64) => serial(peerId, async () => {
  if (!identityKeyDhBase64) return { changed: false };
  const advertised = fromBase64(identityKeyDhBase64);
  const session = await loadSession(peerId);
  if (session && !sameKey(session.peerIdentityKeyDh, advertised)) await deleteSession(peerId);
  return { changed: await pinIdentity(peerId, advertised) };
});

/** Whether a peer's identity key changed since it was first seen and not yet accepted. */
export const identityChanged = async (peerId) => Boolean((await loadPin(peerId))?.changed);

/** The user has checked the new safety number: trust the new key from now on. */
export const acceptNewIdentity = async (peerId) => {
  const pin = await loadPin(peerId);
  if (!pin?.changed) return;
  await savePin(peerId, { identityKeyDh: pin.newIdentityKeyDh, changed: false });
};

/** 60-digit code (12 groups of 5), identical on both devices, for out-of-band comparison. */
export const safetyNumber = async (theirIdentityKeyDhBase64) => {
  const mine = toHex(await myIdentityKey());
  const theirs = toHex(fromBase64(theirIdentityKeyDhBase64));
  const [a, b] = [mine, theirs].sort();
  const digest = new Uint8Array(await subtle.digest('SHA-512', utf8(`nexus-safety|${a}|${b}`)));
  // Each group is a 40-bit chunk reduced mod 100000, as Signal does.
  return Array.from({ length: 12 }, (_, i) => {
    const chunk = digest.slice(i * 5, i * 5 + 5).reduce((acc, byte) => acc * 256 + byte, 0);
    return String(chunk % 100000).padStart(5, '0');
  });
};

// --- sessions -------------------------------------------------------------------

const establishSession = async (peerId) => {
  const identity = await ensureIdentity();
  let response;
  try {
    response = await keysAPI.fetchBundle(peerId);
  } catch (err) {
    if (err.response?.status === 404) {
      throw new EncryptionUnavailableError(
        err.response.data?.message || 'This person has not set up encryption yet'
      );
    }
    throw err;
  }
  const bundle = decodePeerBundle(response.data.bundle);
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
 * Encrypts text for a peer. Until the peer has replied, every message carries the
 * X3DH header so whichever one arrives first can open the session.
 */
export const encryptFor = (peerId, plaintext) => serial(peerId, async () => {
  let session = await loadSession(peerId);
  if (!session) session = await establishSession(peerId);

  const { next, header, nonce, ciphertext, authKey } = await ratchetEncrypt(session.state, utf8(plaintext));
  const kind = session.confirmed ? KIND_MESSAGE : KIND_INITIAL;
  const parts = { kind, initial: session.initial, header, nonce, ciphertext };
  const tag = await hmac(authKey, authenticatedPart(parts));
  const envelope = encodeEnvelope({ ...parts, tag });

  await saveSession(peerId, { ...session, state: next });
  // Our own copy can never be decrypted again (the message key is gone), so keep it.
  await savePlaintext(await sha256Hex(envelope), plaintext);
  return envelope;
});

/** Plaintext for an envelope this device already opened or sent, if any. */
export const cachedPlaintext = async (envelopeText) => loadPlaintext(await sha256Hex(envelopeText));

const acceptInitial = async (parsed) => {
  const identity = await ensureIdentity();

  // Each first message may open a session once. Without this, replaying an old
  // first message (one that used no one-time key) would reset a working session.
  const seenKey = `initial:${toHex(parsed.initial.ephemeralPublicKey)}`;
  if (await loadFlag(seenKey)) throw new Error('This message was already used to start a session');

  if (parsed.initial.signedPreKeyId !== identity.signedPreKey.keyId) {
    throw new Error('This message was sent to keys this device no longer has');
  }

  const opkIndex = parsed.initial.oneTimePreKeyId == null
    ? -1
    : identity.oneTimePreKeys.findIndex(k => k.keyId === parsed.initial.oneTimePreKeyId);
  if (parsed.initial.oneTimePreKeyId != null && opkIndex < 0) {
    throw new Error('This message used a one-time key this device no longer has');
  }
  const oneTimePreKey = opkIndex >= 0 ? identity.oneTimePreKeys[opkIndex] : null;

  const sharedSecret = await respondX3DH(
    { identity, signedPreKey: identity.signedPreKey, oneTimePreKey },
    parsed.initial
  );
  return {
    state: responderState(sharedSecret, identity.signedPreKey),
    // Committed only after the first message actually decrypts.
    commit: async () => {
      if (opkIndex >= 0) {
        const fresh = await ensureIdentity();
        fresh.oneTimePreKeys = fresh.oneTimePreKeys.filter(k => k.keyId !== oneTimePreKey.keyId);
        await saveIdentity(fresh);
      }
      await saveFlag(seenKey);
    },
  };
};

// Two people who start chatting at the same moment each create a session. Both
// sides keep the one started by the lower identity key, so they agree. Messages
// that arrive on the losing session are still readable through `alternates`.
const MAX_ALTERNATES = 4;
const incomingWinsTie = async (session, parsed) => {
  if (!session || session.role !== 'initiator' || session.confirmed) return false;
  const mine = toHex((await ensureIdentity()).identityDh.publicKey);
  return toHex(parsed.initial.identityKeyDh) < mine;
};

/**
 * Decrypts a message *from* a peer. Throws if this device can't open it (sent to
 * another device, tampered with, or keys already consumed); no state changes then.
 */
export const decryptFrom = (peerId, envelopeText) => serial(peerId, async () => {
  const digest = await sha256Hex(envelopeText);
  const cached = await loadPlaintext(digest);
  if (cached !== undefined) return cached;

  const parsed = decodeEnvelope(envelopeText);
  if (!parsed) throw new Error('Not an encrypted message');

  let session = await loadSession(peerId);
  let pending = null;
  let alternateId = null; // set when this message belongs to a side session

  if (parsed.kind === KIND_INITIAL) {
    const ephemeral = toHex(parsed.initial.ephemeralPublicKey);
    // The same first message arrives repeatedly until we reply; it belongs to the
    // session it already opened.
    const isRepeat = session?.role === 'responder'
      && sameKey(session.initialEphemeralKey, parsed.initial.ephemeralPublicKey);
    if (!isRepeat && session?.alternates?.[ephemeral]) {
      alternateId = ephemeral;
    } else if (!isRepeat) {
      pending = await acceptInitial(parsed);
      const replaceSession = !session || session.confirmed || await incomingWinsTie(session, parsed);
      if (replaceSession) {
        session = {
          state: pending.state,
          role: 'responder',
          confirmed: true,
          peerIdentityKeyDh: parsed.initial.identityKeyDh,
          initialEphemeralKey: parsed.initial.ephemeralPublicKey,
        };
      } else {
        alternateId = ephemeral;
        session = { ...session, alternates: { ...(session.alternates || {}), [ephemeral]: pending.state } };
      }
    }
  }
  if (!session) throw new Error('No session with this person yet');

  const current = alternateId ? session.alternates[alternateId] : session.state;
  const { plaintext, state } = await ratchetDecrypt(current, {
    header: parsed.header,
    nonce: parsed.nonce,
    ciphertext: parsed.ciphertext,
    tag: parsed.tag,
    authenticated: parsed.authenticated,
  });
  const text = new TextDecoder().decode(plaintext);

  if (pending) {
    await pending.commit();
    await pinIdentity(peerId, parsed.initial.identityKeyDh);
  }
  if (alternateId) {
    const alternates = { ...session.alternates, [alternateId]: state };
    const ids = Object.keys(alternates);
    for (const id of ids.slice(0, Math.max(0, ids.length - MAX_ALTERNATES))) delete alternates[id];
    await saveSession(peerId, { ...session, alternates });
  } else {
    await saveSession(peerId, { ...session, state, confirmed: true });
  }
  await savePlaintext(digest, text);
  return text;
});
