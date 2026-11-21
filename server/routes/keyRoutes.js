import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { publishBundle, rotateSignedPreKey, addOneTimePreKeys, preKeyCount, fetchBundle } from '../controllers/keyController.js';

const router = express.Router();

router.use(verifyToken);
router.post('/bundle', publishBundle);
router.post('/signed-prekey', rotateSignedPreKey);
router.post('/prekeys', addOneTimePreKeys);
router.get('/count', preKeyCount);
router.get('/bundle/:userId', fetchBundle);

export default router;
