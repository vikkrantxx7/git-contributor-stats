// Programmatic API for git-contributor-stats (ESM)
// Provides getContributorStats(options) returning the same analysis object used by the CLI.
// This avoids invoking any CLI/parsing logic and is suitable for library consumers.

import path from 'node:path';
import fs from 'node:fs';

// Utils
import { tryLoadJSON, countTotalLines, ensureDir } from './utils/files.js';
import { parseDateInput } from './utils/dates.js';
import { formatTopStatsLines, parseTopStatsMetrics } from './utils/formatting.js';

// Git
import { runGit, isGitRepo, buildGitLogArgs } from './git/utils.js';
import { parseGitLog } from './git/parser.js';

// Analytics
import { aggregateBasic, pickSortMetric, computeMeta, printTable, printCSV } from './analytics/aggregator.js';
import { analyze } from './analytics/analyzer.js';
import { buildAliasResolver } from './analytics/aliases.js';
import { generateCSVReport } from './reports/csv.js';
import { generateMarkdownReport } from './reports/markdown.js';
import { generateHTMLReport } from './reports/html.js';
import { renderBarChartImage, renderHeatmapImage } from './charts/renderer.js';
import { generateBarChartSVG, generateHeatmapSVG } from './charts/svg.js';

/**
 * @typedef {Object} ContributorStatsOptions
 * @property {string} [repo='.'] Path to git repository
 * @property {string} [branch] Branch or revision range
 * @property {string|string[]} [paths] Optional pathspec(s)
 * @property {string} [since] Date or relative spec (e.g. '30.days')
 * @property {string} [until] Date upper bound
 * @property {string} [author] Author filter (git supported pattern)
 * @property {boolean} [includeMerges=false] Include merge commits
 * @property {string} [groupBy='email'] email | name (basic aggregation helper)
 * @property {string} [sortBy='changes'] changes | commits | additions | deletions
 * @property {number} [top] limit for basic aggregated contributors list
 * @property {number} [similarity=0.85] similarity threshold for merging similar identities
 * @property {string} [aliasFile] path to alias JSON file
 * @property {object|Array} [aliasConfig] alias config object (takes precedence over aliasFile)
 * @property {boolean} [countLines=true] Whether to count repository total lines
 * @property {boolean} [includeTopStats=true] Whether to include computed topStats (always computed internally)
 * @property {boolean} [verbose=false] Enable verbose debug output
 */

/**
 * Get contributor statistics programmatically.
 * Returns an object comparable to the CLI JSON output.
 * @param {ContributorStatsOptions} opts
 */
