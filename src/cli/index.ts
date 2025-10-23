#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { isGitRepo } from '../git/utils.js';
import type { ContributorStatsResult } from '../index.js';
import {
  generateOutputs,
  generateWorkflow,
  getContributorStats,
  handleStdoutOutput
} from '../index.js';
import { safeReadPackageJson } from '../utils/files.js';
import { setupCLI } from './options.js';

async function main(argv: string[]): Promise<void> {
  const pkg = safeReadPackageJson();
  const program = setupCLI(pkg);
  program.parse(argv);
  const opts = program.opts();
  const paths: string[] = program.args || [];

  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) {
    console.error(`Not a Git repository: ${repo}`);
    process.exit(2);
  }

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
    countLines: opts.countLines,
    paths,
    verbose: opts.verbose
  };

  let final: ContributorStatsResult;
  try {
    final = await getContributorStats(apiOptions);
  } catch (e) {
    console.error((e as Error)?.message || String(e));
    process.exit(2);
  }

  await generateOutputs(final, opts);

  if (opts.generateWorkflow) {
    await generateWorkflow(repo);
  }

  handleStdoutOutput(final, opts);
}

export { main };
