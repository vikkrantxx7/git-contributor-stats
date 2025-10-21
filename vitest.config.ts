import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true, // make Vitest API (describe/it/expect etc.) globally available
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: ['default'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      enabled: false,
      provider: 'v8',
      reportsDirectory: 'coverage'
    }
  }
});
