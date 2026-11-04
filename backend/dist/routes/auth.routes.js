"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Authentication routes. */
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/register', rateLimit_1.authLimiter, auth_controller_1.register);
router.post('/login', rateLimit_1.authLimiter, auth_controller_1.login);
router.post('/logout', auth_controller_1.logout);
router.get('/me', auth_1.requireAuth, auth_controller_1.me);
router.get('/admin-only', auth_1.requireAuth, (0, auth_1.requireRole)('SUPER_ADMIN'), (_req, res) => res.json({ ok: true }));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map