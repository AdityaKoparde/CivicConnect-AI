"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Attachment upload + authorized download. */
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const router = (0, express_1.Router)();
router.post('/', ...upload_controller_1.upload);
router.get('/:id', upload_controller_1.download);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map