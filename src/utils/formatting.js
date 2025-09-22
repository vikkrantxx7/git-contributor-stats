/**
 * Formatting utilities for git-contributor-stats
 */

/**
 * Format numbers with thousands separators
 * @param {number} n
 * @returns {string} Formatted number
 */
export function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

/**
 * Escape string for SVG content
 * @param {string} s
 * @returns {string} Escaped string
 */
export function svgEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Parse and validate top stats metrics
 * @param {string} input - Comma-separated metrics
 * @returns {string[]} Valid metrics array
 */
export function parseTopStatsMetrics(input) {
  const all = ['commits', 'additions', 'deletions', 'net', 'changes'];
  if (!input) return all;

  const set = new Set();
  for (const part of String(input).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) {
    if (all.includes(part)) set.add(part);
  }
  return set.size ? Array.from(set) : all;
}

/**
 * Format top stats lines for display
 * @param {object} ts - Top stats object
 * @param {string[]} metrics - Metrics to include
 * @returns {string[]} Formatted lines
 */
export function formatTopStatsLines(ts, metrics) {
  const lines = [];
  const want = new Set(metrics && metrics.length ? metrics : ['commits', 'additions', 'deletions', 'net', 'changes']);

  function line(label, entry, metricKey) {
    if (!entry) return `${label}: —`;
    const metricVal = (entry && typeof entry[metricKey] === 'number')
      ? entry[metricKey]
      : (metricKey === 'net' ? ((entry.added || 0) - (entry.deleted || 0)) : undefined);
    const suffix = (typeof metricVal === 'number') ? ` (${metricVal})` : '';
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
