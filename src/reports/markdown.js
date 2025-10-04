/**
 * Markdown report generation utilities
 */

/**
 * Generate comprehensive Markdown report
 * @param {object} data - Analysis data
 * @param {string} repoRoot - Repository root path
 * @param {object} opts - Report options
 * @returns {string} Markdown content
 */
export function generateMarkdownReport(data, repoRoot, opts = {}) {
  const includeTopStats = opts.includeTopStats !== false;
  const topMetrics = Array.isArray(opts.topStatsMetrics)
    ? opts.topStatsMetrics
    : ['commits', 'additions', 'deletions', 'net', 'changes'];
  const lines = [];

  lines.push('# Git Contributor Stats');
  lines.push('');
  lines.push(`**Repository:** ${repoRoot}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Summary section
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total contributors:** ${Object.keys(data.contributors).length}`);
  lines.push(`- **Total commits:** ${data.totalCommits.toLocaleString()}`);
  lines.push(`- **Total lines:** ${data.totalLines.toLocaleString()}`);
  lines.push('');

  // Top stats section
  if (includeTopStats && data.topStats) {
    const ts = data.topStats;
    const want = new Set(topMetrics);

    function formatStatLine(label, entry, metricKey) {
      if (!entry) return `- **${label}:** —`;
      const metricVal =
        entry && typeof entry[metricKey] === 'number'
          ? entry[metricKey]
          : metricKey === 'net'
            ? (entry.added || 0) - (entry.deleted || 0)
            : undefined;
      const suffix = typeof metricVal === 'number' ? ` (${metricVal.toLocaleString()})` : '';
      const who = `${entry.name || '—'}${entry.email ? ` <${entry.email}>` : ''}`;
      return `- **${label}:** ${who}${suffix}`;
    }

    lines.push('## Top stats');
    lines.push('');
    if (want.has('commits')) lines.push(formatStatLine('Most commits', ts.byCommits, 'commits'));
    if (want.has('additions'))
      lines.push(formatStatLine('Most additions', ts.byAdditions, 'added'));
    if (want.has('deletions'))
      lines.push(formatStatLine('Most deletions', ts.byDeletions, 'deleted'));
    if (want.has('net')) lines.push(formatStatLine('Best net contribution', ts.byNet, 'net'));
    if (want.has('changes')) lines.push(formatStatLine('Most changes', ts.byChanges, 'changes'));
    lines.push('');
  }

  // Contributors table
  lines.push('## Top contributors');
  lines.push('');
  lines.push('| Rank | Contributor | Commits | Added | Deleted | Net | Top Files |');
  lines.push('|---:|---|---:|---:|---:|---:|---|');

  data.topContributors.slice(0, 50).forEach((c, idx) => {
    const net = (c.added || 0) - (c.deleted || 0);
    const topFiles = (c.topFiles || [])
      .slice(0, 3)
      .map((f) => `\`${f.filename}\`(${f.changes})`)
      .join(', ');
    lines.push(
      `| ${idx + 1} | **${c.name}** \`<${c.email}>\` | ${(c.commits || 0).toLocaleString()} | ${(c.added || 0).toLocaleString()} | ${(c.deleted || 0).toLocaleString()} | ${net.toLocaleString()} | ${topFiles} |`
    );
  });

  lines.push('');

  // Bus factor analysis
  lines.push('## Bus Factor Analysis');
  lines.push('');
  lines.push(`**Files with single contributor:** ${data.busFactor.filesSingleOwner.length}`);
  lines.push('');

  if (data.busFactor.filesSingleOwner.length > 0) {
    lines.push('### High-Risk Files (Single Owner)');
    lines.push('');
    lines.push('| File | Owner | Changes |');
    lines.push('|---|---|---:|');

    data.busFactor.filesSingleOwner.slice(0, 20).forEach((f) => {
      lines.push(`| \`${f.file}\` | ${f.owner} | ${f.changes.toLocaleString()} |`);
    });
    lines.push('');
  }

  // Activity patterns
  lines.push('## Activity Patterns');
  lines.push('');

  // Monthly frequency
  const monthlyEntries = Object.entries(data.commitFrequency.monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12); // Last 12 months

  if (monthlyEntries.length > 0) {
    lines.push('### Recent Monthly Activity');
    lines.push('');
    lines.push('| Month | Commits |');
    lines.push('|---|---:|');
    monthlyEntries.forEach(([month, commits]) => {
      lines.push(`| ${month} | ${commits.toLocaleString()} |`);
    });
    lines.push('');
  }

  // Heatmap data
  lines.push('### Commit Heatmap Data');
  lines.push('');
  lines.push('> Commit activity by day of week (0=Sunday) and hour (0-23)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(data.heatmap, null, 2));
  lines.push('```');

  return lines.join('\n');
}
