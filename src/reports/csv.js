/**
 * CSV report generation utilities
 */

/**
 * Escape CSV field value
 * @param {*} v - Value to escape
 * @returns {string} Escaped CSV field
 */
function escapeCSV(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert rows to CSV format
 * @param {Array} rows - Array of row objects
 * @param {string[]} headers - Column headers
 * @returns {string} CSV content
 */
export function toCSV(rows, headers) {
  const lines = [];
  if (headers)
    lines.push(headers.map((header) => header.charAt(0).toUpperCase() + header.slice(1)).join(','));

  for (const r of rows) {
    lines.push(headers.map((h) => escapeCSV(r[h])).join(','));
  }

  return lines.join('\n');
}

/**
 * Generate CSV report from analysis data
 * @param {object} analysis - Analysis results
 * @returns {string} CSV content
 */
export function generateCSVReport(analysis) {
  const contribRows = analysis.topContributors.map((c) => ({
    contributor: `${c.name} <${c.email}>`,
    commits: c.commits,
    added: c.added,
    deleted: c.deleted,
    net: c.added - c.deleted,
    topFiles: c.topFiles
      .slice(0, 5)
      .map((file) => `${file.filename}(${file.changes})`)
      .join('; ')
  }));

  const headers = ['contributor', 'commits', 'added', 'deleted', 'net', 'topFiles'];
  return toCSV(contribRows, headers);
}
