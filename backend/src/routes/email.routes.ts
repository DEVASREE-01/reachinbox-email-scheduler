import { Router } from 'express';
import { getScheduledEmails, getSentEmails, searchUserEmails, getEmailById } from '../controllers/email.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

router.use(isAuthenticated);

router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/search', searchUserEmails);
router.get('/:id', getEmailById);

export default router;
