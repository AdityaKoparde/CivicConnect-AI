/** Typed environment configuration. Loads backend/.env then repo root .env. */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const env = {
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
} as const;
