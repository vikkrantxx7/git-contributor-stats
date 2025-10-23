import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

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
    // Multi-entry build: programmatic API (index) + CLI entry (cli)
    rollupOptions: {
      input: {
        index: 'src/index.ts',
        cli: 'src/cli/entry.ts'
      },
      external: externals,
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs'
      }
    },
    target: 'node18',
    sourcemap: true,
    // Keep module structure minimal for Node usage
    minify: false,
    outDir: 'dist',
    emptyOutDir: true
  }
});
