// filepath: tests/e2e/output-formats.test.ts

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { cleanupRepo, createTempRepo, initRepo, seedBasicHistory } from '../utils/repo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(dirname(__dirname));

describe('Output formats (table/csv)', () => {
  let tmpRepo: string;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('prints a reasonable table to stdout', async () => {
    const { stdout, stderr, exitCode } = await execa(
      'node',
      [
        'src/cli/entry.ts',
        '--repo',
        tmpRepo,
        '--format',
        'table',
        '--top',
        '5',
        '--no-count-lines'
      ],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/Contributors:/);
    expect(stdout).toMatch(/Commits/);
  });

  it('prints CSV to stdout', async () => {
    const { stdout, stderr, exitCode } = await execa(
      'node',
      ['src/cli/entry.ts', '--repo', tmpRepo, '--format', 'csv', '--top', '5', '--no-count-lines'],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    const lines = stdout.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toMatch(/rank/i);
    expect(lines[0]).toMatch(/commits/i);
  });

  it('writes CSV to file with --csv', async () => {
    const csvPath = join(tmpRepo, 'out.csv');
    try {
      rmSync(csvPath, { force: true });
    } catch {}

    const { stderr, exitCode } = await execa(
      'node',
      ['src/cli/entry.ts', '--repo', tmpRepo, '--csv', csvPath, '--no-count-lines'],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    expect(stderr).toMatch(/Wrote CSV/i);
    expect(existsSync(csvPath)).toBe(true);
    const content = readFileSync(csvPath, 'utf8').trim();
    expect(content.split('\n').length).toBeGreaterThanOrEqual(2);
  });
});
