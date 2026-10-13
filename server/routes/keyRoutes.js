import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { publishBundle, addOneTimePreKeys, preKeyCount, fetchBundle } from '../controllers/keyController.js';

const router = express.Router();

router.use(verifyToken);
router.post('/bundle', publishBundle);
router.post('/prekeys', addOneTimePreKeys);
router.get('/count', preKeyCount);
router.get('/bundle/:userId', fetchBundle);

export default router;
