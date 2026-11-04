"use strict";
/** Minimal structured logger. Never logs request bodies (citizen privacy). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const emit = (level, msg, meta) => {
    const line = JSON.stringify({
        t: new Date().toISOString(),
        level,
        msg,
        ...meta,
    });
    if (level === 'error')
        console.error(line);
    else if (level === 'warn')
        console.warn(line);
    else
        console.log(line);
};
exports.logger = {
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
};
//# sourceMappingURL=logger.js.map