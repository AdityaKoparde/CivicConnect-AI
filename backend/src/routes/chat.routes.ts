/** Chatbot conversation routes — guests may create/read their own
 *  conversations via a signed guest cookie; registered users via their session. */
import { Router } from 'express';
import { chatLimiter } from '../middleware/rateLimit';
import { cancel, confirm, create, detail, message } from '../controllers/chat.controller';

const router = Router();

router.post('/conversations', create);
router.get('/conversations/:id', detail);
router.post('/conversations/:id/messages', chatLimiter, message);
router.post('/conversations/:id/confirm', chatLimiter, confirm);
router.post('/conversations/:id/cancel', cancel);

export default router;
