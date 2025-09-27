// Programmatic API for git-contributor-stats (ESM)
// Provides getContributorStats(options) returning the same analysis object used by the CLI.
// This avoids invoking any CLI/parsing logic and is suitable for library consumers.

import path from 'path';
import fs from 'fs';

// Utils
import { safeReadPackageJson, tryLoadJSON, countTotalLines } from './utils/files.js';
import { parseDateInput } from './utils/dates.js';
import { parseTopStatsMetrics } from './utils/formatting.js';

// Git
import { runGit, isGitRepo, buildGitLogArgs } from './git/utils.js';
import { parseGitLog } from './git/parser.js';

// Analytics
import { aggregateBasic, pickSortMetric, computeMeta } from './analytics/aggregator.js';
import { analyze } from './analytics/analyzer.js';
import { buildAliasResolver } from './analytics/aliases.js';

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
 */

/**
 * Get contributor statistics programmatically.
 * Returns an object comparable to the CLI JSON output.
 * @param {ContributorStatsOptions} opts
 */
export async function getContributorStats(opts = {}) {
  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) throw new Error(`Not a Git repository: ${repo}`);

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

  const result = runGit(repo, gitArgs);
  if (!result.ok) throw new Error(result.error || 'Failed to run git log');
  const commits = parseGitLog(result.stdout);

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
    basic: { contributors: contributorsBasic, meta }
  };

  return final;
}

export { parseDateInput, analyze, buildAliasResolver };

