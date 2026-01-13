import { getMetricValue, type TopStatsEntry } from '../utils/formatting.ts';

interface TopFile {
  filename: string;
  changes: number;
}

interface Contributor {
  name: string;
  email: string;
  commits: number;
  added: number;
  deleted: number;
  topFiles: TopFile[];
}

interface BusFactorFile {
  file: string;
  owner: string;
  changes: number;
}

interface BusFactor {
  filesSingleOwner?: BusFactorFile[];
}

interface TopStats {
  byCommits?: TopStatsEntry | null;
  byAdditions?: TopStatsEntry | null;
  byDeletions?: TopStatsEntry | null;
  byNet?: TopStatsEntry | null;
  byChanges?: TopStatsEntry | null;
}

interface CommitFrequency {
  monthly: Record<string, number>;
}

interface AnalysisData {
  contributors: Record<string, unknown>;
  topContributors: Contributor[];
  totalCommits: number;
  totalLines: number;
  busFactor: BusFactor;
  topStats?: TopStats;
  heatmap: number[][];
  commitFrequency: CommitFrequency;
}

interface ReportOptions {
  includeTopStats?: boolean;
  topStatsMetrics?: string[];
}

function formatStatLine(
  label: string,
  entry: TopStatsEntry | null | undefined,
  metricKey: string
): string {
  if (!entry) return `- **${label}:** —`;

  const metricVal = getMetricValue(entry, metricKey);
  const suffix = typeof metricVal === 'number' ? ` (${metricVal.toLocaleString()})` : '';
  const emailPart = entry.email ? ` <${entry.email}>` : '';
  const who = `${entry.name || '—'}${emailPart}`;
  return `- **${label}:** ${who}${suffix}`;
}

function addTopStatsSection(lines: string[], topStats: TopStats, topMetrics: string[]): void {
  const want = new Set(topMetrics);
  lines.push('## Top stats', '');

  if (want.has('commits'))
    lines.push(formatStatLine('Most commits', topStats.byCommits, 'commits'));
  if (want.has('additions'))
    lines.push(formatStatLine('Most additions', topStats.byAdditions, 'added'));
  if (want.has('deletions'))
    lines.push(formatStatLine('Most deletions', topStats.byDeletions, 'deleted'));
  if (want.has('net')) lines.push(formatStatLine('Best net contribution', topStats.byNet, 'net'));
  if (want.has('changes'))
    lines.push(formatStatLine('Most changes', topStats.byChanges, 'changes'));

  lines.push('');
}

function addTopContributorsSection(lines: string[], contributors: Contributor[]): void {
  lines.push(
    '## Top contributors',
    '',
    '| Rank | Contributor | Commits | Added | Deleted | Net | Top Files |',
    '|---:|---|---:|---:|---:|---:|---|'
  );

  const topContributorsList = contributors.slice(0, 50);
  for (let idx = 0; idx < topContributorsList.length; idx++) {
    const c = topContributorsList[idx];
    const net = (c.added || 0) - (c.deleted || 0);
    const topFiles = (c.topFiles || [])
      .slice(0, 3)
      .map((f) => `\`${f.filename}\`(${f.changes})`)
      .join(', ');
    lines.push(
      `| ${idx + 1} | **${c.name}** \`<${c.email}>\` | ${(c.commits || 0).toLocaleString()} | ${(c.added || 0).toLocaleString()} | ${(c.deleted || 0).toLocaleString()} | ${net.toLocaleString()} | ${topFiles} |`
    );
  }
  lines.push('');
}

function addBusFactorSection(lines: string[], busFactor: BusFactor): void {
  const filesSingleOwner = busFactor.filesSingleOwner || [];

  lines.push(
    '## Bus Factor Analysis',
    '',
    `**Files with single contributor:** ${filesSingleOwner.length}`,
    ''
  );

  if (filesSingleOwner.length > 0) {
    lines.push(
      '### High-Risk Files (Single Owner)',
      '',
      '| File | Owner | Changes |',
      '|---|---|---:|'
    );

    for (const f of filesSingleOwner.slice(0, 20)) {
      lines.push(`| \`${f.file}\` | ${f.owner} | ${f.changes.toLocaleString()} |`);
    }
    lines.push('');
  }
}

function addActivityPatternsSection(
  lines: string[],
  commitFrequency: CommitFrequency,
  heatmap: number[][]
): void {
  lines.push('## Activity Patterns', '');

  lines.push('### Recent Monthly Activity', '', '| Month | Commits |', '|---|---:|');
  const monthlyEntries = Object.entries(commitFrequency.monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);

  for (const [month, commits] of monthlyEntries) {
    lines.push(`| ${month} | ${commits.toLocaleString()} |`);
  }
  lines.push('');

  lines.push(
    '### Commit Heatmap Data',
    '',
    '> Commit activity by day of week (0=Sunday) and hour (0-23)',
    '',
    '```json',
    JSON.stringify(heatmap, null, 2),
    '```'
  );
}

export function generateMarkdownReport(
  data: AnalysisData,
  repoRoot: string,
  opts: ReportOptions = {}
): string {
  const includeTopStats = opts.includeTopStats !== false;
  const topMetrics = Array.isArray(opts.topStatsMetrics)
    ? opts.topStatsMetrics
    : ['commits', 'additions', 'deletions', 'net', 'changes'];
  const lines: string[] = [];

  lines.push(
    '# Git Contributor Stats',
    '',
    `**Repository:** ${repoRoot}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Total contributors:** ${Object.keys(data.contributors).length}`,
    `- **Total commits:** ${data.totalCommits.toLocaleString()}`,
    `- **Total lines:** ${data.totalLines.toLocaleString()}`,
    ''
  );

  if (includeTopStats && data.topStats) {
    addTopStatsSection(lines, data.topStats, topMetrics);
  }

  addTopContributorsSection(lines, data.topContributors);
  addBusFactorSection(lines, data.busFactor);
  addActivityPatternsSection(lines, data.commitFrequency, data.heatmap);

  return lines.join('\n');
}
