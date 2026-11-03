/** Public tracking + map data. */
import { Router } from 'express';
import { trackLimiter } from '../middleware/rateLimit';
import { mapPoints, track } from '../controllers/tracking.controller';

const router = Router();

router.post('/track', trackLimiter, track);
router.get('/map/points', mapPoints);

export default router;
