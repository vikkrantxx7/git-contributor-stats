import { describe, expect, it, vi } from 'vitest';
import type { TopContributor } from '../analytics/analyzer';
import { handleStdoutOutput } from './output';
import type { ContributorStatsResult } from './stats';

function makeFinal(): ContributorStatsResult {
  const alice: TopContributor = {
    name: 'Alice',
    email: undefined,
    commits: 5,
    added: 10,
    deleted: 2,
    net: 8,
    changes: 12,
    files: {},
    topFiles: []
  };

  return {
    topContributors: [alice],
    basic: {
      groupBy: 'name',
      labelBy: 'name',
      meta: { contributors: 1, commits: 5, additions: 10, deletions: 2 }
    },
    contributors: {},
    totalCommits: 5,
    totalLines: 100,
    busFactor: { busFactor: 1, candidates: [], filesSingleOwner: [] },
    meta: {
      repo: '/repo',
      generatedAt: new Date().toISOString(),
      branch: 'main',
      since: null,
      until: null
    },
    topStats: {
      byCommits: alice,
      byAdditions: alice,
      byDeletions: alice,
      byNet: alice,
      byChanges: alice
    },
    commitFrequency: { monthly: { '2025-11': 5 }, weekly: {} },
    heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    heatmapContributors: {}
  };
}

function withLogSpy(
  fn: (logSpy: ReturnType<typeof vi.spyOn>, final: ContributorStatsResult) => void
): void {
  const final = makeFinal();
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    fn(logSpy, final);
  } finally {
    logSpy.mockRestore();
  }
}

describe('handleStdoutOutput', () => {
  it('should print JSON when json option is true', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { json: true });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    });
  });

  it('should print JSON when format is json', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: 'json' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    });
  });

  it('should print JSON when format is JSON (uppercase)', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: 'JSON' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    });
  });

  it('should print CSV when format is csv', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: 'csv' });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should print CSV when format is CSV (uppercase)', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: 'CSV' });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should print table when no format is specified', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should print table when format is undefined', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: undefined });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should use labelBy from opts when provided', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { labelBy: 'email' });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should use labelBy from final.basic when opts.labelBy is not provided', () => {
    withLogSpy((logSpy, final) => {
      final.basic.labelBy = 'email';
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should default to name when labelBy is not provided anywhere', () => {
    withLogSpy((logSpy, final) => {
      (final.basic as unknown as { labelBy?: 'email' | 'name' }).labelBy = undefined;
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should print top stats when topStats option is set', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { topStats: 'commits' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    });
  });

  it('should not print top stats when topStats is empty string', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { topStats: '' });
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    });
  });

  it('should not print top stats when topStats is undefined', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { topStats: undefined });
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    });
  });

  it('should handle final.topStats being undefined', () => {
    withLogSpy((logSpy, final) => {
      (final as unknown as { topStats?: unknown }).topStats = undefined;
      handleStdoutOutput(final, { topStats: 'commits' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    });
  });

  it('should handle null values in topStats', () => {
    withLogSpy((logSpy, final) => {
      final.topStats.byCommits = null;
      // TopStatsSummary doesn't allow undefined for byAdditions, but runtime can contain it
      (final.topStats as unknown as { byAdditions?: unknown }).byAdditions = undefined;
      handleStdoutOutput(final, { topStats: 'commits,additions,deletions' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    });
  });

  it('should handle contributors with email', () => {
    withLogSpy((logSpy, final) => {
      final.topContributors[0].email = 'alice@example.com';
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle contributors without name or email', () => {
    withLogSpy((logSpy, final) => {
      final.topContributors[0].name = undefined;
      final.topContributors[0].email = undefined;
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle contributors with email but no name', () => {
    withLogSpy((logSpy, final) => {
      final.topContributors[0].name = undefined;
      final.topContributors[0].email = 'alice@example.com';
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle contributors with name but no email', () => {
    withLogSpy((logSpy, final) => {
      final.topContributors[0].email = undefined;
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle multiple contributors', () => {
    withLogSpy((logSpy, final) => {
      final.topContributors.push({
        name: 'Bob',
        email: 'bob@example.com',
        commits: 3,
        added: 5,
        deleted: 1,
        net: 4,
        changes: 6,
        files: {},
        topFiles: []
      });
      handleStdoutOutput(final, {});
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should print table with CSV format when labelBy is email', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: 'csv', labelBy: 'email' });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle empty opts object', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final);
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle format with mixed case', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { format: 'CsV' });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  it('should handle topStats with multiple metrics', () => {
    withLogSpy((logSpy, final) => {
      handleStdoutOutput(final, { topStats: 'commits,additions,deletions,net,changes' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    });
  });
});
