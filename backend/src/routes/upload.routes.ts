/** Attachment upload + authorized download. */
import { Router } from 'express';
import { download, upload } from '../controllers/upload.controller';

const router = Router();

router.post('/', ...upload);
router.get('/:id', download);

export default router;
