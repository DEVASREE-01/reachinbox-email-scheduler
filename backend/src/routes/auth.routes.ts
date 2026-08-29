import { Router } from 'express';
import { googleLogin, googleCallback, googleBypass, getMe, logout } from '../controllers/auth.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

router.get('/google', googleLogin);
router.get('/google/bypass', googleBypass);
router.get('/google/callback', googleCallback);
router.get('/me', isAuthenticated, getMe);
router.post('/logout', isAuthenticated, logout);

export default router;
