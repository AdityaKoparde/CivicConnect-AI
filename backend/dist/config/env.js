"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
/** Typed environment configuration. Loads backend/.env then repo root .env. */
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '..', '.env') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '..', '..', '.env') });
const num = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
};
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: num(process.env.BACKEND_PORT, 4000),
    databaseUrl: process.env.DATABASE_URL ?? '',
    testDatabaseUrl: process.env.TEST_DATABASE_URL ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    jwtExpiresInSeconds: num(process.env.JWT_EXPIRES_IN, 43200),
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    aiServiceUrl: (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
    aiServiceKey: process.env.AI_SERVICE_KEY ?? 'ccai-internal-service-key-demo',
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    uploadMaxBytes: num(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
    isProd: (process.env.NODE_ENV ?? 'development') === 'production',
};
//# sourceMappingURL=env.js.map