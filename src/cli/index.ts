#!/usr/bin/env node

import fs from 'node:fs';
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
import { setupCLI } from './options.js';

interface CLIOptions {
  repo?: string;
  branch?: string;
  since?: string;
  until?: string;
  author?: string;
  includeMerges?: boolean;
  groupBy?: 'email' | 'name';
  sortBy?: 'changes' | 'commits' | 'additions' | 'deletions';
  top?: number;
  similarity?: number;
  aliasFile?: string;
  countLines?: boolean;
  verbose?: boolean;
  generateWorkflow?: boolean;
  csv?: string;
  md?: string;
  html?: string;
  charts?: boolean;
  svg?: boolean;
  svgDir?: string;
  chartsDir?: string;
  chartFormat?: string;
  json?: boolean;
  format?: string;
  topStats?: string;
}

async function main(argv: string[]): Promise<void> {
  const pkg = safeReadPackageJson();
  const program = setupCLI(pkg);
  program.parse(argv);
  const opts = program.opts() as CLIOptions;
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

function safeReadPackageJson(): Record<string, unknown> {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export { main };
