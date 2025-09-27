#!/usr/bin/env node

/**
 * git-contributor-stats - Modular Entry Point
 *
 * This is the new entry point that uses the modular architecture.
 * The original index.js remains for backward compatibility during transition.
 */

import { main } from './src/cli/index.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Robust ESM entrypoint detection (handles relative invocation `node cli.js`)
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
  main(process.argv).catch(err => {
    console.error(err?.stack || String(err));
    process.exit(2);
  });
}
