import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // The 100-run property test in properties.test.ts exceeds the 5s default under V8 coverage instrumentation.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
