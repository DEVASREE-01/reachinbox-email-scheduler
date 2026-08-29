import { Router } from 'express';
import { connectSlack, slackCallback, getSlackStatus, disconnectSlack } from '../controllers/slack.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

router.get('/connect', isAuthenticated, connectSlack);
// Callback route is handled via URL from Slack, but uses state validation corresponding to user
router.get('/callback', slackCallback);
router.get('/status', isAuthenticated, getSlackStatus);
router.delete('/disconnect', isAuthenticated, disconnectSlack);

export default router;
