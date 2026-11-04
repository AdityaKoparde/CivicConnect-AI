"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Admin routes: dashboard stats, officers, escalation rules, audit log. */
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
router.get('/stats', ...admin_controller_1.dashboardStats);
router.get('/officers', ...admin_controller_1.listOfficers);
router.post('/officers', ...admin_controller_1.createOfficer);
router.patch('/officers/:id', ...admin_controller_1.patchOfficer);
router.get('/escalation-rules', ...admin_controller_1.listEscalationRules);
router.post('/escalation-rules', ...admin_controller_1.createEscalationRule);
router.patch('/escalation-rules/:id', ...admin_controller_1.patchEscalationRule);
router.delete('/escalation-rules/:id', ...admin_controller_1.deleteEscalationRule);
router.post('/escalations/run', ...admin_controller_1.runEscalations);
router.get('/audit', ...admin_controller_1.auditLogs);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map