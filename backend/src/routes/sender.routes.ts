import { Router } from 'express';
import { getSenders, createSender, deleteSender } from '../controllers/sender.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

router.use(isAuthenticated);

router.get('/', getSenders);
router.post('/', createSender);
router.delete('/:id', deleteSender);

export default router;
