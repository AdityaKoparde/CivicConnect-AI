"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.catalogLimiter = exports.chatLimiter = exports.trackLimiter = exports.authLimiter = void 0;
/** Rate limiting per docs/api-documentation.md §11. */
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const handler = (limitName) => (_req, res) => {
    res.status(429).json({
        error: {
            code: 'RATE_LIMITED',
            message: `Too many requests (${limitName}). Please try again later.`,
            details: [],
        },
    });
};
// login/register: 10 / 15 min per IP
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handler('authentication'),
});
// public tracking: 30 / min per IP
exports.trackLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handler('tracking'),
});
// chat messages: 60 / min per user (falls back to IP for guests)
exports.chatLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
    handler: handler('chat'),
});
// public catalog reads: 120 / min per IP
exports.catalogLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handler('catalog'),
});
// general API: 300 / min per IP
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handler('api'),
});
//# sourceMappingURL=rateLimit.js.map