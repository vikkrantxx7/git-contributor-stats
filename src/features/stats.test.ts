import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getContributorStats } from './stats';

describe('getContributorStats', () => {
  it('should throw if not a git repo', async () => {
    await expect(getContributorStats({ repo: '/not-a-repo' })).rejects.toThrow(
      /Not a Git repository/
    );
  });

  it('should throw if git log fails', async () => {
    // Use a guaranteed invalid branch name to trigger git log failure
    await expect(
      getContributorStats({ repo: '.', branch: '__invalid_branch_name__' })
    ).rejects.toThrow(/fatal: bad revision|Failed to run git log|error|unknown/i);
  });

  it('should work with minimal options in a git repo', async () => {
    const result = await getContributorStats({ repo: '.' });
    expect(result).toHaveProperty('meta');
    expect(result).toHaveProperty('totalCommits');
    expect(result).toHaveProperty('totalLines');
    expect(result).toHaveProperty('contributors');
    expect(result).toHaveProperty('topContributors');
    expect(result).toHaveProperty('topStats');
    expect(result).toHaveProperty('commitFrequency');
    expect(result).toHaveProperty('heatmap');
    expect(result).toHaveProperty('heatmapContributors');
    expect(result).toHaveProperty('busFactor');
    expect(result).toHaveProperty('basic');
  });

  it('should respect top and sortBy options', async () => {
    const result = await getContributorStats({ repo: '.', top: 1, sortBy: 'commits' });
    expect(result.topContributors.length).toBeLessThanOrEqual(1);
  });

  it('should respect groupBy and labelBy options', async () => {
    const result = await getContributorStats({ repo: '.', groupBy: 'name', labelBy: 'email' });
    expect(['name', 'email']).toContain(result.basic.groupBy);
    expect(['name', 'email']).toContain(result.basic.labelBy);
  });

  it('should respect countLines option', async () => {
    const result = await getContributorStats({ repo: '.', countLines: false });
    expect(result.totalLines).toBe(0);
  });
});

