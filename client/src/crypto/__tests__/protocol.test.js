import { describe, it, expect } from 'vitest';
import { createIdentity, toPublicBundle, initiateX3DH, respondX3DH } from '../x3dh';
import { initiatorState, responderState, ratchetEncrypt, ratchetDecrypt, MAX_SKIP } from '../doubleRatchet';
import { authenticatedPart, encodeEnvelope, decodeEnvelope, KIND_INITIAL, KIND_MESSAGE } from '../envelope';
import { hmac, utf8, toHex } from '../primitives';

const text = (b) => new TextDecoder().decode(b);

// Sets up two devices that have completed X3DH, returns their starting states.
const handshake = async ({ withOneTimeKey = true } = {}) => {
  const alice = createIdentity();
  const bob = createIdentity();
  const bundle = toPublicBundle(bob);
  const opk = withOneTimeKey ? bob.oneTimePreKeys[0] : null;
  const peer = { ...bundle, oneTimePreKey: opk ? { keyId: opk.keyId, publicKey: opk.publicKey } : null };

  const a = await initiateX3DH(alice, peer);
  const b = await respondX3DH(
    { identity: bob, signedPreKey: bob.signedPreKey, oneTimePreKey: opk },
    { identityKeyDh: alice.identityDh.publicKey, ephemeralPublicKey: a.ephemeralPublicKey }
  );
  expect(toHex(a.sharedSecret)).toBe(toHex(b));
  return {
    aliceState: await initiatorState(a.sharedSecret, bob.signedPreKey.publicKey),
    bobState: responderState(b, bob.signedPreKey),
  };
};

// Encrypts and tags a message the way the session manager does.
const seal = async (state, plaintext) => {
  const enc = await ratchetEncrypt(state, utf8(plaintext));
  const parts = { kind: KIND_MESSAGE, initial: null, header: enc.header, nonce: enc.nonce, ciphertext: enc.ciphertext };
  const tag = await hmac(enc.authKey, authenticatedPart(parts));
  const wire = encodeEnvelope({ ...parts, tag });
  return { next: enc.next, wire };
};

const open = async (state, wire) => {
  const parsed = decodeEnvelope(wire);
  return ratchetDecrypt(state, {
    header: parsed.header,
    nonce: parsed.nonce,
    ciphertext: parsed.ciphertext,
    tag: parsed.tag,
    authenticated: parsed.authenticated,
  });
};

describe('X3DH', () => {
  it('agrees on the same secret with a one-time prekey', async () => {
    await expect(handshake({ withOneTimeKey: true })).resolves.toBeDefined();
  });
  it('agrees on the same secret without a one-time prekey', async () => {
    await expect(handshake({ withOneTimeKey: false })).resolves.toBeDefined();
  });
  it('rejects a signed prekey whose signature does not match', async () => {
    const alice = createIdentity();
    const bob = createIdentity();
    const bundle = toPublicBundle(bob);
    const forged = { ...bundle, signedPreKey: { ...bundle.signedPreKey, signature: new Uint8Array(64) } };
    await expect(initiateX3DH(alice, { ...forged, oneTimePreKey: null })).rejects.toThrow('signature');
  });
});

