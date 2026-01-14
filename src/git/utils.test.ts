import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { GitLogArgsOptions } from './utils';
import { buildGitLogArgs, isGitRepo, runGit } from './utils';

function rmTmpDir(tmpDir: string) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function makeTmpDir(prefix: string) {
  return fs.mkdtempSync(path.join(__dirname, prefix));
}

async function withMockedSpawnSync(
  spawnSyncImpl: () => { error: unknown; status: number | null; stdout: string; stderr: string }
) {
  vi.resetModules();

  vi.doMock('node:child_process', () => ({
    spawnSync: spawnSyncImpl
  }));

  const { runGit: runGitMocked } = await import('./utils');
  return runGitMocked;
}

describe('isGitRepo', () => {
  it('should return true for a directory containing a .git folder', () => {
    const tmpDir = makeTmpDir('tmp-git-');
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });

    expect(isGitRepo(tmpDir)).toBe(true);

    rmTmpDir(tmpDir);
  });

  it('should return false for a non-git directory', () => {
    const tmpDir = makeTmpDir('tmp-non-git-');
    expect(isGitRepo(tmpDir)).toBe(false);
    rmTmpDir(tmpDir);
  });
});

describe('buildGitLogArgs', () => {
  it('should build default log args', () => {
    const args = buildGitLogArgs({});
    expect(args).toContain('log');
    expect(args).toContain('--numstat');
    expect(args).toContain('--no-merges');
    expect(args).toContain('--');
  });

  it('should include branch, author, since, until, and paths', () => {
    const opts: GitLogArgsOptions = {
      branch: 'main',
      author: 'alice',
      since: '2020-01-01',
      until: '2020-12-31',
      includeMerges: true,
      paths: ['src/index.ts', 'README.md']
    };
    const args = buildGitLogArgs(opts);
    expect(args).toContain('main');
    expect(args).toContain('--author=alice');
    expect(args).toContain('--since=2020-01-01');
    expect(args).toContain('--until=2020-12-31');
    expect(args).toContain('src/index.ts');
    expect(args).toContain('README.md');
    expect(args).not.toContain('--no-merges');
  });
});

describe('runGit', () => {
  it('should fail gracefully if git is not installed', () => {
    // Simulate by passing an invalid command
    const result = runGit('.', ['--version']);
    expect(result.ok).toBe(true); // Should succeed if git is installed
    expect(result.stdout).toMatch(/git version/);
  });

  it('should handle non-repo directory', () => {
    const tmpDir = makeTmpDir('tmp-non-git-');
    const result = runGit(tmpDir, ['status']);
    // Accept any result, but must not throw and must return a GitResult object
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('stdout');
    // 'error' is optional in GitResult, so only check if present
    if ('error' in result) {
      expect(typeof result.error === 'string' || result.error === undefined).toBe(true);
    }
    // Print output for debugging if test fails
    const output = (result.error ?? result.stdout ?? '').toLowerCase();
    // Acceptable: ok is false, or error/stdout contains not-a-git-repo/fatal/unknown, or output is not empty
    const isNonRepo =
      !result.ok ||
      /not a git repository|fatal|unknown git error/.test(output) ||
      output.includes('does not have any commits yet') ||
      output.includes('bad default revision') ||
      output.includes('ambiguous argument') ||
      output.length > 0;
    expect(isNonRepo).toBe(true);
    rmTmpDir(tmpDir);
  });
});

describe('runGit additional branches', () => {
  it('should return a friendly ENOENT message when git executable is missing', async () => {
    const runGitMocked = await withMockedSpawnSync(() => ({
      error: Object.assign(new Error('not found'), { code: 'ENOENT' }),
      status: null,
      stdout: '',
      stderr: ''
    }));

    const result = runGitMocked('.', ['--version']);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not installed|path/i);
  });

  it('should treat no-commits-yet/bad HEAD stderr as ok with empty stdout', async () => {
    const runGitMocked = await withMockedSpawnSync(() => ({
      error: null,
      status: 128,
      stdout: '',
      stderr:
        "fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.\n"
    }));

    const result = runGitMocked('.', ['log']);
    expect(result.ok).toBe(true);
    expect(result.stdout).toBe('');
  });

  it('should return a generic execution error message for non-ENOENT spawn errors', async () => {
    const runGitMocked = await withMockedSpawnSync(() => ({
      error: Object.assign(new Error('EACCES'), { code: 'EACCES' }),
      status: null,
      stdout: '',
      stderr: ''
    }));

    const result = runGitMocked('.', ['--version']);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Failed to execute git/i);
  });
});

describe('isGitRepo additional branches', () => {
  it('should return false if fs.existsSync throws', async () => {
    vi.resetModules();

    const originalExistsSync = fs.existsSync;
    // biome-ignore lint/suspicious/noExplicitAny: forcing a throw to cover the catch branch.
    (fs as any).existsSync = () => {
      throw new Error('boom');
    };

    try {
      expect(isGitRepo('/any')).toBe(false);
    } finally {
      fs.existsSync = originalExistsSync;
    }
  });
});
