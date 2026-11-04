"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfGuard = exports.corsMiddleware = exports.securityHeaders = void 0;
/** CSRF defence + CORS + security headers.
 *  Cookie-authenticated mutations must carry an allowed Origin header;
 *  non-browser clients must use the Authorization header instead. */
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: false, // API serves JSON; SPA sets its own CSP
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});
exports.corsMiddleware = (0, cors_1.default)({
    origin(origin, cb) {
        // no origin (curl, server-to-server) is allowed; the CSRF check below
        // still guards cookie-based mutations.
        if (!origin)
            return cb(null, true);
        cb(null, env_1.env.corsOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const csrfGuard = (req, _res, next) => {
    if (!MUTATING.has(req.method))
        return next();
    const origin = req.headers.origin;
    if (origin) {
        if (!env_1.env.corsOrigins.includes(origin)) {
            return next((0, errors_1.forbidden)('Request origin is not allowed'));
        }
        return next(); // browser request from an allowed origin
    }
    // No Origin header: only accept when authenticated WITHOUT cookies
    // (bearer token) — i.e. non-browser API clients.
    const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
    if (hasBearer)
        return next();
    next((0, errors_1.forbidden)('Missing Origin header for cookie-authenticated request'));
};
exports.csrfGuard = csrfGuard;
//# sourceMappingURL=security.js.map