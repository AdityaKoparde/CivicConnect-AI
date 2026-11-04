/** Admin routes: dashboard stats, officers, escalation rules, audit log. */
import { Router } from 'express';
import {
  auditLogs,
  createEscalationRule,
  createOfficer,
  dashboardStats,
  deleteEscalationRule,
  listEscalationRules,
  listOfficers,
  patchEscalationRule,
  patchOfficer,
  runEscalations,
} from '../controllers/admin.controller';

const router = Router();

router.get('/stats', ...dashboardStats);
router.get('/officers', ...listOfficers);
router.post('/officers', ...createOfficer);
router.patch('/officers/:id', ...patchOfficer);
router.get('/escalation-rules', ...listEscalationRules);
router.post('/escalation-rules', ...createEscalationRule);
router.patch('/escalation-rules/:id', ...patchEscalationRule);
router.delete('/escalation-rules/:id', ...deleteEscalationRule);
router.post('/escalations/run', ...runEscalations);
router.get('/audit', ...auditLogs);

export default router;
