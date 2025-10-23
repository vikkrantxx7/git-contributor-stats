// Programmatic API for git-contributor-stats (ESM)
// Provides getContributorStats(options) returning the same analysis object used by the CLI.
// This avoids invoking any CLI/parsing logic and is suitable for library consumers.

import fs from 'node:fs';
import path from 'node:path';
import type { ContributorsMeta } from './analytics/aggregator.ts';
// Analytics
import {
  aggregateBasic,
  computeMeta,
  pickSortMetric,
  printCSV,
  printTable
} from './analytics/aggregator.ts';
import { type AliasConfig, buildAliasResolver } from './analytics/aliases.ts';
import { analyze } from './analytics/analyzer.ts';
import type {
  ContributorStatsOptions as ApiContributorStatsOptions,
  BusFactorInfo,
  CommitFrequencyBreakdown,
  ContributorsMapEntry,
  TopContributor,
  TopFileEntry,
  TopStatsSummary
} from './api.ts';
import { renderBarChartImage, renderHeatmapImage } from './charts/renderer.ts';
import { generateBarChartSVG, generateHeatmapSVG } from './charts/svg.ts';
import { parseGitLog } from './git/parser.ts';
// Git
import { buildGitLogArgs, isGitRepo, runGit } from './git/utils.ts';
import { generateCSVReport } from './reports/csv.ts';
import { generateHTMLReport } from './reports/html.ts';
import { generateMarkdownReport } from './reports/markdown.ts';
import { parseDateInput } from './utils/dates.ts';
// Utils
import { countTotalLines, ensureDir, tryLoadJSON } from './utils/files.ts';
import {
  formatTopStatsLines,
  parseTopStatsMetrics,
  type TopStatsEntry
} from './utils/formatting.ts';

export interface ContributorStatsOptions extends ApiContributorStatsOptions {
  outDir?: string;
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
  verbose?: boolean;
}

export interface ContributorStatsResult {
  meta: {
    generatedAt: string;
    repo: string;
    branch: string | null;
    since: string | null;
    until: string | null;
  };
  totalCommits: number;
  totalLines: number;
  contributors: Record<string, ContributorsMapEntry>;
  topContributors: TopContributor[];
  topStats: TopStatsSummary;
  commitFrequency: CommitFrequencyBreakdown;
  heatmap: number[][];
  busFactor: BusFactorInfo;
  basic: {
    contributors: TopContributor[];
    meta: ContributorsMeta;
    groupBy: 'email' | 'name';
  };
}

