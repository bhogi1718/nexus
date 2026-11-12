import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// `tv` is the user's tokenVersion when the token was issued. Logging out bumps
// it, which revokes every token issued before. Tokens from before this field
// existed have no `tv` and count as version 0.
export const generateTokens = (userId, tokenVersion = 0) => {
  const accessToken = jwt.sign({ userId, type: 'access', tv: tokenVersion }, process.env.JWT_SECRET, {
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
  verifyAccessToken,
  verifyRefreshToken,
  assertTokenCurrent
};
