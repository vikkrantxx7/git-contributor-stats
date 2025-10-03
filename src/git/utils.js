/**
 * Git command execution utilities
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Execute a git command in the given repository
 * @param {string} repoPath - Path to git repository
 * @param {string[]} args - Git command arguments
 * @returns {{ok: boolean, stdout?: string, error?: string, code?: number}}
 */
export function runGit(repoPath, args) {
  const res = spawnSync('git', args, {
    cwd: repoPath,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });

  if (res.error) {
    /** @type {any} */ const err = res.error;
    const msg = err && err.code === 'ENOENT'
      ? 'Git is not installed or not in PATH.'
      : `Failed to execute git: ${res.error.message}`;
    return { ok: false, error: msg, code: res.status ?? 2 };
  }

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    if (/does not have any commits yet/i.test(stderr) || /bad default revision 'HEAD'/i.test(stderr) || /ambiguous argument 'HEAD'/i.test(stderr)) {
      return { ok: true, stdout: '' };
    }
    return { ok: false, error: (stderr || res.stdout || 'Unknown git error').trim(), code: res.status || 2 };
  }

  return { ok: true, stdout: res.stdout };
}

/**
 * Check if a directory is a git repository
 * @param {string} repoPath - Path to check
 * @returns {boolean}
 */
export function isGitRepo(repoPath) {
  try {
    const gitFolder = path.join(repoPath, '.git');
    return fs.existsSync(gitFolder);
  } catch {
    return false;
  }
}

/**
 * Build git log arguments from options
 * @param {object} opts - Options object
 * @returns {string[]} Git command arguments
 */
export function buildGitLogArgs(opts) {
  const { branch, since, until, author, includeMerges, paths } = opts;
  const args = ['log', '--numstat', '--date=iso-strict', '--no-color'];
  args.push('--pretty=format:---%n%H%x00%an%x00%ae%x00%ad');

  if (!includeMerges) args.push('--no-merges');
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  if (author) args.push(`--author=${author}`);
  if (branch) args.push(branch);
  args.push('--');
  if (paths && paths.length) for (const p of paths) args.push(p);

  return args;
}
