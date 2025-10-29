// Feature: Console output formatting
// Handles table, CSV, and JSON output to stdout

import type { ContributorBasic } from '../analytics/aggregator.ts';
import { printCSV, printTable } from '../analytics/aggregator.ts';
import {
  formatTopStatsLines,
  parseTopStatsMetrics,
  type TopStatsEntry
} from '../utils/formatting.ts';
import type { ContributorStatsResult } from './stats.ts';

export interface OutputOptions {
  json?: boolean;
  format?: string;
  topStats?: string;
  labelBy?: 'email' | 'name';
}

export function handleStdoutOutput(final: ContributorStatsResult, opts: OutputOptions = {}): void {
  const stdoutWantsJSON = opts.json || String(opts.format || '').toLowerCase() === 'json';
  const stdoutWantsCSV = String(opts.format || '').toLowerCase() === 'csv';
  const labelBy: 'email' | 'name' = final.basic?.labelBy || opts.labelBy || 'name';

  if (stdoutWantsJSON) {
    console.log(JSON.stringify(final, null, 2));
    return;
  }

  const csvContributors: ContributorBasic[] = final.topContributors.map((tc) => ({
    key: tc.email ?? tc.name ?? '',
    name: tc.name ?? '',
    emails: tc.email ? [tc.email] : [],
    commits: tc.commits,
    additions: tc.added,
    deletions: tc.deleted,
    changes: tc.changes,
    firstCommitDate: undefined,
    lastCommitDate: undefined
  }));

  if (stdoutWantsCSV) {
    printCSV(csvContributors, labelBy);
    return;
  }

  if (opts.topStats && opts.topStats.length > 0) {
    console.log('Top stats:');
    const topStatsMetrics = parseTopStatsMetrics(opts.topStats);
    const topStatsRecord: Record<string, TopStatsEntry> = {};
    if (final.topStats) {
      for (const key of Object.keys(final.topStats) as Array<keyof typeof final.topStats>) {
        const value = final.topStats[key];
        if (value) {
          topStatsRecord[key] = value;
        }
      }
    }
    for (const l of formatTopStatsLines(topStatsRecord, topStatsMetrics)) {
      console.log(`- ${l}`);
    }
    console.log('');
  }

  printTable(csvContributors, final.basic.meta, labelBy);
}