export async function getContributorStats(
  opts: ContributorStatsOptions = {}
): Promise<ContributorStatsResult> {
  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) throw new Error(`Not a Git repository: ${repo}`);
  const debug = (...msg: unknown[]) => {
    if (opts.verbose) console.error('[debug]', ...msg);
  };

  let aliasConfig: AliasConfig = (opts.aliasConfig as AliasConfig) || undefined;
  let aliasPath: string | null = null;
  if (!aliasConfig) {
    if (opts.aliasFile) {
      aliasPath = path.resolve(process.cwd(), opts.aliasFile);
      aliasConfig = tryLoadJSON(aliasPath) as AliasConfig;
    } else {
      const defaultAlias = path.join(repo, '.git-contributor-stats-aliases.json');
      aliasConfig = tryLoadJSON(defaultAlias) as AliasConfig;
      if (aliasConfig) aliasPath = defaultAlias;
    }
  }
  if (aliasPath) debug(`aliasFile=${aliasPath}`);
  debug(`repo=${repo}`);

  const { resolve: aliasResolveFn, canonicalDetails } = buildAliasResolver(aliasConfig);

  const since = parseDateInput(opts.since);
  const until = parseDateInput(opts.until);
  const paths = Array.isArray(opts.paths) ? opts.paths : opts.paths ? [opts.paths] : [];

  const gitArgs = buildGitLogArgs({
    branch: opts.branch,
    since,
    until,
    author: opts.author,
    includeMerges: !!opts.includeMerges,
    paths
  });
  debug('git', gitArgs.map((a) => (a.includes(' ') ? `'${a}'` : a)).join(' '));

  const result = runGit(repo, gitArgs);
  if (!result.ok) throw new Error(result.error || 'Failed to run git log');
  const commits = parseGitLog(result.stdout);
  debug(`parsed commits: ${commits.length}`);

  const groupBy = (opts.groupBy || 'email').toLowerCase() === 'name' ? 'name' : 'email';
  let contributorsBasic = aggregateBasic(commits, groupBy);
  const sorter = pickSortMetric(opts.sortBy || 'changes');
  contributorsBasic.sort(sorter);
  if (opts.top && Number.isFinite(opts.top) && opts.top > 0) {
    contributorsBasic = contributorsBasic.slice(0, opts.top);
  }
  const meta: ContributorsMeta = computeMeta(contributorsBasic);

  const analysis = analyze(commits, opts.similarity ?? 0.85, aliasResolveFn, canonicalDetails);

  let totalLines = 0;
  if (opts.countLines !== false) {
    totalLines = await countTotalLines(repo, runGit);
  }

  const repoRootResult = runGit(repo, ['rev-parse', '--show-toplevel']);
  const repoRoot = repoRootResult.ok ? (repoRootResult.stdout?.trim() ?? repo) : repo;
  const branch =
    opts.branch ||
    (runGit(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim() ||
    null;

  const final: ContributorStatsResult = {
    meta: {
      generatedAt: new Date().toISOString(),
      repo: repoRoot,
      branch,
      since: since || null,
      until: until || null
    },
    totalCommits: analysis.totalCommits,
    totalLines,
    contributors: analysis.contributors,
    topContributors: analysis.topContributors,
    topStats: analysis.topStats,
    commitFrequency: analysis.commitFrequency,
    heatmap: analysis.heatmap,
    busFactor: analysis.busFactor,
    basic: { contributors: analysis.topContributors, meta, groupBy }
  };

  return final;
}

export async function generateOutputs(
  final: ContributorStatsResult,
  opts: ContributorStatsOptions = {}
): Promise<void> {
  const outDir = opts.outDir;
  const writeCSVPath = opts.csv || (outDir ? path.join(outDir, 'contributors.csv') : undefined);
  const writeMDPath = opts.md || (outDir ? path.join(outDir, 'report.md') : undefined);
  const writeHTMLPath = opts.html || (outDir ? path.join(outDir, 'report.html') : undefined);

  // Helper to map TopContributor to Contributor for reports
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

  if (writeCSVPath) {
    ensureDir(path.dirname(writeCSVPath));
    const csv = generateCSVReport({ topContributors: final.topContributors });
    fs.writeFileSync(writeCSVPath, csv, 'utf8');
    console.error(`Wrote CSV to ${writeCSVPath}`);
  }

  const topStatsMetrics = parseTopStatsMetrics(opts.topStats);

  if (writeMDPath) {
    ensureDir(path.dirname(writeMDPath));
    // Map TopContributor to Contributor for markdown report
    const analysisData = {
      ...final,
      topContributors: final.topContributors.map(toReportContributor)
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
    // Map TopContributor to Contributor for HTML report
    const analysisData = {
      ...final,
      topContributors: final.topContributors.map(toReportContributor)
    };
    const html = generateHTMLReport(analysisData, final.meta.repo, {
      includeTopStats: !!opts.topStats,
      topStatsMetrics
    });
    fs.writeFileSync(writeHTMLPath, html, 'utf8');
    console.error(`Wrote HTML report to ${writeHTMLPath}`);
  }

  await generateCharts(final, opts, outDir);
}

export async function generateCharts(
  final: ContributorStatsResult,
  opts: ContributorStatsOptions = {},
  outDir?: string
): Promise<void> {
  const chartsRequested = opts.charts || opts.svg || opts.svgDir;
  if (!chartsRequested) return;

  const chartsDir = outDir || opts.chartsDir || opts.svgDir || path.join(process.cwd(), 'charts');
  ensureDir(chartsDir);

  const formatOpt = String(opts.chartFormat || 'svg').toLowerCase();
  const formats = formatOpt === 'both' ? ['svg', 'png'] : [formatOpt === 'png' ? 'png' : 'svg'];

  if ((opts.svg || opts.svgDir) && !opts.charts && !opts.chartFormat && !opts.chartsDir) {
    console.error(
      '[warn] --svg/--svg-dir are deprecated; prefer --charts/--charts-dir/--chart-format'
    );
  }

  const names = final.topContributors.map((c) => String(c.name || ''));
  const commitsVals = final.topContributors.map((c) => Number(c.commits || 0));
  const netVals = final.topContributors.map((c) => Number(c.added || 0) - Number(c.deleted || 0));

  const tasks: Promise<void>[] = [];
  for (const fmt of formats) {
    const ext = fmt === 'svg' ? '.svg' : '.png';
    tasks.push(
      renderBarChartImage(
        fmt,
        'Top contributors by commits',
        names,
        commitsVals,
        path.join(chartsDir, `top-commits${ext}`),
        { limit: 25, verbose: opts.verbose }
      ),
      renderBarChartImage(
        fmt,
        'Top contributors by net lines',
        names,
        netVals,
        path.join(chartsDir, `top-net${ext}`),
        { limit: 25, verbose: opts.verbose }
      ),
      renderHeatmapImage(fmt, final.heatmap, path.join(chartsDir, `heatmap${ext}`), {
        verbose: opts.verbose
      })
    );
  }
  await Promise.all(tasks);

  if (formats.includes('svg')) {
    await ensureFallbackSVGs(chartsDir, names, commitsVals, netVals, final.heatmap, opts.verbose);
  }
  console.error(`Wrote ${formats.join('+').toUpperCase()} charts to ${chartsDir}`);
}

export async function ensureFallbackSVGs(
  chartsDir: string,
  names: string[],
  commitsVals: number[],
  netVals: number[],
  heatmap: number[][],
  verbose?: boolean
): Promise<void> {
  const svgFiles = [
    {
      path: path.join(chartsDir, 'top-commits.svg'),
      gen: () =>
        generateBarChartSVG('Top contributors by commits', names, commitsVals, { limit: 25 })
    },
    {
      path: path.join(chartsDir, 'top-net.svg'),
      gen: () => generateBarChartSVG('Top contributors by net lines', names, netVals, { limit: 25 })
    },
    { path: path.join(chartsDir, 'heatmap.svg'), gen: () => generateHeatmapSVG(heatmap) }
  ];
  for (const { path: svgPath, gen } of svgFiles) {
    if (!fs.existsSync(svgPath)) {
      try {
        fs.writeFileSync(svgPath, gen(), 'utf8');
      } catch (e) {
        if (verbose) console.error('[error] Fallback write failed', svgPath, (e as Error).message);
      }
    }
  }
}

export async function generateWorkflow(repo: string): Promise<void> {
  const wfPath = path.join(repo, '.github', 'workflows', 'git-contributor-stats.yml');
  ensureDir(path.dirname(wfPath));
  const content = `name: Git Contributor Stats\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\n\njobs:\n  report:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '18'\n      - name: Install deps\n        run: npm ci || npm i\n      - name: Run report\n        run: npx git-contributor-stats --out-dir=./reports --html=reports/report.html --json --svg\n      - name: Upload report\n        uses: actions/upload-artifact@v4\n        with:\n          name: git-contrib-report\n          path: reports\n`;
  fs.writeFileSync(wfPath, content, 'utf8');
  console.error(`Wrote sample GitHub Actions workflow to ${wfPath}`);
}

export function handleStdoutOutput(
  final: ContributorStatsResult,
  opts: ContributorStatsOptions = {}
): void {
  const stdoutWantsJSON = opts.json || String(opts.format || '').toLowerCase() === 'json';
  const stdoutWantsCSV = String(opts.format || '').toLowerCase() === 'csv';
  const groupBy: 'email' | 'name' = final.basic?.groupBy || opts.groupBy || 'email';

  if (stdoutWantsJSON) {
    console.log(JSON.stringify(final, null, 2));
    return;
  }
  if (stdoutWantsCSV) {
    // Map TopContributor to ContributorBasic
    const csvContributors = final.basic.contributors.map((tc) => ({
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
    printCSV(csvContributors, groupBy);
    return;
  }

  if (opts.topStats && opts.topStats.length > 0) {
    console.log('Top stats:');
    const topStatsMetrics = parseTopStatsMetrics(opts.topStats);
    // Convert TopStatsSummary to Record<string, TopStatsEntry>
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
  // Map TopContributor to ContributorBasic for printTable
  const tableContributors = final.basic.contributors.map((tc) => ({
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
  printTable(tableContributors, final.basic.meta, groupBy);
}

export { parseDateInput, analyze, buildAliasResolver };
