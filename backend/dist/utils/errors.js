"use strict";
/** Application error type + helpers → uniform error envelope. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalError = exports.aiServiceError = exports.conflict = exports.notFound = exports.forbidden = exports.unauthenticated = exports.badRequest = exports.AppError = void 0;
class AppError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details = []) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const badRequest = (msg, details = []) => new AppError(400, 'VALIDATION_ERROR', msg, details);
exports.badRequest = badRequest;
const unauthenticated = (msg = 'Authentication required') => new AppError(401, 'UNAUTHENTICATED', msg);
exports.unauthenticated = unauthenticated;
const forbidden = (msg = 'You do not have permission for this action') => new AppError(403, 'FORBIDDEN', msg);
exports.forbidden = forbidden;
const notFound = (msg = 'Resource not found') => new AppError(404, 'NOT_FOUND', msg);
exports.notFound = notFound;
const conflict = (msg) => new AppError(409, 'CONFLICT', msg);
exports.conflict = conflict;
const aiServiceError = (msg) => new AppError(502, 'AI_SERVICE_ERROR', msg);
exports.aiServiceError = aiServiceError;
const internalError = (msg = 'An unexpected error occurred') => new AppError(500, 'INTERNAL_ERROR', msg);
exports.internalError = internalError;
//# sourceMappingURL=errors.js.map