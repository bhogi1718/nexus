import { describe, it, expect } from 'vitest';
import { newVaultKey, seal, unseal, isSealed } from '../vault';

describe('vault', () => {
  it('round-trips key material including byte arrays', async () => {
    const key = await newVaultKey();
    const value = { priv: new Uint8Array([1, 2, 3, 255]), nested: { list: [new Uint8Array([9])], n: 5 }, text: 'hi' };
    const sealed = await seal(key, value);
    expect(isSealed(sealed)).toBe(true);
    const back = await unseal(key, sealed);
    expect(back.priv).toBeInstanceOf(Uint8Array);
    expect([...back.priv]).toEqual([1, 2, 3, 255]);
    expect([...back.nested.list[0]]).toEqual([9]);
    expect(back.text).toBe('hi');
  });

  it('hides the plaintext and rejects tampering or another key', async () => {
    const key = await newVaultKey();
    const sealed = await seal(key, 'secret-message');
    expect(new TextDecoder().decode(sealed.ct)).not.toContain('secret-message');

    const tampered = { ...sealed, ct: sealed.ct.slice() };
    tampered.ct[0] ^= 1;
    await expect(unseal(key, tampered)).rejects.toThrow();
    await expect(unseal(await newVaultKey(), sealed)).rejects.toThrow();
  });

  it('does not treat legacy plaintext records as sealed', () => {
    expect(isSealed({ ownerId: 'a', identityDh: {} })).toBe(false);
    expect(isSealed('some text')).toBe(false);
    expect(isSealed(undefined)).toBe(false);
  });
});
