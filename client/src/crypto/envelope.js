// Wire format for an encrypted message, base64 encoded:
//
//   'N' 'X' version(1) kind(1)
//   kind 0 (first message only): identityKeyDh(32) ephemeralKey(32) signedPreKeyId(4) oneTimePreKeyId(4)
//   header: ratchetKey(32) previousChainLength(4) messageNumber(4)
//   nonce(24) ciphertext(n) tag(32)
//
// The tag is HMAC-SHA256 over everything before it, so the header can't be
// altered without detection. The magic bytes let the client tell an encrypted
// message from legacy plaintext without guessing.
import { fromBase64, toBase64, concat } from './primitives';

export const VERSION = 1;
export const KIND_INITIAL = 0;
export const KIND_MESSAGE = 1;
export const NO_ONE_TIME_PREKEY = 0xffffffff;
const MAGIC_0 = 0x4e; // N
const MAGIC_1 = 0x58; // X
const HEADER_LEN = 40;
const TAG_LEN = 32;
const NONCE_LEN = 24;
const INITIAL_LEN = 72;

const u32 = (n) => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const readU32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

/** Builds the bytes that the tag covers (everything up to, not including, the tag). */
export const authenticatedPart = ({ kind, initial, header, nonce, ciphertext }) => {
  const prefix = new Uint8Array([MAGIC_0, MAGIC_1, VERSION, kind]);
  const init = kind === KIND_INITIAL
    ? concat(
      initial.identityKeyDh,
      initial.ephemeralPublicKey,
      u32(initial.signedPreKeyId >>> 0),
      u32(initial.oneTimePreKeyId == null ? NO_ONE_TIME_PREKEY : initial.oneTimePreKeyId >>> 0)
    )
    : new Uint8Array(0);
  return concat(prefix, init, header, nonce, ciphertext);
};

export const encodeEnvelope = ({ kind, initial, header, nonce, ciphertext, tag }) => {
  const body = authenticatedPart({ kind, initial, header, nonce, ciphertext });
  return toBase64(concat(body, tag));
};

/** Parses an envelope. Returns null (never throws) for anything that isn't one. */
export const decodeEnvelope = (text) => {
  if (typeof text !== 'string' || text.length < 8) return null;
  let bytes;
  try {
    bytes = fromBase64(text);
  } catch {
    return null;
  }
  if (bytes.length < 4 + HEADER_LEN + NONCE_LEN + TAG_LEN) return null;
  if (bytes[0] !== MAGIC_0 || bytes[1] !== MAGIC_1 || bytes[2] !== VERSION) return null;

  const kind = bytes[3];
  if (kind !== KIND_INITIAL && kind !== KIND_MESSAGE) return null;
  let offset = 4;
  let initial = null;
  if (kind === KIND_INITIAL) {
    if (bytes.length < 4 + INITIAL_LEN + HEADER_LEN + NONCE_LEN + TAG_LEN) return null;
    const opk = readU32(bytes, offset + 68);
    initial = {
      identityKeyDh: bytes.slice(offset, offset + 32),
      ephemeralPublicKey: bytes.slice(offset + 32, offset + 64),
      signedPreKeyId: readU32(bytes, offset + 64),
      oneTimePreKeyId: opk === NO_ONE_TIME_PREKEY ? null : opk,
    };
    offset += INITIAL_LEN;
  }

  const header = bytes.slice(offset, offset + HEADER_LEN);
  offset += HEADER_LEN;
  const nonce = bytes.slice(offset, offset + NONCE_LEN);
  offset += NONCE_LEN;
  const ciphertext = bytes.slice(offset, bytes.length - TAG_LEN);
  const tag = bytes.slice(bytes.length - TAG_LEN);

  return {
    kind,
    initial,
    header,
    nonce,
    ciphertext,
    tag,
    authenticated: bytes.slice(0, bytes.length - TAG_LEN),
  };
};

/** True when the text is shaped like an envelope, even if it can't be opened. */
export const looksLikeEnvelope = (text) => {
  if (typeof text !== 'string' || text.length < 8) return false;
  try {
    const b = fromBase64(text.slice(0, 8));
    return b[0] === MAGIC_0 && b[1] === MAGIC_1;
  } catch {
    return false;
  }
};
