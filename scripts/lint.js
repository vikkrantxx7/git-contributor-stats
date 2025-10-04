#!/usr/bin/env node
import concurrently from 'concurrently';

const tasks = [
  { command: 'npm run biome', name: 'biome', prefixColor: 'yellow' },
  { command: 'npm run format', name: 'format', prefixColor: 'cyan' },
  { command: 'npm run typeCheck', name: 'typecheck', prefixColor: 'magenta' }
];

concurrently(tasks, {
  prefix: 'name',
  killOthers: ['failure'], // 🚨 stop all if one fails
  restartTries: 0
}).result.then(
  () => process.exit(0),
  () => process.exit(1)
);