describe('Double Ratchet', () => {
  it('handles a long back-and-forth conversation', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    for (let i = 0; i < 50; i++) {
      const sent = await seal(a, `alice ${i}`);
      const got = await open(b, sent.wire);
      expect(text(got.plaintext)).toBe(`alice ${i}`);
      a = sent.next;
      b = got.state;

      const reply = await seal(b, `bob ${i}`);
      const back = await open(a, reply.wire);
      expect(text(back.plaintext)).toBe(`bob ${i}`);
      b = reply.next;
      a = back.state;
    }
  });

  it('delivers a burst in one direction', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    const wires = [];
    for (let i = 0; i < 20; i++) {
      const s = await seal(a, `m${i}`);
      wires.push(s.wire);
      a = s.next;
    }
    for (let i = 0; i < 20; i++) {
      const got = await open(b, wires[i]);
      expect(text(got.plaintext)).toBe(`m${i}`);
      b = got.state;
    }
  });

  it('decrypts out-of-order messages using stored skipped keys', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    const wires = [];
    for (let i = 0; i < 5; i++) {
      const s = await seal(a, `m${i}`);
      wires.push(s.wire);
      a = s.next;
    }
    // Deliver 3, then 0, 4, 1, 2.
    const order = [3, 0, 4, 1, 2];
    for (const i of order) {
      const got = await open(b, wires[i]);
      expect(text(got.plaintext)).toBe(`m${i}`);
      b = got.state;
    }
    expect(b.skipped.length).toBe(0);
  });

  it('refuses to skip more messages than the limit allows', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    let far = null;
    for (let i = 0; i <= MAX_SKIP + 1; i++) {
      const s = await seal(a, 'x');
      far = s.wire;
      a = s.next;
    }
    await expect(open(b, far)).rejects.toThrow('Too many skipped messages');
  });

  it('rejects a tampered header and leaves the state untouched', async () => {
    const { aliceState: a, bobState: b } = await handshake();
    const sent = await seal(a, 'hello');
    const bytes = Uint8Array.from(atob(sent.wire), c => c.charCodeAt(0));
    bytes[4 + 40 - 1] ^= 0x01; // flip a bit in the message number
    const tampered = btoa(String.fromCharCode(...bytes));
    const before = JSON.stringify([...b.skipped]) + b.nr;
    await expect(open(b, tampered)).rejects.toThrow();
    expect(JSON.stringify([...b.skipped]) + b.nr).toBe(before);
    // The genuine message still opens afterwards.
    expect(text((await open(b, sent.wire)).plaintext)).toBe('hello');
  });

  it('rejects a replayed message', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    const sent = await seal(a, 'once');
    const first = await open(b, sent.wire);
    await expect(open(first.state, sent.wire)).rejects.toThrow();
  });

  it('forgets a message key once it has been used (forward secrecy)', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    const s1 = await seal(a, 'first');
    const s2 = await seal(s1.next, 'second');
    const r1 = await open(b, s1.wire);
    const r2 = await open(r1.state, s2.wire);
    // Holding today's receiving state cannot re-read a message already processed.
    await expect(open(r2.state, s1.wire)).rejects.toThrow();
  });

  it('a state snapshot cannot read messages after the conversation has turned around', async () => {
    let { aliceState: a, bobState: b } = await handshake();
    const stolen = a; // the attacker copies Alice's device state here
    const s1 = await seal(a, 'before');
    const r1 = await open(b, s1.wire);
    b = r1.state;
    const reply = await seal(b, 'bob replies');
    const ra = await open(s1.next, reply.wire);
    const after = await seal(ra.state, 'after the turn');
    // The stolen snapshot has the old DH ratchet key, so it cannot follow the new chain.
    await expect(open(stolen, after.wire)).rejects.toThrow();
  });
});

describe('envelope', () => {
  it('round trips an initial message', async () => {
    const alice = createIdentity();
    const bob = createIdentity();
    const a = await initiateX3DH(alice, { ...toPublicBundle(bob), oneTimePreKey: null });
    const state = await initiatorState(a.sharedSecret, bob.signedPreKey.publicKey);
    const enc = await ratchetEncrypt(state, utf8('hi'));
    const parts = {
      kind: KIND_INITIAL,
      initial: {
        identityKeyDh: alice.identityDh.publicKey,
        ephemeralPublicKey: a.ephemeralPublicKey,
        signedPreKeyId: a.signedPreKeyId,
        oneTimePreKeyId: null,
      },
      header: enc.header,
      nonce: enc.nonce,
      ciphertext: enc.ciphertext,
    };
    const wire = encodeEnvelope({ ...parts, tag: await hmac(enc.authKey, authenticatedPart(parts)) });
    const parsed = decodeEnvelope(wire);
    expect(parsed.kind).toBe(KIND_INITIAL);
    expect(toHex(parsed.initial.identityKeyDh)).toBe(toHex(alice.identityDh.publicKey));
    expect(parsed.initial.oneTimePreKeyId).toBeNull();
  });

  it('refuses things that are not envelopes', () => {
    expect(decodeEnvelope('hello world')).toBeNull();
    expect(decodeEnvelope('')).toBeNull();
    expect(decodeEnvelope(undefined)).toBeNull();
    expect(decodeEnvelope(btoa('NXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'))).toBeNull();
  });
});
