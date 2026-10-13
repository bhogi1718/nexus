import { describe, it, expect } from 'vitest';
import {
  dhKeyPairFromSeed,
  dh,
  hkdf,
  hmac,
  sign,
  verify,
  signKeyPair,
  toHex,
  utf8,
  seal,
  open,
  randomBytes,
} from '../primitives';

const hex = (s) => Uint8Array.from(s.match(/../g).map((b) => parseInt(b, 16)));

describe('X25519 (RFC 7748 section 6.1)', () => {
  it('produces the published public keys and shared secret', () => {
    const alice = dhKeyPairFromSeed(hex('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a'));
    const bob = dhKeyPairFromSeed(hex('5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb'));
    expect(toHex(alice.publicKey)).toBe('8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a');
    expect(toHex(bob.publicKey)).toBe('de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f');
    const shared = dh(alice.privateKey, bob.publicKey);
    expect(toHex(shared)).toBe('4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742');
    expect(toHex(dh(bob.privateKey, alice.publicKey))).toBe(toHex(shared));
  });
});

describe('Ed25519 (RFC 8032 test 1)', () => {
  const secret = hex('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60');
  const kp = { privateKey: new Uint8Array([...secret, ...hex('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a')]) };
  it('signs the empty message with the published signature', () => {
    const sig = sign(new Uint8Array(0), kp.privateKey);
    expect(toHex(sig)).toBe(
      'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
    );
  });
  it('verifies valid signatures and rejects tampered ones', () => {
    const { publicKey, privateKey } = signKeyPair();
    const msg = utf8('prekey');
    const sig = sign(msg, privateKey);
    expect(verify(msg, sig, publicKey)).toBe(true);
    expect(verify(utf8('prekeY'), sig, publicKey)).toBe(false);
  });
});

describe('HKDF-SHA256 (RFC 5869 test case 1)', () => {
  it('matches the published 42-byte output', async () => {
    const okm = await hkdf(
      hex('0b'.repeat(22)),
      hex('000102030405060708090a0b0c'),
      hex('f0f1f2f3f4f5f6f7f8f9'),
      42
    );
    expect(toHex(okm)).toBe(
      '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865'
    );
  });
});

describe('HMAC-SHA256 (RFC 4231 test case 1)', () => {
  it('matches the published tag', async () => {
    const tag = await hmac(hex('0b'.repeat(20)), utf8('Hi There'));
    expect(toHex(tag)).toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  });
});

describe('secretbox round trip', () => {
  it('opens what it sealed and rejects a wrong key', () => {
    const key = randomBytes(32);
    const nonce = randomBytes(24);
    const box = seal(utf8('hello'), nonce, key);
    expect(new TextDecoder().decode(open(box, nonce, key))).toBe('hello');
    expect(open(box, nonce, randomBytes(32))).toBeNull();
  });
});
