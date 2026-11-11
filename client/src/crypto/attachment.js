// End-to-end encryption for attachments. A file is sealed on the sender's device
// with a random one-off key; the server and the storage provider only ever hold
// the sealed bytes. The key travels to the recipient inside the ratchet-encrypted
// message (see `encodeDescriptor`), so it inherits that message's secrecy.
//
// Sealed layout: noncePrefix(16) then the file in 1 MiB chunks, each a secretbox.
// Chunk nonce = noncePrefix(16) index(4) 0 0 0 last(1). The index stops chunks
// being reordered or dropped, and the `last` flag stops the file being cut short
// at a chunk boundary.
import { randomBytes, concat, seal, open, toBase64, fromBase64, KEY_BYTES } from './primitives';

export const CHUNK_BYTES = 1024 * 1024;
const PREFIX_BYTES = 16;
const BOX_OVERHEAD = 16;

// What the server is told about a sealed upload: nothing that describes the file.
export const SEALED_FILE_NAME = 'attachment.bin';
export const SEALED_MIME_TYPE = 'application/octet-stream';
export const SEALED_MESSAGE_TYPE = 'document';

const chunkNonce = (prefix, index, last) => {
  const nonce = new Uint8Array(24);
  nonce.set(prefix, 0);
  nonce[16] = (index >>> 24) & 0xff;
  nonce[17] = (index >>> 16) & 0xff;
  nonce[18] = (index >>> 8) & 0xff;
  nonce[19] = index & 0xff;
  nonce[23] = last ? 1 : 0;
  return nonce;
};

/** Seals file bytes under a fresh key. Returns the key and the bytes to upload. */
export const sealAttachment = (bytes) => {
  const key = randomBytes(KEY_BYTES);
  const prefix = randomBytes(PREFIX_BYTES);
  const parts = [prefix];
  // An empty file is still one (empty) final chunk, so it authenticates too.
  const count = Math.max(1, Math.ceil(bytes.length / CHUNK_BYTES));
  for (let i = 0; i < count; i++) {
    const chunk = bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES);
    parts.push(seal(chunk, chunkNonce(prefix, i, i === count - 1), key));
  }
  return { key, sealed: concat(...parts) };
};

/** Opens sealed bytes. Throws if they were altered, truncated or the key is wrong. */
export const openAttachment = (sealed, key) => {
  const fail = () => { throw new Error('Attachment could not be decrypted'); };
  if (sealed.length < PREFIX_BYTES + BOX_OVERHEAD) fail();
  const prefix = sealed.subarray(0, PREFIX_BYTES);
  const body = sealed.subarray(PREFIX_BYTES);
  const boxBytes = CHUNK_BYTES + BOX_OVERHEAD;
  const count = Math.ceil(body.length / boxBytes);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const box = body.subarray(i * boxBytes, (i + 1) * boxBytes);
    const chunk = open(box, chunkNonce(prefix, i, i === count - 1), key);
    if (!chunk) fail();
    parts.push(chunk);
  }
  return concat(...parts);
};

// --- descriptor -----------------------------------------------------------------
// The text of an attachment message: the file's key and its real name, size and
// type. It is encrypted like any other message, so none of it reaches the server.

const DESCRIPTOR_TAG = 'nexus.attachment';
const MESSAGE_TYPES = new Set(['image', 'video', 'voice', 'document']);

export const encodeDescriptor = ({ key, name, size, mime, type }) =>
  JSON.stringify({ t: DESCRIPTOR_TAG, v: 1, k: toBase64(key), name, size, mime, type });

/** Parses a descriptor. Returns null (never throws) for ordinary message text. */
export const decodeDescriptor = (text) => {
  if (typeof text !== 'string' || !text.startsWith(`{"t":"${DESCRIPTOR_TAG}"`)) return null;
  try {
    const d = JSON.parse(text);
    const key = fromBase64(d.k);
    if (d.t !== DESCRIPTOR_TAG || key.length !== KEY_BYTES) return null;
    return {
      key,
      name: typeof d.name === 'string' && d.name ? d.name.slice(0, 255) : 'file',
      size: Number.isFinite(d.size) && d.size >= 0 ? d.size : null,
      mime: typeof d.mime === 'string' ? d.mime.slice(0, 100) : '',
      type: MESSAGE_TYPES.has(d.type) ? d.type : 'document',
    };
  } catch {
    return null;
  }
};
