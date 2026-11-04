/** Public catalog routes + admin registry CRUD. */
import { Router } from 'express';
import { catalogLimiter } from '../middleware/rateLimit';
import {
  categories,
  createCategory,
  createDepartment,
  createJurisdiction,
  deactivateDepartment,
  deactivateJurisdiction,
  departmentDetail,
  health,
  listDepartments,
  listJurisdictions,
  stats,
  updateCategory,
  updateDepartment,
  updateJurisdiction,
} from '../controllers/catalog.controller';

const router = Router();

// ---- public ----
router.get('/health', health);
router.get('/stats', catalogLimiter, stats);
router.get('/categories', catalogLimiter, categories);
router.get('/departments', catalogLimiter, listDepartments);
router.get('/departments/:id', catalogLimiter, departmentDetail);
router.get('/jurisdictions', catalogLimiter, listJurisdictions);

// ---- registry management ----
router.post('/departments', createDepartment);
router.patch('/departments/:id', updateDepartment);
router.delete('/departments/:id', deactivateDepartment);
router.post('/jurisdictions', createJurisdiction);
router.patch('/jurisdictions/:id', updateJurisdiction);
router.delete('/jurisdictions/:id', deactivateJurisdiction);
router.get('/admin/categories', categories);
router.post('/admin/categories', createCategory);
router.patch('/admin/categories/:key', updateCategory);

export default router;
