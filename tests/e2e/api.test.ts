// filepath: tests/e2e/api.test.ts
import { execa } from 'execa';
import { getContributorStats } from '../../src/index.ts';
import { cleanupRepo, createTempRepo, initRepo, seedBasicHistory } from '../utils/repo.ts';

async function getCommitCount(repoDir: string): Promise<number> {
  const { stdout } = await execa('git', ['log', '--oneline'], { cwd: repoDir });
  return stdout.trim() ? stdout.trim().split('\n').length : 0;
}

describe('Programmatic API getContributorStats', () => {
  let tmpRepo: string;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('returns expected structure and commit counts', async () => {
    const stats = await getContributorStats({ repo: tmpRepo, countLines: false });
    expect(stats).toBeTruthy();
    expect(stats).toHaveProperty('meta');
    expect(stats).toHaveProperty('totalCommits');
    expect(stats).toHaveProperty('contributors');
    expect(stats).toHaveProperty('topContributors');
    expect(Array.isArray(stats.topContributors)).toBe(true);
    const count = await getCommitCount(tmpRepo);
    expect(stats.totalCommits).toBe(count);
  });

  it('supports aliasConfig inline', async () => {
    // Build a simple aliasConfig grouping two fake variants (if present)
    const stats = await getContributorStats({
      repo: tmpRepo,
      countLines: false,
      aliasConfig: {
        groups: [
          ['alice@example.com', 'Alice Developer'],
          ['bob@example.com', 'Bob Contributor']
        ],
        canonical: {
          'alice@example.com': { name: 'Alice Dev', email: 'alice@example.com' }
        }
      }
    });
    expect(stats).toBeTruthy();
    // Ensure topStats still present
    expect(stats).toHaveProperty('topStats');
  });
});
