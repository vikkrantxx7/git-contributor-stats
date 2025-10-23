#!/usr/bin/env node
import concurrently from 'concurrently';

const tasks = [
  { command: 'npm run biome:fix', name: 'biome:fix', prefixColor: 'yellow' },
  { command: 'npm run format:fix', name: 'format:fix', prefixColor: 'cyan' },
  { command: 'npm run typeCheck', name: 'typecheck', prefixColor: 'magenta' }
];

try {
  await concurrently(tasks, {
    prefix: 'name'
  }).result;
  process.exit(0);
} catch {
  process.exit(1);
}
