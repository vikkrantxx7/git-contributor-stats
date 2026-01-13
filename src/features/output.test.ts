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
    heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
    heatmapContributors: {}
  };
}

describe('handleStdoutOutput', () => {
  it('should print JSON when json option is true', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { json: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    logSpy.mockRestore();
  });

  it('should print JSON when format is json', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: 'json' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    logSpy.mockRestore();
  });

  it('should print JSON when format is JSON (uppercase)', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: 'JSON' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'));
    logSpy.mockRestore();
  });

  it('should print CSV when format is csv', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: 'csv' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should print CSV when format is CSV (uppercase)', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: 'CSV' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should print table when no format is specified', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should print table when format is undefined', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: undefined });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should use labelBy from opts when provided', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { labelBy: 'email' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should use labelBy from final.basic when opts.labelBy is not provided', () => {
    const final = makeFinal();
    final.basic.labelBy = 'email';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should default to name when labelBy is not provided anywhere', () => {
    const final = makeFinal();
    (final.basic as unknown as { labelBy?: 'email' | 'name' }).labelBy = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should print top stats when topStats option is set', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { topStats: 'commits' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    logSpy.mockRestore();
  });

  it('should not print top stats when topStats is empty string', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { topStats: '' });
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    logSpy.mockRestore();
  });

  it('should not print top stats when topStats is undefined', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { topStats: undefined });
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    logSpy.mockRestore();
  });

  it('should handle final.topStats being undefined', () => {
    const final = makeFinal();
    (final as unknown as { topStats?: unknown }).topStats = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { topStats: 'commits' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    logSpy.mockRestore();
  });

  it('should handle null values in topStats', () => {
    const final = makeFinal();
    final.topStats.byCommits = null;
    // TopStatsSummary doesn't allow undefined for byAdditions, but runtime can contain it
    (final.topStats as unknown as { byAdditions?: unknown }).byAdditions = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { topStats: 'commits,additions,deletions' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    logSpy.mockRestore();
  });

  it('should handle contributors with email', () => {
    const final = makeFinal();
    final.topContributors[0].email = 'alice@example.com';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle contributors without name or email', () => {
    const final = makeFinal();
    final.topContributors[0].name = undefined;
    final.topContributors[0].email = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle contributors with email but no name', () => {
    const final = makeFinal();
    final.topContributors[0].name = undefined;
    final.topContributors[0].email = 'alice@example.com';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle contributors with name but no email', () => {
    const final = makeFinal();
    final.topContributors[0].email = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle multiple contributors', () => {
    const final = makeFinal();
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
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, {});
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should print table with CSV format when labelBy is email', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: 'csv', labelBy: 'email' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle empty opts object', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle format with mixed case', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { format: 'CsV' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should handle topStats with multiple metrics', () => {
    const final = makeFinal();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    handleStdoutOutput(final, { topStats: 'commits,additions,deletions,net,changes' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Top stats:'));
    logSpy.mockRestore();
  });
});
