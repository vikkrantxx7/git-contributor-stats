import { isoWeekKey } from '../utils/dates.ts';
import { findSimilarKey, getDisplayDetails, normalizeKey } from './aggregator.ts';

export interface FileStats {
  changes: number;
  added: number;
  deleted: number;
}

export interface TopFileEntry {
  filename: string;
  changes: number;
  added: number;
  deleted: number;
}

export interface TopContributor {
  name?: string;
  email?: string;
  commits: number;
  added: number;
  deleted: number;
  net: number;
  changes: number;
  files: Record<string, FileStats>;
  topFiles: TopFileEntry[];
}

export interface ContributorsMapEntry {
  name?: string;
  email?: string;
  commits: number;
  added: number;
  deleted: number;
  files: Record<string, FileStats>;
}

export interface TopStatsSummary {
  byCommits: TopContributor | null;
  byAdditions: TopContributor | null;
  byDeletions: TopContributor | null;
  byNet: TopContributor | null;
  byChanges: TopContributor | null;
}

type Commit = {
  authorName?: string;
  authorEmail?: string;
  date?: string | Date;
  files?: Array<{ filename: string; added: number; deleted: number }>;
};

function mergeFilesIntoTarget(target: ContributorsMapEntry, src: ContributorsMapEntry): void {
  for (const [fName, info] of Object.entries(src.files || {})) {
    const inf = info as { changes: number; added: number; deleted: number };
    if (!target.files[fName]) {
      target.files[fName] = { changes: 0, added: 0, deleted: 0 };
    }
    target.files[fName].changes += inf.changes;
    target.files[fName].added += inf.added;
    target.files[fName].deleted += inf.deleted;
  }
}

function mergeContributorIntoTarget(target: ContributorsMapEntry, src: ContributorsMapEntry): void {
  target.commits += src.commits;
  target.added += src.added;
  target.deleted += src.deleted;
  mergeFilesIntoTarget(target, src);
}

export function mergeSimilarContributors(
  contribMap: Record<string, ContributorsMapEntry>,
  threshold: number
) {
  const keys = Object.keys(contribMap);
  const merged: Record<string, ContributorsMapEntry & { normalized?: string }> = {};

  for (const key of keys) {
    const found = findSimilarKey(key, Object.keys(merged), threshold);

    if (found) {
      mergeContributorIntoTarget(merged[found], contribMap[key]);
    } else {
      const src = contribMap[key];
      merged[key] = {
        normalized: key,
        name: src.name,
        email: src.email,
        commits: src.commits,
        added: src.added,
        deleted: src.deleted,
        files: { ...src.files }
      } as ContributorsMapEntry & { normalized?: string };
    }
  }

  return merged;
}

function getOrCreateContributor(
  contribMap: Record<string, ContributorsMapEntry>,
  normalized: string,
  name: string,
  email: string,
  canonicalDetails?: Map<string, { name?: string; email?: string }>
): ContributorsMapEntry {
  if (!contribMap[normalized]) {
    const { name: displayName, email: displayEmail } = getDisplayDetails(
      normalized,
      name,
      email,
      canonicalDetails
    );
    contribMap[normalized] = {
      name: displayName,
      email: displayEmail,
      commits: 0,
      added: 0,
      deleted: 0,
      files: {}
    } as ContributorsMapEntry;
  }
  return contribMap[normalized];
}

function updateCommitFrequency(
  date: Date | null,
  commitFrequencyMonthly: Record<string, number>,
  commitFrequencyWeekly: Record<string, number>,
  heatmap: number[][],
  heatmapContributors: Record<string, Record<string, number>>,
  contributorName: string
): void {
  if (!date) return;

  const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  commitFrequencyMonthly[monthKey] = (commitFrequencyMonthly[monthKey] || 0) + 1;

  const weekKey = isoWeekKey(date);
  commitFrequencyWeekly[weekKey] = (commitFrequencyWeekly[weekKey] || 0) + 1;

  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  heatmap[day][hour] += 1;

  // Track contributors for this time slot
  const key = `${day}-${hour}`;
  if (!heatmapContributors[key]) {
    heatmapContributors[key] = {};
  }
  heatmapContributors[key][contributorName] = (heatmapContributors[key][contributorName] || 0) + 1;
}

function processCommitFiles(
  commit: Commit,
  contrib: ContributorsMapEntry,
  fileToContributors: Record<string, Set<string>>,
  normalized: string
): void {
  for (const f of commit.files || []) {
    const fName = f.filename;
    contrib.added += f.added;
    contrib.deleted += f.deleted;

    if (!contrib.files[fName]) {
      contrib.files[fName] = { changes: 0, added: 0, deleted: 0 };
    }
    contrib.files[fName].changes += f.added + f.deleted;
    contrib.files[fName].added += f.added;
    contrib.files[fName].deleted += f.deleted;

    if (!fileToContributors[fName]) {
      fileToContributors[fName] = new Set();
    }
    fileToContributors[fName].add(normalized);
  }
}

