import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// Externalize Node builtins and runtime deps to avoid bundling them
const externals = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'commander',
  'chart.js',
  'chartjs-node-canvas',
  'string-similarity-js'
];

export default defineConfig({
  build: {
    lib: {
      // Programmatic API entry (exports getContributorStats and helpers)
      entry: 'src/index.js',
      formats: ['es'],
      fileName: () => 'index.mjs'
    },
    target: 'node18',
    sourcemap: true,
    rollupOptions: {
      external: externals
    },
    // Keep module structure minimal for Node usage
    minify: false,
    outDir: 'dist',
    emptyOutDir: true
  }
});
