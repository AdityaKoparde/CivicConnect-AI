"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const notFoundHandler = (_req, res) => {
    res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Endpoint not found', details: [] },
    });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        res.status(err.status).json({
            error: { code: err.code, message: err.message, details: err.details },
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            },
        });
        return;
    }
    const anyErr = err;
    // multer file-size / type errors
    if (anyErr?.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'File is too large (max 5 MB)', details: [] },
        });
        return;
    }
    // Prisma unique constraint
    if (anyErr?.code === 'P2002') {
        res.status(409).json({
            error: { code: 'CONFLICT', message: 'A record with that value already exists', details: [] },
        });
        return;
    }
    logger_1.logger.error('unhandled_error', { message: String(anyErr?.message ?? err) });
    res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: [] },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map