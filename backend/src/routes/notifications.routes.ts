/** Notification routes (in-app only). */
import { Router } from 'express';
import { list, markRead } from '../controllers/notifications.controller';

const router = Router();

router.get('/', ...list);
router.post('/read', ...markRead);

export default router;
