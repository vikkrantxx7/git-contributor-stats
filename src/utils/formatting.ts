export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function svgEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function parseTopStatsMetrics(input: string): string[] {
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

interface TopStatsEntry {
  name?: string;
  email?: string;
  commits?: number;
  added?: number;
  deleted?: number;
  net?: number;
  changes?: number;
}

export function formatTopStatsLines(ts: Record<string, TopStatsEntry>, metrics: string[]): string[] {
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
export function parseDateInput(input: string): string | undefined {
  if (!input) return undefined;

  const rel = /^([0-9]+)\.(day|days|week|weeks|month|months|year|years)$/i.exec(input.trim());
  if (rel) {
    const qty = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const now = new Date();
    const d = new Date(now);
    const mult = unit.startsWith('day')
      ? 1
      : unit.startsWith('week')
        ? 7
        : unit.startsWith('month')
          ? 30
          : 365;
    d.setDate(now.getDate() - qty * mult);
    return d.toISOString();
  }

  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return input;
}

export function isoWeekKey(date: Date): string {
  const d = new Date(date);
  const target = new Date(d.valueOf());
  const dayNumber = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round(diff / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

