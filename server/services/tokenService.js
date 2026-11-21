import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// `tv` is the user's tokenVersion when the token was issued. Logging out bumps
// it, which revokes every token issued before. Tokens from before this field
// existed have no `tv` and count as version 0.
//
// `fresh` marks an access token issued straight after an email-OTP check. Tokens
// minted by /refresh never carry it, so a stolen token cannot be used to swap in
// a new encryption identity (see `isFreshLogin`).
export const FRESH_LOGIN_WINDOW_SECONDS = 15 * 60;

export const generateTokens = (userId, tokenVersion = 0, { fresh = false } = {}) => {
  const accessToken = jwt.sign({ userId, type: 'access', tv: tokenVersion, ...(fresh && { fresh: true }) }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  const refreshToken = jwt.sign({ userId, type: 'refresh', tv: tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};

const verifyTyped = (token, expectedType) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== expectedType) {
    throw new Error(`Expected ${expectedType} token`);
  }
  return decoded;
};

export const verifyAccessToken = (token) => {
  try {
    return verifyTyped(token, 'access');
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return verifyTyped(token, 'refresh');
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/** True only for an access token minted by a recent OTP sign-in. */
export const isFreshLogin = (decoded) =>
  decoded?.fresh === true
  && typeof decoded.iat === 'number'
  && Math.floor(Date.now() / 1000) - decoded.iat <= FRESH_LOGIN_WINDOW_SECONDS;

/**
 * Loads the token's user and checks the token has not been revoked.
 * Returns the user, or throws if the user is gone or the token is stale.
 */
export const assertTokenCurrent = async (decoded) => {
  const user = await User.findById(decoded.userId);
  if (!user || (decoded.tv || 0) !== (user.tokenVersion || 0)) {
    throw new Error('Token has been revoked');
  }
  return user;
};

export default {
  generateTokens,
  isFreshLogin,
  verifyAccessToken,
  verifyRefreshToken,
  assertTokenCurrent
};
