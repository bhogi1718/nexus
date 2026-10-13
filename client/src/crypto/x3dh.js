// X3DH (Signal specification, section 3.3) and this device's key material.
import {
  dhKeyPair,
  dh,
  hkdf,
  sign,
  verify,
  signKeyPair,
  concat,
  randomBytes,
} from './primitives';

const PREFIX = new Uint8Array(32).fill(0xff);
const ZERO_SALT = new Uint8Array(32);
const INFO = new TextEncoder().encode('NexusX3DH');
export const ONE_TIME_PREKEY_BATCH = 20;

/**
 * Creates this device's identity: a long-term identity (X25519 for DH and Ed25519
 * for signing), a signed prekey and a batch of one-time prekeys. Secret parts stay
 * on the device; only `publicBundle` is uploaded.
 */
export const createIdentity = (oneTimeCount = ONE_TIME_PREKEY_BATCH) => {
  const identityDh = dhKeyPair();
  const identitySig = signKeyPair();
  const signedPreKey = { keyId: randomId(), ...dhKeyPair() };
  signedPreKey.signature = sign(signedPreKey.publicKey, identitySig.privateKey);
  const oneTimePreKeys = Array.from({ length: oneTimeCount }, () => ({ keyId: randomId(), ...dhKeyPair() }));
  return {
    identityDh,
    identitySig,
    signedPreKey,
    oneTimePreKeys,
    publicBundle: toPublicBundle({ identityDh, identitySig, signedPreKey, oneTimePreKeys }),
  };
};

const randomId = () => {
  // 31 bits so the id fits the signed 32-bit wire field and never collides with 0xFFFFFFFF.
  const b = randomBytes(4);
  return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 1;
};

export const toPublicBundle = ({ identityDh, identitySig, signedPreKey, oneTimePreKeys }) => ({
  identityKeyDh: identityDh.publicKey,
  identityKeySig: identitySig.publicKey,
  signedPreKey: {
    keyId: signedPreKey.keyId,
    publicKey: signedPreKey.publicKey,
    signature: signedPreKey.signature,
  },
  oneTimePreKeys: oneTimePreKeys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey })),
});

const deriveSecret = (dhOutputs) =>
  hkdf(concat(PREFIX, ...dhOutputs), ZERO_SALT, INFO, 32);

/**
 * Alice's side. `peer` is Bob's public bundle, as returned by the server. Throws
 * if Bob's signed prekey signature doesn't verify against his identity.
 */
export const initiateX3DH = async (identity, peer) => {
  const spk = peer.signedPreKey;
  if (!verify(spk.publicKey, spk.signature, peer.identityKeySig)) {
    throw new Error('Signed prekey signature is invalid');
  }

  const ek = dhKeyPair();
  const opk = peer.oneTimePreKey || null;
  const outputs = [
    dh(identity.identityDh.privateKey, spk.publicKey),
    dh(ek.privateKey, peer.identityKeyDh),
    dh(ek.privateKey, spk.publicKey),
  ];
  if (opk) outputs.push(dh(ek.privateKey, opk.publicKey));

  return {
    sharedSecret: await deriveSecret(outputs),
    ephemeralPublicKey: ek.publicKey,
    signedPreKeyId: spk.keyId,
    oneTimePreKeyId: opk ? opk.keyId : null,
  };
};

/**
 * Bob's side, given Alice's initial message. `oneTimePreKey` is the private half
 * of the one-time prekey Alice used, if any; the caller must delete it afterwards.
 */
export const respondX3DH = async ({ identity, signedPreKey, oneTimePreKey }, initial) => {
  const outputs = [
    dh(signedPreKey.privateKey, initial.identityKeyDh),
    dh(identity.identityDh.privateKey, initial.ephemeralPublicKey),
    dh(signedPreKey.privateKey, initial.ephemeralPublicKey),
  ];
  if (oneTimePreKey) outputs.push(dh(oneTimePreKey.privateKey, initial.ephemeralPublicKey));
  return deriveSecret(outputs);
};
