// filepath: tests/e2e/output-formats.test.js
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, rmSync } from 'fs';
import { execa } from 'execa';
import { createTempRepo, initRepo, seedBasicHistory, cleanupRepo } from '../utils/repo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.substring(0, __filename.lastIndexOf('/'));
const repoRoot = join(__dirname, '..', '..');

async function getCommitCount(repoDir) {
  const { stdout } = await execa('git', ['log', '--oneline'], { cwd: repoDir });
  return stdout.trim() ? stdout.trim().split('\n').length : 0;
}

describe('Output formats (table/csv)', () => {
  let tmpRepo;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('prints a reasonable table to stdout', async () => {
    const { stdout, stderr, exitCode } = await execa('node', ['cli.js', '--repo', tmpRepo, '--format', 'table', '--top', '5', '--no-count-lines'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/Contributors:/);
    expect(stdout).toMatch(/Commits/);
  });

  it('prints CSV to stdout', async () => {
    const { stdout, stderr, exitCode } = await execa('node', ['cli.js', '--repo', tmpRepo, '--format', 'csv', '--top', '5', '--no-count-lines'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    const lines = stdout.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toMatch(/rank/i);
    expect(lines[0]).toMatch(/commits/i);
  });

  it('writes CSV to file with --csv', async () => {
    const csvPath = join(tmpRepo, 'out.csv');
    try { rmSync(csvPath, { force: true }); } catch {}

    const { stderr, exitCode } = await execa('node', ['cli.js', '--repo', tmpRepo, '--csv', csvPath, '--no-count-lines'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    expect(stderr).toMatch(/Wrote CSV/i);
    expect(existsSync(csvPath)).toBe(true);
    const content = readFileSync(csvPath, 'utf8').trim();
    expect(content.split('\n').length).toBeGreaterThanOrEqual(2);
  });
});
