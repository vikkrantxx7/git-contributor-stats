#!/usr/bin/env node

/**
 * Main CLI entry point for git-contributor-stats
 * Modular version using separated concerns
 */
import path from 'path';
import fs from 'fs';
import process from 'process';

// Utilities
import { safeReadPackageJson, ensureDir, tryLoadJSON, countTotalLines } from '../utils/files.js';
import { parseDateInput } from '../utils/dates.js';
import { parseTopStatsMetrics, formatTopStatsLines } from '../utils/formatting.js';

// Git operations
import { runGit, isGitRepo, buildGitLogArgs } from '../git/utils.js';
import { parseGitLog } from '../git/parser.js';

// Analytics
import { aggregateBasic, pickSortMetric, computeMeta, printTable, printCSV } from '../analytics/aggregator.js';
import { analyze } from '../analytics/analyzer.js';
import { buildAliasResolver } from '../analytics/aliases.js';

// Reports
import { generateCSVReport } from '../reports/csv.js';
import { generateMarkdownReport } from '../reports/markdown.js';
import { generateHTMLReport } from '../reports/html.js';

// Charts
import { renderBarChartImage, renderHeatmapImage } from '../charts/renderer.js';
import { generateBarChartSVG, generateHeatmapSVG } from '../charts/svg.js';

