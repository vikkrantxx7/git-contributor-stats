import { formatNumber } from '../utils/formatting.ts';
import { normalizeContributorName } from '../utils/normalization.ts';
import { calculateSimilarityScore } from '../utils/similarity.ts';

export interface ContributorBasic {
  key: string;
  name: string;
  emails: string[];
  commits: number;
  additions: number;
  deletions: number;
  changes: number;
  firstCommitDate?: string;
  lastCommitDate?: string;
}

type Commit = {
  authorName?: string;
  authorEmail?: string;
  additions?: number;
  deletions?: number;
  date?: string | Date;
};

type AggregationData = {
  key: string;
  name: string;
  emails: Set<string>;
  commits: number;
  additions: number;
  deletions: number;
  firstCommitDate?: Date;
  lastCommitDate?: Date;
};

export interface AggregationOptions {
  groupBy: 'name' | 'email';
  aliasResolver?: ((n: string, name?: string, email?: string) => string) | null;
  canonicalDetails?: Map<string, { name?: string; email?: string }>;
  similarity?: number;
}

export function normalizeKey(
  commit: Commit,
  groupBy: 'name' | 'email',
  aliasResolver?: ((n: string, name?: string, email?: string) => string) | null
): string {
  const name = commit.authorName || '';
  const email = commit.authorEmail || '';
  const valueToNormalize = groupBy === 'email' ? email || name : name || email;
  const baseNorm = normalizeContributorName(valueToNormalize);
  return aliasResolver ? aliasResolver(baseNorm, name, email) : baseNorm;
}

export function getDisplayDetails(
  normalizedKey: string,
  defaultName: string,
  defaultEmail: string,
  canonicalDetails?: Map<string, { name?: string; email?: string }>
): { name: string; email: string } {
  if (canonicalDetails?.has(normalizedKey)) {
    const info = canonicalDetails.get(normalizedKey);
    if (info) {
      return {
        name: info.name || defaultName,
        email: info.email || defaultEmail
      };
    }
  }
  return { name: defaultName, email: defaultEmail };
}

export function findSimilarKey(
  norm: string,
  existingKeys: string[],
  threshold: number
): string | null {
  for (const mk of existingKeys) {
    const sim = calculateSimilarityScore(norm, mk);
    if (sim >= threshold) {
      return mk;
    }
  }
  return null;
}

function mergeEmails(target: Set<string>, source: Set<string>): void {
  for (const email of source) {
    target.add(email);
  }
}

function mergeFirstCommitDate(target: AggregationData, source: AggregationData): void {
  if (
    source.firstCommitDate &&
    (!target.firstCommitDate || source.firstCommitDate < target.firstCommitDate)
  ) {
    target.firstCommitDate = source.firstCommitDate;
  }
}

function mergeLastCommitDate(target: AggregationData, source: AggregationData): void {
  if (
    source.lastCommitDate &&
    (!target.lastCommitDate || source.lastCommitDate > target.lastCommitDate)
  ) {
    target.lastCommitDate = source.lastCommitDate;
  }
}

function mergeAggregationData(target: AggregationData, source: AggregationData): void {
  target.commits += source.commits;
  target.additions += source.additions;
  target.deletions += source.deletions;
  mergeEmails(target.emails, source.emails);
  mergeFirstCommitDate(target, source);
  mergeLastCommitDate(target, source);
}

function applySimilarityMerging(
  aggregations: AggregationData[],
  threshold: number
): AggregationData[] {
  const merged: AggregationData[] = [];

  for (const agg of aggregations) {
    const similarKey = findSimilarKey(
      agg.key,
      merged.map((m) => m.key),
      threshold
    );

    if (similarKey) {
      const target = merged.find((m) => m.key === similarKey);
      if (target) {
        mergeAggregationData(target, agg);
      }
    } else {
      merged.push(agg);
    }
  }

  return merged;
}

function createInitialAggregation(commit: Commit, key: string): AggregationData {
  return {
    key,
    name: commit.authorName || '',
    emails: new Set(),
    commits: 0,
    additions: 0,
    deletions: 0,
    firstCommitDate: commit.date ? new Date(commit.date) : undefined,
    lastCommitDate: commit.date ? new Date(commit.date) : undefined
  };
}

function updateAggregation(agg: AggregationData, commit: Commit): void {
  agg.name = agg.name || commit.authorName || '';

  if (commit.authorEmail) {
    agg.emails.add(commit.authorEmail.toLowerCase());
  }

  agg.commits += 1;
  agg.additions += commit.additions || 0;
  agg.deletions += commit.deletions || 0;

  updateCommitDates(agg, commit);
}

function updateCommitDates(agg: AggregationData, commit: Commit): void {
  if (!commit.date) return;

  const date = new Date(commit.date);

  if (!agg.firstCommitDate || date < agg.firstCommitDate) {
    agg.firstCommitDate = date;
  }

  if (!agg.lastCommitDate || date > agg.lastCommitDate) {
    agg.lastCommitDate = date;
  }
}

function convertToContributor(agg: AggregationData, groupBy: 'name' | 'email'): ContributorBasic {
  return {
    key: agg.key,
    name: agg.name || (groupBy === 'name' ? agg.key : ''),
    emails: Array.from(agg.emails),
    commits: agg.commits,
    additions: agg.additions,
    deletions: agg.deletions,
    changes: agg.additions + agg.deletions,
    firstCommitDate: agg.firstCommitDate ? agg.firstCommitDate.toISOString() : undefined,
    lastCommitDate: agg.lastCommitDate ? agg.lastCommitDate.toISOString() : undefined
  } as ContributorBasic;
}

