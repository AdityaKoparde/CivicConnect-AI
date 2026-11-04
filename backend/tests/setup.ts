/** Per-worker env: point the app at the test database + the AI test instance.
 *  Must run BEFORE any src/ module is imported (dotenv does not override
 *  variables that are already set). */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres@127.0.0.1:5443/civicconnect_test?schema=public';
process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';
process.env.AI_SERVICE_KEY = process.env.AI_SERVICE_KEY ?? 'ccai-internal-service-key-demo';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.CORS_ORIGINS = 'http://localhost:5173';
