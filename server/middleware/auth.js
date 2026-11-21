import { verifyAccessToken, assertTokenCurrent, isFreshLogin } from '../services/tokenService.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);
    await assertTokenCurrent(decoded);
    req.userId = decoded.userId;
    req.freshLogin = isFreshLogin(decoded);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