function buildTopContributors(
  merged: Record<string, ContributorsMapEntry & { normalized?: string }>
): TopContributor[] {
  return Object.values(merged)
    .map((c: ContributorsMapEntry & { normalized?: string }) => {
      const filesArr: TopFileEntry[] = Object.entries(c.files || {}).map(([filename, info]) => {
        const inf = info as { changes: number; added: number; deleted: number };
        return {
          filename,
          changes: inf.changes,
          added: inf.added,
          deleted: inf.deleted
        };
      });
      filesArr.sort((a, b) => b.changes - a.changes);

      return {
        name: c.name,
        email: c.email,
        commits: c.commits,
        added: c.added,
        deleted: c.deleted,
        net: c.added - c.deleted,
        changes: c.added + c.deleted,
        files: c.files,
        topFiles: filesArr
      } as TopContributor;
    })
    .sort((a, b) => b.commits - a.commits);
}

function buildBusFactor(
  fileToContributors: Record<string, Set<string>>,
  merged: Record<string, ContributorsMapEntry & { normalized?: string }>,
  contribMap: Record<string, ContributorsMapEntry>
): Array<{ file: string; owner: string; changes: number }> {
  const filesSingleOwner: Array<{ file: string; owner: string; changes: number }> = [];

  for (const [file, ownersSet] of Object.entries(fileToContributors)) {
    const owners = Array.from(ownersSet);
    if (owners.length === 1) {
      const owner = owners[0];
      const m = (merged as Record<string, ContributorsMapEntry>)[owner] ||
        contribMap[owner] || { name: owner };
      const ownerEntry =
        (merged as Record<string, ContributorsMapEntry>)[owner] || contribMap[owner];
      const changes = ownerEntry?.files?.[file]?.changes ?? 0;
      filesSingleOwner.push({ file, owner: m.name || owner, changes });
    }
  }

  filesSingleOwner.sort((a, b) => b.changes - a.changes);
  return filesSingleOwner;
}

function buildTopStats(topContributors: TopContributor[]): TopStatsSummary {
  function topBy(metric: keyof TopContributor) {
    const arr = [...topContributors];
    arr.sort((a, b) => ((b[metric] as number) || 0) - ((a[metric] as number) || 0));
    return arr[0] || null;
  }

  return {
    byCommits: topBy('commits'),
    byAdditions: topBy('added'),
    byDeletions: topBy('deleted'),
    byNet: topBy('net'),
    byChanges: topBy('changes')
  };
}

export function analyze(
  commits: Commit[],
  similarityThreshold: number,
  aliasResolver: ((n: string, name?: string, email?: string) => string) | null,
  canonicalDetails?: Map<string, { name?: string; email?: string }>,
  groupBy: 'email' | 'name' = 'email'
) {
  const contribMap: Record<string, ContributorsMapEntry> = {};
  const fileToContributors: Record<string, Set<string>> = {};
  let totalCommits = 0;

  const commitFrequencyMonthly: Record<string, number> = {};
  const commitFrequencyWeekly: Record<string, number> = {};
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const heatmapContributors: Record<string, Record<string, number>> = {};

  for (const commit of commits) {
    totalCommits++;
    const name = commit.authorName || '';
    const email = commit.authorEmail || '';

    const normalized = normalizeKey(
      commit as { authorName?: string; authorEmail?: string },
      groupBy,
      aliasResolver
    );

    const contrib = getOrCreateContributor(contribMap, normalized, name, email, canonicalDetails);
    contrib.commits += 1;

    const date = commit.date ? new Date(commit.date) : null;
    updateCommitFrequency(
      date,
      commitFrequencyMonthly,
      commitFrequencyWeekly,
      heatmap,
      heatmapContributors,
      name
    );
    processCommitFiles(commit, contrib, fileToContributors, normalized);
  }

  const merged = mergeSimilarContributors(contribMap, similarityThreshold);
  const topContributors = buildTopContributors(merged);
  const filesSingleOwner = buildBusFactor(fileToContributors, merged, contribMap);
  const topStats = buildTopStats(topContributors);

  // Provide all required BusFactorInfo properties
  const busFactorInfo = {
    busFactor: 0, // TODO: implement actual bus factor calculation if needed
    candidates: [], // TODO: implement candidate calculation if needed
    details: undefined, // or provide details if available
    filesSingleOwner
  };

  return {
    contributors: merged,
    topContributors,
    totalCommits,
    commitFrequency: { monthly: commitFrequencyMonthly, weekly: commitFrequencyWeekly },
    heatmap,
    heatmapContributors,
    busFactor: busFactorInfo,
    topStats
  } as const;
}
