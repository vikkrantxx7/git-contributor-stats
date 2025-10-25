// Feature: Report generation (CSV, Markdown, HTML)
// Separated from core stats to enable tree-shaking when reports aren't needed

import fs from 'node:fs';
import path from 'node:path';
import type { TopContributor, TopFileEntry } from '../analytics/analyzer.ts';
import { generateCSVReport } from '../reports/csv.ts';
import { generateHTMLReport } from '../reports/html.ts';
import { generateMarkdownReport } from '../reports/markdown.ts';
import { ensureDir } from '../utils/files.ts';
import { parseTopStatsMetrics } from '../utils/formatting.ts';
import type { ContributorStatsResult } from './stats.ts';

export interface ReportOptions {
  outDir?: string;
  csv?: string;
  md?: string;
  html?: string;
  topStats?: string;
  verbose?: boolean;
}

function toReportContributor(tc: TopContributor): {
  name: string;
  email: string;
  commits: number;
  added: number;
  deleted: number;
  topFiles: TopFileEntry[];
} {
  return {
    name: tc.name ?? '',
    email: tc.email ? tc.email : '',
    commits: tc.commits,
    added: tc.added,
    deleted: tc.deleted,
    topFiles: tc.topFiles ?? []
  };
}

export async function generateReports(
  final: ContributorStatsResult,
  opts: ReportOptions = {}
): Promise<void> {
  const outDir = opts.outDir;
  const writeCSVPath = opts.csv || (outDir ? path.join(outDir, 'contributors.csv') : undefined);
  const writeMDPath = opts.md || (outDir ? path.join(outDir, 'report.md') : undefined);
  const writeHTMLPath = opts.html || (outDir ? path.join(outDir, 'report.html') : undefined);

  if (writeCSVPath) {
    ensureDir(path.dirname(writeCSVPath));
    const csv = generateCSVReport({ topContributors: final.topContributors });
    fs.writeFileSync(writeCSVPath, csv, 'utf8');
    console.error(`Wrote CSV to ${writeCSVPath}`);
  }

  const topStatsMetrics = parseTopStatsMetrics(opts.topStats);

  if (writeMDPath) {
    ensureDir(path.dirname(writeMDPath));
    const analysisData = {
      ...final,
      topContributors: final.topContributors.map(toReportContributor),
      busFactor: {
        ...final.busFactor,
        filesSingleOwner: final.busFactor.filesSingleOwner ?? []
      }
    };
    const md = generateMarkdownReport(analysisData, final.meta.repo, {
      includeTopStats: !!opts.topStats,
      topStatsMetrics
    });
    fs.writeFileSync(writeMDPath, md, 'utf8');
    console.error(`Wrote Markdown report to ${writeMDPath}`);
  }

  if (writeHTMLPath) {
    ensureDir(path.dirname(writeHTMLPath));
    const analysisData = {
      ...final,
      topContributors: final.topContributors.map(toReportContributor),
      busFactor: {
        ...final.busFactor,
        filesSingleOwner: final.busFactor.filesSingleOwner ?? []
      }
    };
    const html = generateHTMLReport(analysisData, final.meta.repo, {
      includeTopStats: !!opts.topStats,
      topStatsMetrics
    });
    fs.writeFileSync(writeHTMLPath, html, 'utf8');
    console.error(`Wrote HTML report to ${writeHTMLPath}`);
  }
}
