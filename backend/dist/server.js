"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
/** CivicConnect AI — Node/Express API server.
 *
 *  Responsibilities (AI logic lives in the Python service):
 *  - auth, roles, jurisdiction scoping, complaint workflow
 *  - routing validation, notifications, analytics, tracking privacy
 *  - calls the Python service via X-Service-Key for chat understanding */
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const rateLimit_1 = require("./middleware/rateLimit");
const security_1 = require("./middleware/security");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const complaints_routes_1 = __importDefault(require("./routes/complaints.routes"));
const tracking_routes_1 = __importDefault(require("./routes/tracking.routes"));
const catalog_routes_1 = __importDefault(require("./routes/catalog.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const createApp = () => {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use(security_1.securityHeaders);
    app.use(security_1.corsMiddleware);
    app.use(express_1.default.json({ limit: '256kb' }));
    app.use(express_1.default.urlencoded({ extended: false, limit: '64kb' }));
    app.use((0, cookie_parser_1.default)());
    // ---- request logging (no bodies, no secrets) ----
    app.use((req, _res, next) => {
        const start = Date.now();
        _res.on('finish', () => {
            logger_1.logger.info(`${req.method} ${req.originalUrl} ${_res.statusCode} ${Date.now() - start}ms`);
        });
        next();
    });
    app.use(auth_1.attachUser);
    app.use(security_1.csrfGuard);
    // ---- API routes (rate limits applied inside route modules) ----
    // /api/health with database + AI status lives in catalog.routes.ts
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/chat', chat_routes_1.default);
    app.use('/api/complaints', complaints_routes_1.default);
    app.use('/api', tracking_routes_1.default);
    app.use('/api', catalog_routes_1.default);
    app.use('/api/admin', rateLimit_1.apiLimiter, admin_routes_1.default);
    app.use('/api/notifications', notifications_routes_1.default);
    app.use('/api/files', upload_routes_1.default);
    // ---- 404 ----
    app.use('/api', (_req, res) => {
        res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'API endpoint not found', details: [] },
        });
    });
    // ---- static uploads (dev convenience; auth enforced per-file) ----
    app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), env_1.env.uploadDir)));
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
// Note: auth + catalog rate limiters are applied per-route inside
// routes/auth.routes.ts and routes/catalog.routes.ts.
const port = env_1.env.port;
if (process.env.NODE_ENV !== 'test') {
    const app = (0, exports.createApp)();
    app.listen(port, () => {
        logger_1.logger.info(`CivicConnect API listening on http://localhost:${port}`);
        logger_1.logger.info(`AI service target: ${env_1.env.aiServiceUrl}`);
    });
}
exports.default = exports.createApp;
//# sourceMappingURL=server.js.map