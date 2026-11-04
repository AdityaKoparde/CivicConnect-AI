"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Public tracking + map data. */
const express_1 = require("express");
const rateLimit_1 = require("../middleware/rateLimit");
const tracking_controller_1 = require("../controllers/tracking.controller");
const router = (0, express_1.Router)();
router.post('/track', rateLimit_1.trackLimiter, tracking_controller_1.track);
router.get('/map/points', tracking_controller_1.mapPoints);
exports.default = router;
//# sourceMappingURL=tracking.routes.js.map