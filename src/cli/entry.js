#!/usr/bin/env node
// Dedicated CLI entry file that wires process.argv to the modular CLI main()
// This file is bundled to dist/cli.mjs for published package use.
import { main } from './index.js';

// Execute only when run directly (not when imported). Since this file is the
// executable bin target, it's always direct when invoked as a command.
main(process.argv).catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(2);
});
