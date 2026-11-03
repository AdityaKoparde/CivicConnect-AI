/** Authentication routes. */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { login, logout, me, register } from '../controllers/auth.controller';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get(
  '/admin-only',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  (_req, res) => res.json({ ok: true }),
);

export default router;
