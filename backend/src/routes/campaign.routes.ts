import { Router } from 'express';
import multer from 'multer';
import { createCampaign, getCampaigns, getCampaignById, deleteCampaign } from '../controllers/campaign.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB upload size limit
  },
});

router.use(isAuthenticated);

router.post('/schedule', upload.single('file'), createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.delete('/:id', deleteCampaign);

export default router;
