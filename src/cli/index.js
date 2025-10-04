#!/usr/bin/env node

import fs from 'node:fs';
/**
 * Main CLI entry point for git-contributor-stats
 * Refactored to delegate core logic to programmatic API helpers in ../index.js
 */
import path from 'node:path';
import process from 'node:process';
// Git repo detection (lightweight)
import { isGitRepo } from '../git/utils.js';
// Shared API helpers
import {
  generateOutputs,
  generateWorkflow,
  getContributorStats,
  handleStdoutOutput
} from '../index.js';

// CLI option builder
import { setupCLI } from './options.js';

/**
 * Main execution function
 * @param {string[]} argv - Command line arguments
 */
async function main(argv) {
  const pkg = safeReadPackageJson();
  const program = setupCLI(pkg);

  program.parse(argv);

  const opts = program.opts();
  const paths = program.args || [];

  // Validate repository early for friendly error (tests rely on message)
  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) {
    console.error(`Not a Git repository: ${repo}`);
    process.exit(2);
  }

  // Build options for programmatic API
  const apiOptions = {
    repo,
    branch: opts.branch,
    since: opts.since,
    until: opts.until,
    author: opts.author,
    includeMerges: !!opts.includeMerges,
    groupBy: opts.groupBy,
    sortBy: opts.sortBy,
    top: opts.top,
    similarity: opts.similarity,
    aliasFile: opts.aliasFile,
    countLines: opts.countLines, // commander handles --no-count-lines -> false
    paths,
    verbose: opts.verbose
  };

  let final;
  try {
    final = await getContributorStats(apiOptions);
  } catch (e) {
    console.error(e?.message || String(e));
    process.exit(2);
  }

  // File outputs (reports/charts) if requested
  await generateOutputs(final, opts);

  // GitHub Actions workflow generation if requested
  if (opts.generateWorkflow) {
    await generateWorkflow(repo);
  }

  // Stdout formatting (table/json/csv)
  handleStdoutOutput(final, opts);
}

/**
 * Minimal safe read for package.json (kept local to avoid circular imports)
 */
function safeReadPackageJson() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return {};
  }
}

export { main };
