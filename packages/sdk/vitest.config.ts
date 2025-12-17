import { defineConfig } from 'vitest/config';

import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    dir: './',
    environment: 'node',
    exclude: ['./dist/**', './node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', './src/exports/**'],
      include: ['src/**'],
    },
  },
});
