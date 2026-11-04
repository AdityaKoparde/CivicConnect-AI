import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // One shared test database → run files sequentially for determinism.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 90_000,
  },
});
