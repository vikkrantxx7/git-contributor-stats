#!/usr/bin/env node
import { main } from './index.js';

main(process.argv as string[]).catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(2);
});
