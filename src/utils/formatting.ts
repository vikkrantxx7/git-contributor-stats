export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function svgEscape(s: string): string {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function parseTopStatsMetrics(input?: string): string[] {
  const all = ['commits', 'additions', 'deletions', 'net', 'changes'];
  if (!input) return all;

  const set = new Set<string>();
  for (const part of String(input)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)) {
    if (all.includes(part)) set.add(part);
  }
  return set.size ? Array.from(set) : all;
}

export interface TopStatsEntry {
  name?: string;
  email?: string;
  commits?: number;
  added?: number;
  deleted?: number;
  net?: number;
  changes?: number;
}

export function formatTopStatsLines(
  ts: Record<string, TopStatsEntry>,
  metrics: string[]
): string[] {
  const lines: string[] = [];
  const want = new Set(
    metrics?.length ? metrics : ['commits', 'additions', 'deletions', 'net', 'changes']
  );

  function line(label: string, entry: TopStatsEntry | undefined, metricKey: string): string {
    if (!entry) return `${label}: —`;
    const metricVal =
      entry && typeof entry[metricKey as keyof TopStatsEntry] === 'number'
        ? entry[metricKey as keyof TopStatsEntry]
        : metricKey === 'net'
          ? (entry.added || 0) - (entry.deleted || 0)
          : undefined;
    const suffix = typeof metricVal === 'number' ? ` (${metricVal})` : '';
    const who = `${entry.name || '—'}${entry.email ? ` <${entry.email}>` : ''}`;
    return `${label}: ${who}${suffix}`;
  }

  if (want.has('commits')) lines.push(line('Most commits', ts.byCommits, 'commits'));
  if (want.has('additions')) lines.push(line('Most additions', ts.byAdditions, 'added'));
  if (want.has('deletions')) lines.push(line('Most deletions', ts.byDeletions, 'deleted'));
  if (want.has('net')) lines.push(line('Best net lines', ts.byNet, 'net'));
  if (want.has('changes')) lines.push(line('Most changes (±)', ts.byChanges, 'changes'));
  return lines;
}
