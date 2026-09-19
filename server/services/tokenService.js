import jwt from 'jsonwebtoken';

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, {
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

export default {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken
};
