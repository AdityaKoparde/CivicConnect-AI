/** Vitest global setup:
 *  1. creates the test database and applies migrations
 *  2. seeds demo data into the test database
 *  3. starts the Python AI service (uvicorn) on port 8010 for integration tests
 *  Teardown stops the AI service. */
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import type { GlobalSetupContext } from 'vitest/node';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AI_PORT = 8010;
const repoRoot = path.join(__dirname, '..');
const aiServiceDir = path.join(repoRoot, '..', 'ai-service');
const testDbUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres@127.0.0.1:5443/civicconnect_test?schema=public';

let aiProcess: ReturnType<typeof spawn> | null = null;

const run = (
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): void => {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd ?? repoRoot,
    env: { ...process.env, ...opts.env },
    encoding: 'utf8',
    timeout: 180_000,
  });
  if (res.status !== 0) {
    throw new Error(
      `command failed (${cmd} ${args.join(' ')})\n${res.stdout ?? ''}\n${res.stderr ?? ''}`,
    );
  }
};

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  let lastErr = '';
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(url, { headers: { 'X-Service-Key': process.env.AI_SERVICE_KEY ?? '' } });
      if (resp.ok) return;
      lastErr = `status ${resp.status}`;
    } catch (err) {
      lastErr = String(err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`AI service did not become healthy at ${url}: ${lastErr}`);
}

export async function setup(_context: GlobalSetupContext) {
  process.env.TEST_DATABASE_URL = testDbUrl;

  // 1. ensure databases exist (dev + test)
  run('node', ['scripts/ensure-db.mjs'], { env: { DATABASE_URL: testDbUrl } });

  // 2. apply migrations to the test database
  run('npx', ['prisma', 'migrate', 'deploy'], { env: { DATABASE_URL: testDbUrl } });

  // 3. seed demo data (categories, departments, districts, demo accounts, complaints)
  run('npx', ['tsx', 'prisma/seed.ts'], { env: { DATABASE_URL: testDbUrl, NODE_ENV: 'test' } });

  // 4. start the Python AI service in demo mode (no credentials required)
  aiProcess = spawn(
    path.join(aiServiceDir, '.venv', 'bin', 'python'),
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(AI_PORT), '--log-level', 'warning'],
    {
      cwd: aiServiceDir,
      env: {
        ...process.env,
        AI_SERVICE_KEY: process.env.AI_SERVICE_KEY ?? 'ccai-internal-service-key-demo',
        AI_PROVIDER: 'demo',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  aiProcess.stdout?.on('data', () => {});
  aiProcess.stderr?.on('data', (d: Buffer) => {
    const text = d.toString();
    if (text.includes('Error') || text.includes('Traceback')) {
      console.error('[ai-service]', text);
    }
  });

  await waitForHealth(`http://127.0.0.1:${AI_PORT}/health`, 90_000);
  console.log(`✓ test database migrated+seeded (${testDbUrl})`);
  console.log(`✓ AI service healthy on :${AI_PORT} (demo mode)`);
}

export async function teardown() {
  if (aiProcess && !aiProcess.killed) {
    aiProcess.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    if (!aiProcess.killed) aiProcess.kill('SIGKILL');
  }
}
