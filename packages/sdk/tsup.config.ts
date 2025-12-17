import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/exports/**/*.ts'],
  format: ['cjs', 'esm'],
  legacyOutput: true,
  dts: true,
  minify: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