export async function getContributorStats(opts = {}) {
  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) throw new Error(`Not a Git repository: ${repo}`);
  const debug = (...msg) => { if (opts.verbose) console.error('[debug]', ...msg); };

  // Load alias configuration (precedence: aliasConfig param > aliasFile > default file)
  let aliasConfig = opts.aliasConfig || null;
  let aliasPath = null;
  if (!aliasConfig) {
    if (opts.aliasFile) {
      aliasPath = path.resolve(process.cwd(), opts.aliasFile);
      aliasConfig = tryLoadJSON(aliasPath);
    } else {
      const defaultAlias = path.join(repo, '.git-contributor-stats-aliases.json');
      aliasConfig = tryLoadJSON(defaultAlias);
      if (aliasConfig) aliasPath = defaultAlias;
    }
  }
  if (aliasPath) debug(`aliasFile=${aliasPath}`);
  debug(`repo=${repo}`);

  const { resolve: aliasResolveFn, canonicalDetails } = buildAliasResolver(aliasConfig);

  const since = parseDateInput(opts.since);
  const until = parseDateInput(opts.until);
  const paths = Array.isArray(opts.paths) ? opts.paths : (opts.paths ? [opts.paths] : []);

  const gitArgs = buildGitLogArgs({
    branch: opts.branch,
    since,
    until,
    author: opts.author,
    includeMerges: !!opts.includeMerges,
    paths
  });
  debug('git', gitArgs.map(a => (a.includes(' ') ? `'${a}'` : a)).join(' '));

  const result = runGit(repo, gitArgs);
  if (!result.ok) throw new Error(result.error || 'Failed to run git log');
  const commits = parseGitLog(result.stdout);
  debug(`parsed commits: ${commits.length}`);

  // Basic aggregation (if caller wants it)
  const groupBy = (opts.groupBy || 'email').toLowerCase() === 'name' ? 'name' : 'email';
  let contributorsBasic = aggregateBasic(commits, groupBy);
  const sorter = pickSortMetric(opts.sortBy || 'changes');
  contributorsBasic.sort(sorter);
  if (opts.top && Number.isFinite(opts.top) && opts.top > 0) {
    contributorsBasic = contributorsBasic.slice(0, opts.top);
  }
  const meta = computeMeta(contributorsBasic);

  // Advanced analysis
  const analysis = analyze(
    commits,
    Number.isFinite(opts.similarity) ? opts.similarity : 0.85,
    aliasResolveFn,
    canonicalDetails
  );

  // Count lines
  let totalLines = 0;
  if (opts.countLines !== false) {
    totalLines = await countTotalLines(repo, runGit);
  }

  // Determine repo root & branch
  const repoRootResult = runGit(repo, ['rev-parse', '--show-toplevel']);
  const repoRoot = repoRootResult.ok ? repoRootResult.stdout.trim() : repo;
  const branch = opts.branch || (runGit(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim() || null;

  const final = {
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
    // Additional convenience exports
    basic: { contributors: contributorsBasic, meta, groupBy }
  };

  return final;
}

// ---------------------------
// Output / Report Helper APIs
// ---------------------------

/**
 * Generate all requested file outputs (CSV / MD / HTML / Charts) based on options.
 * @param {object} final - Result from getContributorStats
 * @param {object} opts - CLI-like options controlling outputs
 */
export async function generateOutputs(final, opts = {}) {
  const outDir = opts.outDir;
  const writeCSVPath = opts.csv || (outDir ? path.join(outDir, 'contributors.csv') : null);
  const writeMDPath = opts.md || (outDir ? path.join(outDir, 'report.md') : null);
  const writeHTMLPath = opts.html || (outDir ? path.join(outDir, 'report.html') : null);

  if (writeCSVPath) {
    ensureDir(path.dirname(writeCSVPath));
    const csv = generateCSVReport({ topContributors: final.topContributors });
    fs.writeFileSync(writeCSVPath, csv, 'utf8');
    console.error(`Wrote CSV to ${writeCSVPath}`);
  }

  const topStatsMetrics = parseTopStatsMetrics(opts.topStats);

  if (writeMDPath) {
    ensureDir(path.dirname(writeMDPath));
    const md = generateMarkdownReport(final, final.meta.repo, { includeTopStats: opts.topStats, topStatsMetrics });
    fs.writeFileSync(writeMDPath, md, 'utf8');
    console.error(`Wrote Markdown report to ${writeMDPath}`);
  }

  if (writeHTMLPath) {
    ensureDir(path.dirname(writeHTMLPath));
    const html = generateHTMLReport(final, final.meta.repo, { includeTopStats: opts.topStats, topStatsMetrics });
    fs.writeFileSync(writeHTMLPath, html, 'utf8');
    console.error(`Wrote HTML report to ${writeHTMLPath}`);
  }

  await generateCharts(final, opts, outDir);
}

/**
 * Generate charts (SVG/PNG) if requested.
 */
export async function generateCharts(final, opts = {}, outDir) {
  const chartsRequested = opts.charts || opts.svg || opts.svgDir;
  if (!chartsRequested) return;

  const chartsDir = outDir ? outDir : (opts.chartsDir || opts.svgDir || path.join(process.cwd(), 'charts'));
  ensureDir(chartsDir);

  const formatOpt = String(opts.chartFormat || 'svg').toLowerCase();
  const formats = formatOpt === 'both' ? ['svg', 'png'] : [formatOpt === 'png' ? 'png' : 'svg'];

  if ((opts.svg || opts.svgDir) && !opts.charts && !opts.chartFormat && !opts.chartsDir) {
    console.error('[warn] --svg/--svg-dir are deprecated; prefer --charts/--charts-dir/--chart-format');
  }

  const names = final.topContributors.map(c => c.name || '');
  const commitsVals = final.topContributors.map(c => c.commits || 0);
  const netVals = final.topContributors.map(c => (c.added || 0) - (c.deleted || 0));

  const tasks = [];
  for (const fmt of formats) {
    const ext = fmt === 'svg' ? '.svg' : '.png';
    tasks.push(renderBarChartImage(fmt, 'Top contributors by commits', names, commitsVals, path.join(chartsDir, `top-commits${ext}`), { limit: 25, verbose: opts.verbose }));
    tasks.push(renderBarChartImage(fmt, 'Top contributors by net lines', names, netVals, path.join(chartsDir, `top-net${ext}`), { limit: 25, verbose: opts.verbose }));
    tasks.push(renderHeatmapImage(fmt, final.heatmap, path.join(chartsDir, `heatmap${ext}`), { verbose: opts.verbose }));
  }
  await Promise.all(tasks);

  if (formats.includes('svg')) {
    await ensureFallbackSVGs(chartsDir, names, commitsVals, netVals, final.heatmap, opts.verbose);
  }
  console.error(`Wrote ${formats.join('+').toUpperCase()} charts to ${chartsDir}`);
}

export async function ensureFallbackSVGs(chartsDir, names, commitsVals, netVals, heatmap, verbose) {
  const svgFiles = [
    { path: path.join(chartsDir, 'top-commits.svg'), gen: () => generateBarChartSVG('Top contributors by commits', names, commitsVals, { limit: 25 }) },
    { path: path.join(chartsDir, 'top-net.svg'), gen: () => generateBarChartSVG('Top contributors by net lines', names, netVals, { limit: 25 }) },
    { path: path.join(chartsDir, 'heatmap.svg'), gen: () => generateHeatmapSVG(heatmap) }
  ];
  for (const { path: svgPath, gen } of svgFiles) {
    if (!fs.existsSync(svgPath)) {
      try { fs.writeFileSync(svgPath, gen(), 'utf8'); } catch (e) { if (verbose) console.error('[error] Fallback write failed', svgPath, e.message); }
    }
  }
}

export async function generateWorkflow(repo) {
  const wfPath = path.join(repo, '.github', 'workflows', 'git-contributor-stats.yml');
  ensureDir(path.dirname(wfPath));
  const content = `name: Git Contributor Stats\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\n\njobs:\n  report:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '18'\n      - name: Install deps\n        run: npm ci || npm i\n      - name: Run report\n        run: npx git-contributor-stats --out-dir=./reports --html=reports/report.html --json --svg\n      - name: Upload report\n        uses: actions/upload-artifact@v4\n        with:\n          name: git-contrib-report\n          path: reports\n`;
  fs.writeFileSync(wfPath, content, 'utf8');
  console.error(`Wrote sample GitHub Actions workflow to ${wfPath}`);
}

/**
 * Print to stdout based on options (table / json / csv)
 */
export function handleStdoutOutput(final, opts = {}) {
  const stdoutWantsJSON = opts.json || String(opts.format || '').toLowerCase() === 'json';
  const stdoutWantsCSV = String(opts.format || '').toLowerCase() === 'csv';
  const groupBy = (final.basic && final.basic.groupBy) || (opts.groupBy || 'email');

  if (stdoutWantsJSON) {
    console.log(JSON.stringify(final, null, 2));
    return;
  }
  if (stdoutWantsCSV) {
    printCSV(final.basic.contributors, groupBy);
    return;
  }

  if (opts.topStats !== false) {
    console.log('Top stats:');
    const topStatsMetrics = parseTopStatsMetrics(opts.topStats);
    for (const l of formatTopStatsLines(final.topStats || {}, topStatsMetrics)) {
      console.log(`- ${l}`);
    }
    console.log('');
  }
  printTable(final.basic.contributors, final.basic.meta, groupBy);
}

export { parseDateInput, analyze, buildAliasResolver };

