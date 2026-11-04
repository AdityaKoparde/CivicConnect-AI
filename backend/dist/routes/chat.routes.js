"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Chatbot conversation routes — guests may create/read their own
 *  conversations via a signed guest cookie; registered users via their session. */
const express_1 = require("express");
const rateLimit_1 = require("../middleware/rateLimit");
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
router.post('/conversations', chat_controller_1.create);
router.get('/conversations/:id', chat_controller_1.detail);
router.post('/conversations/:id/messages', rateLimit_1.chatLimiter, chat_controller_1.message);
router.post('/conversations/:id/confirm', rateLimit_1.chatLimiter, chat_controller_1.confirm);
router.post('/conversations/:id/cancel', chat_controller_1.cancel);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map