interface FileChange {
  added: number;
  deleted: number;
  filename: string;
}

export interface Commit {
  hash: string;
  authorName: string;
  authorEmail: string;
  date?: Date;
  additions: number;
  deletions: number;
  filesChanged: number;
  files: FileChange[];
}

export function parseGitLog(stdout?: string): Commit[] {
  if (!stdout) return [];
  const lines = stdout.split(/\r?\n/);
  const commits: Commit[] = [];
  let current: Commit | null = null;
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
        files: []
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

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface GitResult {
  ok: boolean;
  stdout?: string;
  error?: string;
  code?: number;
}

interface GitLogOptions {
  branch?: string;
  since?: string;
  until?: string;
  author?: string;
  includeMerges?: boolean;
  paths?: string[];
}

export function runGit(repoPath: string, args: string[]): GitResult {
  const res = spawnSync('git', args, {
    cwd: repoPath,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024
  });

  if (res.error) {
    const err = res.error as NodeJS.ErrnoException;
    const msg =
      err && err.code === 'ENOENT'
        ? 'Git is not installed or not in PATH.'
        : `Failed to execute git: ${res.error.message}`;
    return { ok: false, error: msg, code: res.status ?? 2 };
  }

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    if (
      /does not have any commits yet/i.test(stderr) ||
      /bad default revision 'HEAD'/i.test(stderr) ||
      /ambiguous argument 'HEAD'/i.test(stderr)
    ) {
      return { ok: true, stdout: '' };
    }
    return {
      ok: false,
      error: (stderr || res.stdout || 'Unknown git error').trim(),
      code: res.status || 2
    };
  }

  return { ok: true, stdout: res.stdout };
}

export function isGitRepo(repoPath: string): boolean {
  try {
    const gitFolder = path.join(repoPath, '.git');
    return fs.existsSync(gitFolder);
  } catch {
    return false;
  }
}

export function buildGitLogArgs(opts: GitLogOptions): string[] {
  const { branch, since, until, author, includeMerges, paths } = opts;
  const args = ['log', '--numstat', '--date=iso-strict', '--no-color'];
  args.push('--pretty=format:---%n%H%x00%an%x00%ae%x00%ad');

  if (!includeMerges) args.push('--no-merges');
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  if (author) args.push(`--author=${author}`);
  if (branch) args.push(branch);
  args.push('--');
  if (paths?.length) for (const p of paths) args.push(p);

  return args;
}
