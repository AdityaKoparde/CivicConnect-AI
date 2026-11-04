/** Complaint management routes (staff only). */
import { Router } from 'express';
import { assign, detail, duplicate, list, status, update } from '../controllers/complaints.controller';

const router = Router();

router.get('/', ...list);
router.get('/:id', ...detail);
router.patch('/:id/status', ...status);
router.patch('/:id/assign', ...assign);
router.post('/:id/updates', ...update);
router.post('/:id/duplicate', ...duplicate);

export default router;
