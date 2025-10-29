#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { generateCharts } from '../features/charts.ts';
import { handleStdoutOutput } from '../features/output.ts';
import { generateReports } from '../features/reports.ts';
import { type ContributorStatsResult, getContributorStats } from '../features/stats.ts';
import { generateWorkflow } from '../features/workflow.ts';
import { isGitRepo } from '../git/utils.ts';
import { safeReadPackageJson } from '../utils/files.ts';
import { setupCLI } from './options.ts';

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
    labelBy: opts.labelBy,
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

  // Generate reports
  await generateReports(final, opts);

  // Generate charts
  await generateCharts(final, opts, opts.outDir);

  // Generate workflow if requested
  if (opts.generateWorkflow) {
    await generateWorkflow(repo);
  }

  // Handle stdout output
  handleStdoutOutput(final, {
    json: opts.json,
    format: opts.format,
    topStats: opts.topStats,
    labelBy: opts.labelBy
  });
}

export { main };
