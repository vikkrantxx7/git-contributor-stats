import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

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
    rollupOptions: {
      input: {
        cli: 'src/cli/entry.ts',
        'features/stats': 'src/features/stats.ts',
        'features/charts': 'src/features/charts.ts',
        'features/reports': 'src/features/reports.ts',
        'features/output': 'src/features/output.ts',
        'features/workflow': 'src/features/workflow.ts'
      },
      external: externals,
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        preserveModules: false,
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('src/utils')) {
            return 'utils';
          }
          if (id.includes('src/analytics')) {
            return 'analytics';
          }
          if (id.includes('src/git')) {
            return 'git';
          }
        }
      }
    },
    target: 'node18',
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    emptyOutDir: true
  }
});
