import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.cjs',
        '**/types.ts',
        'vitest.config.ts',
        'scripts/**',
        'docs/**',
        'src/index.ts',
        'src/errors.ts',
        'src/llm/**',
        'src/modules/ner.ts',
        'src/modules/voice.module.ts',
        'src/modules/rag.module.ts',
        'src/modules/export.module.ts',
        'src/modules/cost.module.ts',
      ],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

