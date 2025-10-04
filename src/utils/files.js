/**
 * File I/O utilities for git-contributor-stats
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Safely read and parse package.json
 * @returns {object} Package.json contents or empty object
 */
export function safeReadPackageJson() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, { encoding: 'utf8' }));
  } catch {
    return {};
  }
}

/**
 * Ensure directory exists, create if needed
 * @param {string} dir - Directory path
 */
export function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Try to load and parse JSON file
 * @param {string} filePath
 * @returns {object|null} Parsed JSON or null if failed
 */
export function tryLoadJSON(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (_) {
    return null;
  }
}

/**
 * Count total lines in a git repository
 * @param {string} repoPath
 * @param {Function} runGit - Git execution function
 * @returns {Promise<number>} Total line count
 */
export async function countTotalLines(repoPath, runGit) {
  try {
    const res = runGit(repoPath, ['ls-files']);
    if (!res.ok) return 0;

    const files = res.stdout.split(/\r?\n/).filter(Boolean);
    let total = 0;

    for (const rel of files) {
      const abs = path.join(repoPath, rel);
      try {
        const stat = fs.statSync(abs);
        if (!stat.isFile() || stat.size > 50 * 1024 * 1024) continue; // skip huge files
        const content = fs.readFileSync(abs, 'utf8');
        total += content.split(/\r?\n/).length;
      } catch (_) {
        /* ignore */
      }
    }
    return total;
  } catch (_) {
    return 0;
  }
}
