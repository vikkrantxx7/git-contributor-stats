import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['{src,tests}/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: ['default'],
    maxWorkers: '100%',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['html', 'text', 'lcov'],
      include: ['src/**/*.ts'],
      reportsDirectory: 'coverage',
      exclude: ['**/*.d.ts', '**/*.config.ts', '**/cli/**', '**/scripts/**'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    }
  }
});