// CLI
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

  // Validate repository
  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) {
    console.error(`Not a Git repository: ${repo}`);
    process.exit(2);
  }

  // Load alias configuration
  let aliasConfig = null;
  let aliasPath = null;
  if (opts.aliasFile) {
    aliasPath = path.resolve(process.cwd(), opts.aliasFile);
    aliasConfig = tryLoadJSON(aliasPath);
    if (!aliasConfig) console.error(`Warning: Could not read alias file: ${aliasPath}`);
  } else {
    const defaultAlias = path.join(repo, '.git-contributor-stats-aliases.json');
    aliasConfig = tryLoadJSON(defaultAlias);
    if (aliasConfig) aliasPath = defaultAlias;
  }
  const { resolve: aliasResolveFn, canonicalDetails } = buildAliasResolver(aliasConfig);

  // Parse date inputs
  const since = parseDateInput(opts.since);
  const until = parseDateInput(opts.until);

  // Build and execute git command
  const gitArgs = buildGitLogArgs({
    branch: opts.branch,
    since,
    until,
    author: opts.author,
    includeMerges: !!opts.includeMerges,
    paths
  });

  if (opts.verbose) {
    console.error(`[debug] repo=${repo}`);
    if (aliasPath) console.error(`[debug] aliasFile=${aliasPath}`);
    console.error(`[debug] git ${gitArgs.map(a => (a.includes(' ') ? `'${a}'` : a)).join(' ')}`);
  }

  const result = runGit(repo, gitArgs);
  if (!result.ok) {
    console.error(result.error);
    process.exit(result.code || 2);
  }

  const commits = parseGitLog(result.stdout);
  if (opts.verbose) console.error(`[debug] parsed commits: ${commits.length}`);

  // Basic aggregation for table/CSV stdout
  const groupBy = (opts.groupBy || 'email').toLowerCase() === 'name' ? 'name' : 'email';
  let contributors = aggregateBasic(commits, groupBy);
  const sorter = pickSortMetric(opts.sortBy);
  contributors.sort(sorter);
  if (opts.top && Number.isFinite(opts.top) && opts.top > 0) {
    contributors = contributors.slice(0, opts.top);
  }
  const meta = computeMeta(contributors);

  // Advanced analysis with alias resolution
  const analysis = analyze(
    commits,
    Number.isFinite(opts.similarity) ? opts.similarity : 0.85,
    aliasResolveFn,
    canonicalDetails
  );

  // Count repo total lines (unless disabled)
  let totalLines = 0;
  if (opts.countLines) {
    totalLines = await countTotalLines(repo, runGit);
  }

  // Get repository root
  const repoRootResult = runGit(repo, ['rev-parse', '--show-toplevel']);
  const repoRoot = repoRootResult.ok ? repoRootResult.stdout.trim() : repo;

  // Build final data structure
  const final = {
    meta: {
      generatedAt: new Date().toISOString(),
      repo: repoRoot,
      branch: opts.branch || (runGit(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim() || null,
      since: since || null,
      until: until || null
    },
    totalCommits: analysis.totalCommits,
    totalLines: totalLines,
    contributors: analysis.contributors,
    topContributors: analysis.topContributors,
    topStats: analysis.topStats,
    commitFrequency: analysis.commitFrequency,
    heatmap: analysis.heatmap,
    busFactor: analysis.busFactor,
  };

  // Generate outputs
  await generateOutputs(final, analysis, opts, repoRoot);

  // Generate GitHub workflow if requested
  if (opts.generateWorkflow) {
    await generateWorkflow(repo);
  }

  // Handle stdout output
  await handleStdoutOutput(final, contributors, meta, groupBy, opts);
}

/**
 * Generate all requested output files
 */
async function generateOutputs(final, analysis, opts, repoRoot) {
  const outDir = opts.outDir;
  const writeCSVPath = opts.csv || (outDir ? path.join(outDir, 'contributors.csv') : null);
  const writeMDPath = opts.md || (outDir ? path.join(outDir, 'report.md') : null);
  const writeHTMLPath = opts.html || (outDir ? path.join(outDir, 'report.html') : null);

  // CSV output
  if (writeCSVPath) {
    ensureDir(path.dirname(writeCSVPath));
    const csv = generateCSVReport(analysis);
    fs.writeFileSync(writeCSVPath, csv, 'utf8');
    console.error(`Wrote CSV to ${writeCSVPath}`);
  }

  const topStatsMetrics = parseTopStatsMetrics(opts.topStats);

  // Markdown report
  if (writeMDPath) {
    ensureDir(path.dirname(writeMDPath));
    if (opts.verbose) {
      fs.writeFileSync(
        path.join(path.dirname(writeMDPath), 'debug.txt'),
        `[debug] opts.topStats=${opts.topStats}, includeTopStats=${opts.topStats}\n`
      );
    }
    const md = generateMarkdownReport(
      { ...final, contributors: analysis.contributors, topContributors: analysis.topContributors },
      repoRoot,
      { includeTopStats: opts.topStats, topStatsMetrics }
    );
    fs.writeFileSync(writeMDPath, md, 'utf8');
    console.error(`Wrote Markdown report to ${writeMDPath}`);
  }

  // HTML report
  if (writeHTMLPath) {
    ensureDir(path.dirname(writeHTMLPath));
    const html = generateHTMLReport(
      { ...final, contributors: analysis.contributors, topContributors: analysis.topContributors },
      repoRoot,
      { includeTopStats: opts.topStats, topStatsMetrics }
    );
    fs.writeFileSync(writeHTMLPath, html, 'utf8');
    console.error(`Wrote HTML report to ${writeHTMLPath}`);
  }

  // Charts generation
  await generateCharts(analysis, opts, outDir);
}

/**
 * Generate charts if requested
 */
async function generateCharts(analysis, opts, outDir) {
  const chartsRequested = opts.charts || opts.svg || opts.svgDir;
  if (!chartsRequested) return;

  const chartsDir = outDir ? outDir : (opts.chartsDir || opts.svgDir || path.join(process.cwd(), 'charts'));
  ensureDir(chartsDir);

  const formatOpt = String(opts.chartFormat || 'svg').toLowerCase();
  const formats = formatOpt === 'both' ? ['svg', 'png'] : [formatOpt === 'png' ? 'png' : 'svg'];

  if ((opts.svg || opts.svgDir) && !opts.charts && !opts.chartFormat && !opts.chartsDir) {
    console.error('[warn] --svg/--svg-dir are deprecated; prefer --charts/--charts-dir/--chart-format');
  }

  const names = analysis.topContributors.map(c => c.name || '');
  const commitsVals = analysis.topContributors.map(c => c.commits || 0);
  const netVals = analysis.topContributors.map(c => (c.added || 0) - (c.deleted || 0));

  const chartPromises = [];
  for (const fmt of formats) {
    const ext = fmt === 'svg' ? '.svg' : '.png';
    chartPromises.push(renderBarChartImage(
      fmt,
      'Top contributors by commits',
      names,
      commitsVals,
      path.join(chartsDir, `top-commits${ext}`),
      { limit: 25, verbose: opts.verbose }
    ));
    chartPromises.push(renderBarChartImage(
      fmt,
      'Top contributors by net lines',
      names,
      netVals,
      path.join(chartsDir, `top-net${ext}`),
      { limit: 25, verbose: opts.verbose }
    ));
    chartPromises.push(renderHeatmapImage(
      fmt,
      analysis.heatmap,
      path.join(chartsDir, `heatmap${ext}`),
      { verbose: opts.verbose }
    ));
  }
  await Promise.all(chartPromises);

  // Safety net: ensure SVG files exist
  if (formats.includes('svg')) {
    await ensureFallbackSVGs(chartsDir, names, commitsVals, netVals, analysis.heatmap, opts.verbose);
  }

  console.error(`Wrote ${formats.join('+').toUpperCase()} charts to ${chartsDir}`);
}

/**
 * Ensure fallback SVG files exist
 */
async function ensureFallbackSVGs(chartsDir, names, commitsVals, netVals, heatmap, verbose) {
  const svgFiles = [
    { path: path.join(chartsDir, 'top-commits.svg'), generator: () => generateBarChartSVG('Top contributors by commits', names, commitsVals, { limit: 25 }) },
    { path: path.join(chartsDir, 'top-net.svg'), generator: () => generateBarChartSVG('Top contributors by net lines', names, netVals, { limit: 25 }) },
    { path: path.join(chartsDir, 'heatmap.svg'), generator: () => generateHeatmapSVG(heatmap) }
  ];

  for (const { path: svgPath, generator } of svgFiles) {
    if (!fs.existsSync(svgPath)) {
      try {
        fs.writeFileSync(svgPath, generator(), 'utf8');
      } catch (e) {
        if (verbose) console.error(`[error] Fallback write failed for ${svgPath}: ${e.message}`);
      }
    }
  }
}

/**
 * Generate GitHub Actions workflow
 */
async function generateWorkflow(repo) {
  const wfPath = path.join(repo, '.github', 'workflows', 'git-contributor-stats.yml');
  ensureDir(path.dirname(wfPath));
  const wfContent = `name: Git Contributor Stats
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install deps
        run: npm ci || npm i
      - name: Run report
        run: npx git-contributor-stats --out-dir=./reports --html=reports/report.html --json --svg
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: git-contrib-report
          path: reports
`;
  fs.writeFileSync(wfPath, wfContent, 'utf8');
  console.error(`Wrote sample GitHub Actions workflow to ${wfPath}`);
}

/**
 * Handle stdout output based on format
 */
async function handleStdoutOutput(final, contributors, meta, groupBy, opts) {
  const stdoutWantsJSON = opts.json || String(opts.format || '').toLowerCase() === 'json';
  const stdoutWantsCSV = String(opts.format || '').toLowerCase() === 'csv';

  if (stdoutWantsJSON) {
    console.log(JSON.stringify(final, null, 2));
    return;
  }

  if (stdoutWantsCSV) {
    printCSV(contributors, groupBy);
    return;
  }

  // Default: table output
  if (opts.topStats !== false) {
    console.log('Top stats:');
    const topStatsMetrics = parseTopStatsMetrics(opts.topStats);
    for (const l of formatTopStatsLines(final.topStats || {}, topStatsMetrics)) {
      console.log(`- ${l}`);
    }
    console.log('');
  }
  printTable(contributors, meta, groupBy);
}

// ESM-compatible entry point check
const isMain = (() => {
  try {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    const thisFile = new URL(import.meta.url).pathname;
    return entry && thisFile && entry === thisFile;
  } catch {
    return false;
  }
})();

if (isMain) {
  main(process.argv).catch(err => {
    console.error(err && err.stack || String(err));
    process.exit(2);
  });
}

export { main };
