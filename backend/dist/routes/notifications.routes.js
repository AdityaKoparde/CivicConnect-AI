"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Notification routes (in-app only). */
const express_1 = require("express");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
router.get('/', ...notifications_controller_1.list);
router.post('/read', ...notifications_controller_1.markRead);
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map