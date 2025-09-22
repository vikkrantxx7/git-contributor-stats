#!/usr/bin/env node

/**
 * git-contributor-stats - Modular Entry Point
 *
 * This is the new entry point that uses the modular architecture.
 * The original index.js remains for backward compatibility during transition.
 */

import { main } from './src/cli/index.js';

// Entry point - delegate to modular CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv).catch(err => {
    console.error(err?.stack || String(err));
    process.exit(2);
  });
}