export function aggregateBasic(commits: Commit[], options: AggregationOptions): ContributorBasic[] {
  const { groupBy, aliasResolver, canonicalDetails, similarity } = options;
  const map = new Map<string, AggregationData>();

  for (const commit of commits) {
    const key = normalizeKey(commit, groupBy, aliasResolver);

    if (!map.has(key)) {
      const { name, email } = getDisplayDetails(
        key,
        commit.authorName || '',
        commit.authorEmail || '',
        canonicalDetails
      );
      const agg = createInitialAggregation(commit, key);
      agg.name = name || agg.name;
      if (email) {
        agg.emails.add(email.toLowerCase());
      }
      map.set(key, agg);
    }

    const agg = map.get(key);
    if (agg) {
      updateAggregation(agg, commit);
    }
  }

  let aggregations = Array.from(map.values());

  if (similarity !== undefined && similarity > 0) {
    aggregations = applySimilarityMerging(aggregations, similarity);
  }

  return aggregations.map((agg) => convertToContributor(agg, groupBy));
}

export type SortItem = { commits: number; changes: number; additions?: number; deletions?: number };
export function pickSortMetric(by?: string) {
  switch ((by || '').toLowerCase()) {
    case 'commits':
      return (a: SortItem, b: SortItem) => b.commits - a.commits || b.changes - a.changes;
    case 'additions':
    case 'adds':
    case 'lines-added':
      return (a: SortItem, b: SortItem) =>
        (b.additions || 0) - (a.additions || 0) || b.commits - a.commits;
    case 'deletions':
    case 'dels':
    case 'lines-deleted':
      return (a: SortItem, b: SortItem) =>
        (b.deletions || 0) - (a.deletions || 0) || b.commits - a.commits;
    default:
      return (a: SortItem, b: SortItem) => b.changes - a.changes || b.commits - a.commits;
  }
}

export function computeMeta(contributors: ContributorBasic[]) {
  let commits = 0,
    additions = 0,
    deletions = 0;
  let first: Date | undefined, last: Date | undefined;

  for (const c of contributors) {
    commits += c.commits || 0;
    additions += c.additions || 0;
    deletions += c.deletions || 0;
    if (c.firstCommitDate) {
      const d = new Date(c.firstCommitDate);
      if (!first || d < first) first = d;
    }
    if (c.lastCommitDate) {
      const d = new Date(c.lastCommitDate);
      if (!last || d > last) last = d;
    }
  }

  return {
    contributors: contributors.length,
    commits,
    additions,
    deletions,
    firstCommitDate: first ? first.toISOString() : undefined,
    lastCommitDate: last ? last.toISOString() : undefined
  };
}

export interface ContributorsMeta {
  contributors: number;
  commits: number;
  additions: number;
  deletions: number;
  firstCommitDate?: string;
  lastCommitDate?: string;
}

export function printTable(
  contributors: ContributorBasic[],
  meta: ContributorsMeta,
  labelBy: 'name' | 'email' = 'name'
) {
  const headers = [
    '#',
    labelBy === 'name' ? 'Author' : 'Email',
    'Commits',
    '+Additions',
    '-Deletions',
    '±Changes'
  ];
  const rows: string[][] = [];

  for (let idx = 0; idx < contributors.length; idx++) {
    const c = contributors[idx];
    const label = labelBy === 'name' ? c.name || '(unknown)' : c.key || '(unknown)';
    rows.push([
      String(idx + 1),
      label,
      formatNumber(c.commits),
      formatNumber(c.additions),
      formatNumber(c.deletions),
      formatNumber(c.changes)
    ]);
  }

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ? String(r[i]).length : 0)))
  );

  const headerLine = headers
    .map((h, i) => (i === 1 ? String(h).padEnd(colWidths[i]) : String(h).padStart(colWidths[i])))
    .join('  ');

  const sepLine = colWidths.map((w) => '-'.repeat(w)).join('  ');

  console.log(headerLine);
  console.log(sepLine);

  for (const r of rows) {
    const line = r
      .map((cell, i) =>
        i === 1 ? String(cell).padEnd(colWidths[i]) : String(cell).padStart(colWidths[i])
      )
      .join('  ');
    console.log(line);
  }

  console.log();
  console.log(
    `Contributors: ${formatNumber(meta.contributors)} | Commits: ${formatNumber(meta.commits)} | Changes: ${formatNumber(
      meta.additions + meta.deletions
    )} (+${formatNumber(meta.additions)} / -${formatNumber(meta.deletions)})`
  );

  if (meta.firstCommitDate || meta.lastCommitDate) {
    console.log(
      `Range: ${meta.firstCommitDate ? new Date(meta.firstCommitDate).toISOString().slice(0, 10) : '—'} → ${
        meta.lastCommitDate ? new Date(meta.lastCommitDate).toISOString().slice(0, 10) : '—'
      }`
    );
  }
}

export function printCSV(contributors: ContributorBasic[], labelBy: 'name' | 'email' = 'name') {
  const header = [
    'rank',
    labelBy === 'name' ? 'author' : 'email',
    'commits',
    'additions',
    'deletions',
    'changes'
  ];
  console.log(header.join(','));

  for (let i = 0; i < contributors.length; i++) {
    const c = contributors[i];
    const label = labelBy === 'name' ? c.name || '' : c.key || '';
    console.log([i + 1, label, c.commits, c.additions, c.deletions, c.changes].join(','));
  }
}
