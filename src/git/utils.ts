import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface GitResult {
  ok: boolean;
  stdout?: string;
  error?: string;
  code?: number;
}

export function runGit(repoPath: string, args: string[]): GitResult {
  const res = spawnSync('git', args, {
    cwd: repoPath,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024
  });

  if (res.error) {
    const err = res.error as any;
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

export interface GitLogArgsOptions {
  branch?: string;
  since?: string;
  until?: string;
  author?: string;
  includeMerges?: boolean;
  paths?: string[];
}

export function buildGitLogArgs(opts: GitLogArgsOptions): string[] {
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
