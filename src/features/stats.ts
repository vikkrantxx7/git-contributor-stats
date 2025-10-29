// Feature: Core statistics generation
// This module provides the main getContributorStats function for library consumers

import path from 'node:path';
import type { ContributorsMeta } from '../analytics/aggregator.ts';
import { aggregateBasic, computeMeta, pickSortMetric } from '../analytics/aggregator.ts';
import { type AliasConfig, buildAliasResolver } from '../analytics/aliases.ts';
import type {
  ContributorsMapEntry,
  TopContributor,
  TopStatsSummary
} from '../analytics/analyzer.ts';
import { analyze } from '../analytics/analyzer.ts';
import { parseGitLog } from '../git/parser.ts';
import { buildGitLogArgs, isGitRepo, runGit } from '../git/utils.ts';
import { parseDateInput } from '../utils/dates.ts';
import { countTotalLines, tryLoadJSON } from '../utils/files.ts';

export interface ContributorStatsOptions {
  repo?: string;
  branch?: string;
  paths?: string | string[];
  since?: string;
  until?: string;
  author?: string;
  includeMerges?: boolean;
  groupBy?: 'email' | 'name';
  labelBy?: 'email' | 'name';
  sortBy?: 'changes' | 'commits' | 'additions' | 'deletions';
  top?: number;
  similarity?: number;
  aliasFile?: string;
  aliasConfig?: AliasConfig;
  countLines?: boolean;
  verbose?: boolean;
}

export interface CommitFrequencyBreakdown {
  monthly: Record<string, number>;
  weekly: Record<string, number>;
}

export interface BusFactorInfo {
  busFactor: number;
  candidates: string[];
  details?: Record<string, unknown>;
  filesSingleOwner?: { file: string; owner: string; changes: number }[];
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
  heatmapContributors: Record<string, Record<string, number>>;
  busFactor: BusFactorInfo;
  basic: {
    meta: ContributorsMeta;
    groupBy: 'email' | 'name';
    labelBy: 'email' | 'name';
  };
}

function loadAliasConfig(
  opts: ContributorStatsOptions,
  repo: string
): { config: AliasConfig; path: string | null } {
  let aliasConfig: AliasConfig = opts.aliasConfig ?? undefined;
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

  return { config: aliasConfig, path: aliasPath };
}

function normalizePaths(paths: string | string[] | undefined): string[] {
  if (Array.isArray(paths)) {
    return paths;
  }
  if (paths) {
    return [paths];
  }
  return [];
}

function getRepoBranch(repo: string, optsBranch?: string): string | null {
  if (optsBranch) return optsBranch;
  const result = runGit(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return result.stdout?.trim() || null;
}

export async function getContributorStats(
  opts: ContributorStatsOptions = {}
): Promise<ContributorStatsResult> {
  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) throw new Error(`Not a Git repository: ${repo}`);

  const debug = (...msg: unknown[]) => {
    if (opts.verbose) console.error('[debug]', ...msg);
  };

  const { config: aliasConfig, path: aliasPath } = loadAliasConfig(opts, repo);
  if (aliasPath) debug(`aliasFile=${aliasPath}`);
  debug(`repo=${repo}`);

  const { resolve: aliasResolveFn, canonicalDetails } = buildAliasResolver(aliasConfig);

  const since = parseDateInput(opts.since);
  const until = parseDateInput(opts.until);
  const paths = normalizePaths(opts.paths);

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
  const labelBy = opts.labelBy?.toLowerCase() === 'email' ? 'email' : 'name';
  const similarityThreshold = opts.similarity ?? 0.85;

  let contributorsBasic = aggregateBasic(commits, {
    groupBy,
    aliasResolver: aliasResolveFn,
    canonicalDetails,
    similarity: similarityThreshold
  });
  const sorter = pickSortMetric(opts.sortBy || 'changes');
  contributorsBasic.sort(sorter);
  if (opts.top && Number.isFinite(opts.top) && opts.top > 0) {
    contributorsBasic = contributorsBasic.slice(0, opts.top);
  }
  const meta: ContributorsMeta = computeMeta(contributorsBasic);

  const analysis = analyze(commits, similarityThreshold, aliasResolveFn, canonicalDetails, groupBy);

  let topContributors = analysis.topContributors;
  if (opts.sortBy && opts.sortBy !== 'commits') {
    const metricSorter = pickSortMetric(opts.sortBy);
    topContributors = [...topContributors].sort(metricSorter);
  }
  if (opts.top && Number.isFinite(opts.top) && opts.top > 0) {
    topContributors = topContributors.slice(0, opts.top);
  }

  let totalLines = 0;
  if (opts.countLines !== false) {
    totalLines = await countTotalLines(repo, runGit);
  }

  const repoRootResult = runGit(repo, ['rev-parse', '--show-toplevel']);
  const repoRoot = repoRootResult.ok ? (repoRootResult.stdout?.trim() ?? repo) : repo;
  const branch = getRepoBranch(repo, opts.branch);

  return {
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
    topContributors,
    topStats: analysis.topStats,
    commitFrequency: analysis.commitFrequency,
    heatmap: analysis.heatmap,
    heatmapContributors: analysis.heatmapContributors,
    busFactor: {
      busFactor: analysis.busFactor.busFactor ?? 0,
      candidates: analysis.busFactor.candidates ?? [],
      details: analysis.busFactor.details,
      filesSingleOwner: analysis.busFactor.filesSingleOwner
    },
    basic: { meta, groupBy, labelBy }
  };
}
