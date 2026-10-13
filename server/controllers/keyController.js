import User from '../models/User.js';
import Conversation from '../models/Conversation.js';

const MAX_ONE_TIME_KEYS = 100;
const KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

// Keys are base64; checking the decoded length rejects anything that isn't a key.
const isKey = (value, bytes = KEY_BYTES) => {
  if (typeof value !== 'string' || value.length > 200) return false;
  if (!/^[A-Za-z0-9+/]+=*$/.test(value)) return false;
  return Buffer.from(value, 'base64').length === bytes;
};

const isKeyId = (value) => Number.isInteger(value) && value >= 0 && value <= 0x7fffffff;

const validOneTimeKeys = (list) =>
  Array.isArray(list)
  && list.length <= MAX_ONE_TIME_KEYS
  && list.every(k => k && isKeyId(k.keyId) && isKey(k.publicKey));

/** Uploads this device's public keys, replacing whatever was published before. */
export const publishBundle = async (req, res) => {
  try {
    const { identityKeyDh, identityKeySig, signedPreKey, oneTimePreKeys } = req.body || {};
    if (!isKey(identityKeyDh) || !isKey(identityKeySig, KEY_BYTES)) {
      return res.status(400).json({ message: 'Identity keys are invalid' });
    }
    if (!signedPreKey || !isKeyId(signedPreKey.keyId) || !isKey(signedPreKey.publicKey)
      || !isKey(signedPreKey.signature, SIGNATURE_BYTES)) {
      return res.status(400).json({ message: 'Signed prekey is invalid' });
    }
    if (!validOneTimeKeys(oneTimePreKeys)) {
      return res.status(400).json({ message: 'One-time prekeys are invalid' });
    }

    await User.publishKeys(req.userId, {
      identityKeyDh,
      identityKeySig,
      signedPreKey: { keyId: signedPreKey.keyId, publicKey: signedPreKey.publicKey, signature: signedPreKey.signature },
      oneTimePreKeys: oneTimePreKeys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey })),
    });
    res.status(200).json({ message: 'Keys published' });
  } catch (error) {
    console.error('Publish keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addOneTimePreKeys = async (req, res) => {
  try {
    const keys = req.body?.oneTimePreKeys;
    if (!validOneTimeKeys(keys) || keys.length === 0) {
      return res.status(400).json({ message: 'One-time prekeys are invalid' });
    }
    const user = await User.addOneTimePreKeys(
      req.userId,
      keys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey })),
      MAX_ONE_TIME_KEYS
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ count: user.oneTimePreKeys.length });
  } catch (error) {
    console.error('Add prekeys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const preKeyCount = async (req, res) => {
  try {
    res.status(200).json({ count: await User.countOneTimePreKeys(req.userId) });
  } catch (error) {
    console.error('Prekey count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Another person's public bundle, with one one-time prekey claimed for the caller.
 * Only people who are contacts or share a chat can fetch it.
 */
export const fetchBundle = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.userId;
    if (userId === viewerId) return res.status(404).json({ message: 'Keys not found' });

    const viewer = await User.findById(viewerId);
    const target = await User.findById(userId);
    if (!viewer || !target) return res.status(404).json({ message: 'Keys not found' });

    const allowed = (viewer.contacts || []).includes(userId) || Boolean(await Conversation.findOne({
      type: 'private',
      participants: { $all: [viewerId, userId] },
    }));
    if (!allowed) return res.status(404).json({ message: 'Keys not found' });

    const material = await User.findKeyMaterial(userId);
    if (!material?.identityKeyDh || !material.signedPreKey?.publicKey) {
      return res.status(404).json({ message: 'This person has not set up encryption yet' });
    }

    const oneTimePreKey = await User.claimOneTimePreKey(userId);
    res.status(200).json({
      bundle: {
        identityKeyDh: material.identityKeyDh,
        identityKeySig: material.identityKeySig,
        signedPreKey: material.signedPreKey,
        oneTimePreKey,
      },
    });
  } catch (error) {
    console.error('Fetch bundle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
