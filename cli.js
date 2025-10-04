#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * git-contributor-stats - CLI entry (development / source execution)
 * Delegates to the modular CLI implementation in src/cli/index.js
 */
import { main } from './src/cli/index.js';

// Execute only when run directly (e.g. `node cli.js`)
const isDirectRun = (() => {
  try {
    const entryArg = process.argv[1] ? path.resolve(process.cwd(), process.argv[1]) : '';
    const thisFile = fileURLToPath(import.meta.url);
    return entryArg === thisFile;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main(process.argv).catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(2);
  });
}
