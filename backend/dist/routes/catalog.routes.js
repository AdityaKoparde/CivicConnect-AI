"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Public catalog routes + admin registry CRUD. */
const express_1 = require("express");
const rateLimit_1 = require("../middleware/rateLimit");
const catalog_controller_1 = require("../controllers/catalog.controller");
const router = (0, express_1.Router)();
// ---- public ----
router.get('/health', catalog_controller_1.health);
router.get('/stats', rateLimit_1.catalogLimiter, catalog_controller_1.stats);
router.get('/categories', rateLimit_1.catalogLimiter, catalog_controller_1.categories);
router.get('/departments', rateLimit_1.catalogLimiter, catalog_controller_1.listDepartments);
router.get('/departments/:id', rateLimit_1.catalogLimiter, catalog_controller_1.departmentDetail);
router.get('/jurisdictions', rateLimit_1.catalogLimiter, catalog_controller_1.listJurisdictions);
// ---- registry management ----
router.post('/departments', catalog_controller_1.createDepartment);
router.patch('/departments/:id', catalog_controller_1.updateDepartment);
router.delete('/departments/:id', catalog_controller_1.deactivateDepartment);
router.post('/jurisdictions', catalog_controller_1.createJurisdiction);
router.patch('/jurisdictions/:id', catalog_controller_1.updateJurisdiction);
router.delete('/jurisdictions/:id', catalog_controller_1.deactivateJurisdiction);
router.get('/admin/categories', catalog_controller_1.categories);
router.post('/admin/categories', catalog_controller_1.createCategory);
router.patch('/admin/categories/:key', catalog_controller_1.updateCategory);
exports.default = router;
//# sourceMappingURL=catalog.routes.js.map