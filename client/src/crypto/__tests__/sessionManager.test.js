// Two devices talking through a fake key server, each with its own key store.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The fake server stores what clients publish, exactly as base64 JSON.
let server;
let actingAs;
const resetServer = () => { server = new Map(); stores.clear(); };

vi.mock('../../services/keys', () => ({
  keysAPI: {
    publishBundle: async (bundle) => {
      server.set(actingAs, JSON.parse(JSON.stringify(bundle)));
      return { data: {} };
    },
    addOneTimePreKeys: async (keys) => {
      server.get(actingAs).oneTimePreKeys.push(...keys);
      return { data: {} };
    },
    preKeyCount: async () => ({ data: { count: server.get(actingAs)?.oneTimePreKeys.length || 0 } }),
    fetchBundle: async (userId) => {
      const b = server.get(userId);
      if (!b) {
        const err = new Error('not found');
        err.response = { status: 404, data: { message: 'This person has not set up encryption yet' } };
        throw err;
      }
      return {
        data: {
          bundle: {
            identityKeyDh: b.identityKeyDh,
            identityKeySig: b.identityKeySig,
            signedPreKey: b.signedPreKey,
            oneTimePreKey: b.oneTimePreKeys.shift() || null,
          },
        },
      };
    },
  },
}));

// One in-memory key store per user (whoever is acting at the moment).
const stores = new Map();
vi.mock('../store', () => {
  const db = () => {
    if (!stores.has(actingAs)) stores.set(actingAs, new Map());
    return stores.get(actingAs);
  };
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    loadIdentity: async () => clone(db().get('identity')),
    saveIdentity: async (v) => { db().set('identity', clone(v)); },
    loadSession: async (p) => clone(db().get(`s:${p}`)),
    saveSession: async (p, v) => { db().set(`s:${p}`, clone(v)); },
    deleteSession: async (p) => { db().delete(`s:${p}`); },
    loadPin: async (p) => clone(db().get(`pin:${p}`)),
    savePin: async (p, v) => { db().set(`pin:${p}`, clone(v)); },
    loadPlaintext: async (d) => db().get(`plain:${d}`),
    savePlaintext: async (d, t) => { db().set(`plain:${d}`, t); },
    loadFlag: async (n) => Boolean(db().get(`flag:${n}`)),
    saveFlag: async (n) => { db().set(`flag:${n}`, true); },
    wipeAll: async () => { db().clear(); },
    allKeys: async () => [...db().keys()],
  };
});

// Each device gets its own copy of the session manager (and its own store).
const device = async (userId) => {
  vi.resetModules();
  const sm = await import('../sessionManager');
  const as = async (fn) => { actingAs = userId; return fn(); };
  await as(() => sm.bindUser(userId));
  await as(() => sm.ensureIdentity());
  return {
    send: (to, text) => as(() => sm.encryptFor(to, text)),
    read: (from, envelope) => as(() => sm.decryptFrom(from, envelope)),
    sm,
    as,
  };
};

