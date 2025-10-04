#!/usr/bin/env node
import concurrently from 'concurrently';

const tasks = [
  { command: 'npm run biome:fix', name: 'biome:fix', prefixColor: 'yellow' },
  { command: 'npm run format:fix', name: 'format:fix', prefixColor: 'cyan' },
  { command: 'npm run typeCheck', name: 'typecheck', prefixColor: 'magenta' }
];

concurrently(tasks, {
  prefix: 'name'
}).result.then(
  () => process.exit(0),
  () => process.exit(1)
);