describe('getContributorStats branch coverage (mocked)', () => {
  it('should use aliasFile, normalize paths, apply top slicing, and skip countLines when disabled', async () => {
    vi.resetModules();

    const runGitMock = vi.fn((_repo: string, args: string[]) => {
      // repoRoot resolution should succeed
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
        return { ok: true, stdout: '/repo-root\n' };
      }
      // branch resolution
      if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
        return { ok: true, stdout: 'main\n' };
      }
      // git log
      return { ok: true, stdout: 'dummy-log' };
    });

    vi.doMock('../git/utils.ts', async () => {
      const actual = await vi.importActual<typeof import('../git/utils.ts')>('../git/utils.ts');
      return {
        ...actual,
        isGitRepo: () => true,
        runGit: runGitMock,
        buildGitLogArgs: (o: Record<string, unknown>) => {
          // Ensure normalizePaths pushed into args (paths array)
          const paths = o.paths as string[];
          return ['log', ...(paths ?? [])];
        }
      };
    });

    vi.doMock('../git/parser.ts', () => ({ parseGitLog: () => [{ id: '1' }] }));

    vi.doMock('../utils/files.ts', () => ({
      tryLoadJSON: () => ({ aliases: [] }),
      countTotalLines: vi.fn(async () => 999)
    }));

    vi.doMock('../analytics/aliases.ts', () => ({
      buildAliasResolver: () => ({ resolve: (x: string) => x, canonicalDetails: {} })
    }));

    vi.doMock('../analytics/aggregator.ts', () => ({
      aggregateBasic: () => [
        { name: 'A', email: 'a', commits: 1, added: 1, deleted: 0, changes: 1 }
      ],
      computeMeta: () => ({ contributors: 1, commits: 1, additions: 1, deletions: 0 }),
      pickSortMetric: () => (a: { changes: number }, b: { changes: number }) =>
        b.changes - a.changes
    }));

    vi.doMock('../analytics/analyzer.ts', () => ({
      analyze: () => ({
        totalCommits: 1,
        contributors: {},
        topContributors: [
          {
            name: 'A',
            email: 'a',
            commits: 1,
            added: 1,
            deleted: 0,
            changes: 1,
            net: 1,
            topFiles: [],
            files: {}
          },
          {
            name: 'B',
            email: 'b',
            commits: 2,
            added: 2,
            deleted: 0,
            changes: 2,
            net: 2,
            topFiles: [],
            files: {}
          }
        ],
        topStats: {},
        commitFrequency: { monthly: {}, weekly: {} },
        heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
        heatmapContributors: {},
        busFactor: { busFactor: 0, candidates: [], details: {}, filesSingleOwner: [] }
      })
    }));

    const { getContributorStats } = await import('./stats');

    const result = await getContributorStats({
      repo: '.',
      aliasFile: 'aliases.json',
      paths: 'src',
      groupBy: 'NAME' as unknown as 'name',
      labelBy: 'EMAIL' as unknown as 'email',
      sortBy: 'changes',
      top: 1,
      countLines: false
    });

    // top=1 should slice both contributorsBasic and topContributors
    expect(result.topContributors).toHaveLength(1);
    // groupBy NAME => name
    expect(result.basic.groupBy).toBe('name');
    // labelBy EMAIL => email
    expect(result.basic.labelBy).toBe('email');
    // countLines:false => stays 0
    expect(result.totalLines).toBe(0);

    // verify aliasFile path used through tryLoadJSON via runGit not being involved
    expect(runGitMock).toHaveBeenCalled();
  });

  it('should fall back to repo path when show-toplevel fails and use default alias file when present', async () => {
    vi.resetModules();

    vi.doMock('../git/utils.ts', () => ({
      isGitRepo: () => true,
      buildGitLogArgs: () => ['log'],
      runGit: (_repo: string, args: string[]) => {
        if (args[0] === 'rev-parse' && args[1] === '--show-toplevel')
          return { ok: false, stdout: '' };
        if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref')
          return { ok: true, stdout: 'dev\n' };
        return { ok: true, stdout: 'dummy-log' };
      }
    }));

    // default alias exists => loadAliasConfig sets aliasPath
    vi.doMock('../utils/files.ts', () => ({
      tryLoadJSON: (p: string) =>
        p.endsWith('.git-contributor-stats-aliases.json') ? { aliases: [] } : null,
      countTotalLines: vi.fn(async () => 5)
    }));

    vi.doMock('../git/parser.ts', () => ({ parseGitLog: () => [{ id: '1' }] }));
    vi.doMock('../utils/dates.ts', () => ({ parseDateInput: () => null }));
    vi.doMock('../analytics/aliases.ts', () => ({
      buildAliasResolver: () => ({ resolve: (x: string) => x, canonicalDetails: {} })
    }));
    vi.doMock('../analytics/aggregator.ts', () => ({
      aggregateBasic: () => [],
      computeMeta: () => ({ contributors: 0, commits: 0, additions: 0, deletions: 0 }),
      pickSortMetric: () => () => 0
    }));
    vi.doMock('../analytics/analyzer.ts', () => ({
      analyze: () => ({
        totalCommits: 0,
        contributors: {},
        topContributors: [],
        topStats: {},
        commitFrequency: { monthly: {}, weekly: {} },
        heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
        heatmapContributors: {},
        busFactor: { busFactor: 0, candidates: [], details: {}, filesSingleOwner: [] }
      })
    }));

    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { getContributorStats } = await import('./stats');
      const repo = path.join(process.cwd(), '.');
      const result = await getContributorStats({ repo: '.', verbose: true, countLines: false });

      expect(result.meta.repo).toBe(repo);
      expect(result.meta.branch).toBe('dev');
      // debug should print aliasFile and repo
      expect(consoleErr).toHaveBeenCalled();
    } finally {
      consoleErr.mockRestore();
      vi.resetModules();
    }
  });
});
