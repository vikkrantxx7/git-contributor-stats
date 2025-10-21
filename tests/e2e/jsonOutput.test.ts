import { dirname } from 'node:path';
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

describe('JSON output', () => {
  let tmpRepo: string;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('produces valid JSON with expected fields', async () => {
    const { stdout, stderr, exitCode } = await execa(
      'node',
      ['cli.js', '--repo', tmpRepo, '--json', '--no-count-lines'],
      { cwd: repoRoot }
    );
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');

    const data = JSON.parse(stdout);
    expect(data).toHaveProperty('meta');
    expect(data).toHaveProperty('totalCommits');
    expect(data).toHaveProperty('contributors');
    expect(data).toHaveProperty('topContributors');
    expect(data).toHaveProperty('topStats');
    expect(data).toHaveProperty('heatmap');
    expect(Array.isArray(data.topContributors)).toBe(true);

    const count = await getCommitCount(tmpRepo);
    expect(data.totalCommits).toBe(count);
  });
});
