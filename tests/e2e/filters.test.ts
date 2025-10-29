// filepath: tests/e2e/filters.test.ts

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { cleanupRepo, createTempRepo, initRepo, seedBasicHistory } from '../utils/repo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(dirname(__dirname));

describe('Filtering options', () => {
  let tmpRepo: string;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('limits by branch/range (HEAD~1..HEAD)', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        'src/cli/entry.ts',
        '--repo',
        tmpRepo,
        '--branch',
        'HEAD~1..HEAD',
        '--json',
        '--no-count-lines'
      ],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.totalCommits).toBe(1);
  });

  it('filters by author pattern', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        'src/cli/entry.ts',
        '--repo',
        tmpRepo,
        '--author',
        'alice@example.com',
        '--json',
        '--no-count-lines'
      ],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.totalCommits).toBe(1);
  });
});
