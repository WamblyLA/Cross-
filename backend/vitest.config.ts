import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup-env.ts'],
    coverage: {
      provider: 'v8',
      enabled: false,

      reporter: ['text', 'html'],

      reportsDirectory: './coverage',

      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/app.ts',
        'generated/**',
        '**/generated/**',
        'prisma/**',
        '**/prisma/**',
        'dist/**',
        '**/dist/**',
        'node_modules/**',
        '**/node_modules/**',
        '**/*.d.ts',
      ],
    },
  },
});
