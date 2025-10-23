#!/usr/bin/env node
import { main } from './index.ts';

try {
  await main(process.argv);
} catch (err: unknown) {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(2);
}
