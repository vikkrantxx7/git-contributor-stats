/**
 * Git log parsing utilities
 */

/**
 * Parse git log output into commit objects
 * @param {string} stdout - Raw git log output
 * @returns {Array} Array of commit objects
 */
export function parseGitLog(stdout) {
  const lines = stdout.split(/\r?\n/);
  const commits = [];
  let current = null;
  let expectHeader = false;

  for (const line of lines) {
    if (line === '---') {
      if (current) commits.push(current);
      current = null;
      expectHeader = true;
      continue;
    }

    if (expectHeader) {
      if (!line) continue;
      const [hash, name, email, date] = line.split('\x00');
      if (!hash) continue;

      current = {
        hash,
        authorName: name || '',
        authorEmail: email || '',
        date: date ? new Date(date) : undefined,
        additions: 0,
        deletions: 0,
        filesChanged: 0,
        files: [],
      };
      expectHeader = false;
      continue;
    }

    if (!current) continue;
    if (!line) continue;

    const parts = line.split(/\t+/);
    if (parts.length >= 3) {
      const a = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const d = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      const filename = parts.slice(2).join('\t');

      current.additions += a;
      current.deletions += d;
      current.filesChanged += 1;
      current.files.push({ added: a, deleted: d, filename });
    }
  }

  if (current) commits.push(current);
  return commits;
}