describe('session manager', () => {
  beforeEach(resetServer);

  it('publishes keys as base64 the server accepts', async () => {
    await device('alice');
    const b = server.get('alice');
    expect(typeof b.identityKeyDh).toBe('string');
    expect(atob(b.identityKeyDh)).toHaveLength(32);
    expect(atob(b.signedPreKey.signature)).toHaveLength(64);
    expect(b.oneTimePreKeys.length).toBeGreaterThan(0);
    expect(JSON.stringify(b)).not.toMatch(/privateKey/);
  });

  it('carries a conversation both ways', async () => {
    const alice = await device('alice');
    const bob = await device('bob');

    for (let i = 0; i < 3; i++) {
      const e = await alice.send('bob', `a${i}`);
      expect(await bob.read('alice', e)).toBe(`a${i}`);
    }
    for (let i = 0; i < 3; i++) {
      const e = await bob.send('alice', `b${i}`);
      expect(await alice.read('bob', e)).toBe(`b${i}`);
    }
    const e = await alice.send('bob', 'after reply');
    expect(await bob.read('alice', e)).toBe('after reply');
  });

  it('shows the same message again from the local cache', async () => {
    const alice = await device('alice');
    const bob = await device('bob');
    const e = await alice.send('bob', 'once');
    expect(await bob.read('alice', e)).toBe('once');
    expect(await bob.read('alice', e)).toBe('once');
    expect(await alice.as(() => alice.sm.cachedPlaintext(e))).toBe('once');
  });

  it('handles both people starting the chat at the same moment', async () => {
    const alice = await device('alice');
    const bob = await device('bob');
    const fromAlice = await alice.send('bob', 'hi bob');
    const fromBob = await bob.send('alice', 'hi alice');

    expect(await bob.read('alice', fromAlice)).toBe('hi bob');
    expect(await alice.read('bob', fromBob)).toBe('hi alice');

    // Both settle on one session and keep talking.
    for (let i = 0; i < 3; i++) {
      expect(await bob.read('alice', await alice.send('bob', `x${i}`))).toBe(`x${i}`);
      expect(await alice.read('bob', await bob.send('alice', `y${i}`))).toBe(`y${i}`);
    }
  });

  it('reads out-of-order first messages', async () => {
    const alice = await device('alice');
    const bob = await device('bob');
    const e1 = await alice.send('bob', 'one');
    const e2 = await alice.send('bob', 'two');
    expect(await bob.read('alice', e2)).toBe('two');
    expect(await bob.read('alice', e1)).toBe('one');
  });

  it('refuses a replayed first message once its plaintext is no longer cached', async () => {
    const alice = await device('alice');
    const bob = await device('bob');
    const first = await alice.send('bob', 'first');
    await bob.read('alice', first);
    await alice.read('bob', await bob.send('alice', 'reply'));
    await bob.read('alice', await alice.send('bob', 'later'));

    // Simulate an attacker replaying the first message after the cache entry is gone.
    for (const k of [...stores.get('bob').keys()]) if (k.startsWith('plain:')) stores.get('bob').delete(k);
    await expect(bob.read('alice', first)).rejects.toThrow();
    // The working session survives the replay attempt.
    expect(await bob.read('alice', await alice.send('bob', 'still fine'))).toBe('still fine');
  });

  it('flags a changed identity and starts a fresh session', async () => {
    const alice = await device('alice');
    const bob = await device('bob');
    await bob.read('alice', await alice.send('bob', 'hello'));

    // Bob reinstalls: new identity on the server.
    const bob2 = await device('bob');
    await bob2.as(() => bob2.sm.wipe());
    await bob2.as(() => bob2.sm.bindUser('bob'));
    await bob2.as(() => bob2.sm.ensureIdentity());

    const { changed } = await alice.as(() => alice.sm.syncPeerIdentity('bob', server.get('bob').identityKeyDh));
    expect(changed).toBe(true);
    expect(await alice.as(() => alice.sm.identityChanged('bob'))).toBe(true);

    expect(await bob2.read('alice', await alice.send('bob', 'to new device'))).toBe('to new device');
    await alice.as(() => alice.sm.acceptNewIdentity('bob'));
    expect(await alice.as(() => alice.sm.identityChanged('bob'))).toBe(false);
  });

  it('gives both sides the same safety number', async () => {
    const alice = await device('alice');
    const bob = await device('bob');
    const a = await alice.as(() => alice.sm.safetyNumber(server.get('bob').identityKeyDh));
    const b = await bob.as(() => bob.sm.safetyNumber(server.get('alice').identityKeyDh));
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
    a.forEach(g => expect(g).toMatch(/^\d{5}$/));
  });

  it('reports a peer without keys clearly', async () => {
    const alice = await device('alice');
    await expect(alice.send('carol', 'x')).rejects.toBeInstanceOf(alice.sm.EncryptionUnavailableError);
  });

  it('cannot read messages meant for another device', async () => {
    const alice = await device('alice');
    await device('bob');
    const e = await alice.send('bob', 'secret');
    const eve = await device('eve');
    await expect(eve.read('alice', e)).rejects.toThrow();
  });
});
