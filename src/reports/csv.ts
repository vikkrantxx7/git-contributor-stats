function escapeCSV(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const lines: string[] = [];
  if (headers)
    lines.push(headers.map((header) => header.charAt(0).toUpperCase() + header.slice(1)).join(','));

  for (const r of rows) {
    lines.push(headers.map((h) => escapeCSV(r[h])).join(','));
  }

  return lines.join('\n');
}

export function generateCSVReport(analysis: { topContributors: any[] }): string {
  const contribRows = analysis.topContributors.map((c) => ({
    contributor: `${c.name} <${c.email}>`,
    commits: c.commits,
    added: c.added,
    deleted: c.deleted,
    net: c.added - c.deleted,
    topFiles: c.topFiles
      .slice(0, 5)
      .map((f: any) => `${f.filename} (${f.changes})`)
      .join('; ')
  }));
  return toCSV(contribRows, [
    'contributor',
    'commits',
    'added',
    'deleted',
    'net',
    'topFiles'
  ]);
}

