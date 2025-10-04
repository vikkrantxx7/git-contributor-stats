// filepath: tests/e2e/filters.test.js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import { createTempRepo, initRepo, seedBasicHistory, cleanupRepo } from '../utils/repo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(dirname(__dirname));

describe('Filtering options', () => {
  let tmpRepo;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('limits by branch/range (HEAD~1..HEAD)', async () => {
    const { stdout, exitCode } = await execa('node', ['cli.js', '--repo', tmpRepo, '--branch', 'HEAD~1..HEAD', '--json', '--no-count-lines'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.totalCommits).toBe(1);
  });

  it('filters by author pattern', async () => {
    const { stdout, exitCode } = await execa('node', ['cli.js', '--repo', tmpRepo, '--author', 'alice@example.com', '--json', '--no-count-lines'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.totalCommits).toBe(1);
  });
});
