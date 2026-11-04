"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Complaint management routes (staff only). */
const express_1 = require("express");
const complaints_controller_1 = require("../controllers/complaints.controller");
const router = (0, express_1.Router)();
router.get('/', ...complaints_controller_1.list);
router.get('/:id', ...complaints_controller_1.detail);
router.patch('/:id/status', ...complaints_controller_1.status);
router.patch('/:id/assign', ...complaints_controller_1.assign);
router.post('/:id/updates', ...complaints_controller_1.update);
router.post('/:id/duplicate', ...complaints_controller_1.duplicate);
exports.default = router;
//# sourceMappingURL=complaints.routes.js.map