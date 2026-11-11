import { describe, it, expect } from 'vitest';
import {
  sealAttachment,
  openAttachment,
  encodeDescriptor,
  decodeDescriptor,
  CHUNK_BYTES,
} from '../attachment';
import { randomBytes, toHex } from '../primitives';

// Deterministic filler: cheap to build at multi-megabyte sizes.
const pattern = (n) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) & 0xff);

describe('attachment sealing', () => {
  it('round-trips files of awkward sizes', () => {
    for (const size of [0, 1, CHUNK_BYTES - 1, CHUNK_BYTES, CHUNK_BYTES + 1, 2 * CHUNK_BYTES + 123]) {
      const file = pattern(size);
      const { key, sealed } = sealAttachment(file);
      expect(toHex(openAttachment(sealed, key))).toBe(toHex(file));
    }
  });

  it('does not contain the plaintext', () => {
    const file = new TextEncoder().encode('a very recognisable secret sentence '.repeat(50));
    const { sealed } = sealAttachment(file);
    expect(new TextDecoder().decode(sealed)).not.toContain('recognisable');
  });

  it('uses a fresh key and nonce every time', () => {
    const file = pattern(64);
    const a = sealAttachment(file);
    const b = sealAttachment(file);
    expect(toHex(a.key)).not.toBe(toHex(b.key));
    expect(toHex(a.sealed)).not.toBe(toHex(b.sealed));
  });

  it('rejects the wrong key', () => {
    const { sealed } = sealAttachment(pattern(100));
    expect(() => openAttachment(sealed, randomBytes(32))).toThrow();
  });

  it('rejects a flipped bit anywhere', () => {
    const { key, sealed } = sealAttachment(pattern(CHUNK_BYTES + 500));
    for (const at of [0, 20, CHUNK_BYTES, sealed.length - 1]) {
      const tampered = sealed.slice();
      tampered[at] ^= 1;
      expect(() => openAttachment(tampered, key)).toThrow();
    }
  });

  it('rejects a file cut short at a chunk boundary', () => {
    const { key, sealed } = sealAttachment(pattern(2 * CHUNK_BYTES));
    const firstChunkOnly = sealed.slice(0, 16 + CHUNK_BYTES + 16);
    expect(() => openAttachment(firstChunkOnly, key)).toThrow();
  });

  it('rejects swapped chunks', () => {
    const { key, sealed } = sealAttachment(pattern(3 * CHUNK_BYTES));
    const box = CHUNK_BYTES + 16;
    const swapped = sealed.slice();
    swapped.set(sealed.subarray(16 + box, 16 + 2 * box), 16);
    swapped.set(sealed.subarray(16, 16 + box), 16 + box);
    expect(() => openAttachment(swapped, key)).toThrow();
  });

  it('rejects input too short to be sealed', () => {
    expect(() => openAttachment(new Uint8Array(10), randomBytes(32))).toThrow();
  });
});

describe('attachment descriptor', () => {
  const key = randomBytes(32);

  it('round-trips the key and file details', () => {
    const text = encodeDescriptor({ key, name: 'holiday.jpg', size: 1234, mime: 'image/jpeg', type: 'image' });
    const d = decodeDescriptor(text);
    expect(toHex(d.key)).toBe(toHex(key));
    expect(d).toMatchObject({ name: 'holiday.jpg', size: 1234, mime: 'image/jpeg', type: 'image' });
  });

  it('ignores ordinary message text', () => {
    expect(decodeDescriptor('hello')).toBeNull();
    expect(decodeDescriptor('{"some":"json"}')).toBeNull();
    expect(decodeDescriptor(undefined)).toBeNull();
  });

  it('rejects a descriptor with a malformed key', () => {
    expect(decodeDescriptor('{"t":"nexus.attachment","v":1,"k":"AAAA","name":"x"}')).toBeNull();
    expect(decodeDescriptor('{"t":"nexus.attachment","v":1,"k":"***","name":"x"}')).toBeNull();
  });

  it('falls back to safe values for unknown fields', () => {
    const text = encodeDescriptor({ key, name: '', size: -5, mime: 42, type: 'script' });
    expect(decodeDescriptor(text)).toMatchObject({ name: 'file', size: null, mime: '', type: 'document' });
  });
});
