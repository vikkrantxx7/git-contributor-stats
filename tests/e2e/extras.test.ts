// filepath: tests/e2e/extras.test.ts

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { cleanupRepo, createTempRepo, initRepo, seedBasicHistory } from '../utils/repo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(dirname(__dirname));

async function getCommitCount(repoDir: string): Promise<number> {
  const { stdout } = await execa('git', ['log', '--oneline'], { cwd: repoDir });
  return stdout.trim() ? stdout.trim().split('\n').length : 0;
}

describe('Additional coverage (charts-dir, similarity, errors, verbose)', () => {
  let tmpRepo: string;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('generates charts into a custom charts-dir', async () => {
    const chartsDir = join(tmpRepo, 'charts-out');
    try {
      rmSync(chartsDir, { recursive: true, force: true });
    } catch {}
    const { exitCode } = await execa(
      'node',
      [
        'dist/cli.mjs',
        '--repo',
        tmpRepo,
        '--charts',
        '--charts-dir',
        chartsDir,
        '--chart-format',
        'svg',
        '--no-count-lines'
      ],
      { cwd: repoRoot }
    );

    expect(exitCode).toBe(0);

    const files = ['top-commits.svg', 'top-net.svg', 'heatmap.svg'];
    for (const f of files) {
      const p = join(chartsDir, f);
      expect(existsSync(p)).toBe(true);
      const svg = readFileSync(p, 'utf8');
      expect(svg).toMatch(/<svg/i);
    }
  });

  it('handles similarity threshold without changing totalCommits', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      ['dist/cli.mjs', '--repo', tmpRepo, '--similarity', '0.5', '--json', '--no-count-lines'],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);
    const count = await getCommitCount(tmpRepo);
    expect(data.totalCommits).toBe(count);
  });

  it('returns a friendly error on invalid repository', async () => {
    let error: any = null;
    try {
      await execa('node', ['dist/cli.mjs', '--repo', '/definitely/not/a/repo', '--json'], {
        cwd: repoRoot
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
    expect(String(error.stderr || error.stdout || error.message)).toMatch(/Not a Git repository/i);
  });

  it('emits debug logs to stderr when verbose is enabled', async () => {
    const { stdout, stderr, exitCode } = await execa(
      'node',
      ['dist/cli.mjs', '--repo', tmpRepo, '--json', '--verbose', '--no-count-lines'],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim().startsWith('{')).toBe(true);
    expect(stderr).toMatch(/\[debug\]/);
  });
});
