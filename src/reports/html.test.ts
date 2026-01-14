import { generateHTMLReport } from './html';

describe('generateHTMLReport', () => {
  const baseData = {
    contributors: { alice: {}, bob: {} },
    topContributors: [
      {
        name: 'Alice',
        email: 'alice@example.com',
        commits: 5,
        added: 10,
        deleted: 3,
        topFiles: []
      },
      { name: 'Bob', email: 'bob@example.com', commits: 3, added: 7, deleted: 2, topFiles: [] }
    ],
    totalCommits: 8,
    totalLines: 100,
    busFactor: {
      filesSingleOwner: [
        { file: 'test.ts', owner: 'Alice', changes: 10 },
        { file: 'app.ts', owner: 'Bob', changes: 5 }
      ]
    },
    heatmap: new Array(7).fill(null).map(() => new Array(24).fill(0)),
    heatmapContributors: {
      // biome-ignore lint/style/useNamingConvention: test data requires specific key format
      '1-9': { Alice: 3, Bob: 1 },
      // biome-ignore lint/style/useNamingConvention: test data requires specific key format
      '3-14': { Bob: 2 }
    } as Record<string, Record<string, number>>
  };

  it('should generate HTML report with repo name and contributors', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 },
        byDeletions: { name: 'Alice', deleted: 3 },
        byNet: { name: 'Alice', net: 7 },
        byChanges: { name: 'Alice', changes: 13 }
      }
    };
    const html = generateHTMLReport(data, '/repo', { includeTopStats: true });
    expect(html).toContain('Git Contributor Stats');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
    expect(html).toContain('/repo');
    expect(html).toContain('Most Commits:');
    expect(html).toContain('Most Additions:');
    expect(html).toContain('Most Deletions:');
    expect(html).toContain('Best Net Contribution:');
  });

  it('should handle includeTopStats: false option', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 }
      }
    };
    const html = generateHTMLReport(data, '/repo', { includeTopStats: false });
    expect(html).toContain('Git Contributor Stats');
    expect(html).not.toContain('Top Statistics');
    expect(html).not.toContain('Most Commits:');
  });

  it('should use default topStatsMetrics when not provided', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 },
        byDeletions: { name: 'Alice', deleted: 3 },
        byNet: { name: 'Alice', net: 7 }
      }
    };
    const html = generateHTMLReport(data, '/repo');
    expect(html).toContain('Most Commits:');
    expect(html).toContain('Most Additions:');
    expect(html).toContain('Most Deletions:');
    expect(html).toContain('Best Net Contribution:');
  });

  it('should filter topStatsMetrics when provided as array', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 },
        byDeletions: { name: 'Alice', deleted: 3 },
        byNet: { name: 'Alice', net: 7 }
      }
    };
    const html = generateHTMLReport(data, '/repo', {
      includeTopStats: true,
      topStatsMetrics: ['commits', 'additions']
    });
    expect(html).toContain('Most Commits:');
    expect(html).toContain('Most Additions:');
    expect(html).not.toContain('Most Deletions:');
    expect(html).not.toContain('Best Net Contribution:');
  });

  it('should handle missing topStats gracefully', () => {
    const data = {
      ...baseData,
      topStats: undefined
    };
    const html = generateHTMLReport(data, '/repo', { includeTopStats: true });
    expect(html).toContain('Git Contributor Stats');
    expect(html).not.toContain('Top Statistics');
  });

  it('should handle null topStats entries', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: null,
        byAdditions: null,
        byDeletions: { name: 'Alice', deleted: 3 },
        byNet: null
      }
    };
    const html = generateHTMLReport(data, '/repo', {
      includeTopStats: true,
      topStatsMetrics: ['commits', 'additions', 'deletions', 'net']
    });
    expect(html).toContain('Git Contributor Stats');
    expect(html).not.toContain('Most Commits:');
    expect(html).not.toContain('Most Additions:');
    expect(html).toContain('Most Deletions:');
    expect(html).not.toContain('Best Net Contribution:');
  });

  it('should handle missing topStats properties', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 }
      }
    };
    const html = generateHTMLReport(data, '/repo', {
      includeTopStats: true,
      topStatsMetrics: ['commits', 'additions', 'deletions', 'net']
    });
    expect(html).toContain('Most Commits:');
    expect(html).not.toContain('Most Additions:');
    expect(html).not.toContain('Most Deletions:');
    expect(html).not.toContain('Best Net Contribution:');
  });

  it('should handle missing heatmapContributors', () => {
    const data = {
      ...baseData,
      heatmapContributors: undefined
    };
    const html = generateHTMLReport(data, '/repo');
    expect(html).toContain('Activity Heatmap');
    expect(html).toContain('heatmapContributors');
  });

  it('should include bus factor files', () => {
    const html = generateHTMLReport(baseData, '/repo');
    expect(html).toContain('Bus Factor Analysis');
    expect(html).toContain('test.ts');
    expect(html).toContain('app.ts');
  });

  it('should display negative net contributions correctly', () => {
    const data = {
      ...baseData,
      topContributors: [
        {
          name: 'Charlie',
          email: 'charlie@example.com',
          commits: 2,
          added: 5,
          deleted: 15,
          topFiles: []
        }
      ]
    };
    const html = generateHTMLReport(data, '/repo');
    expect(html).toContain('Charlie');
    expect(html).toContain('-10'); // net should be negative
  });

  it('should handle large number of contributors and show only top 25', () => {
    const manyContributors = Array.from({ length: 50 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
      commits: 50 - i,
      added: 100 - i,
      deleted: 10 + i,
      topFiles: []
    }));

    const data = {
      ...baseData,
      topContributors: manyContributors
    };

    const html = generateHTMLReport(data, '/repo');
    expect(html).toContain('User0');
    expect(html).toContain('User24');
    expect(html).not.toContain('User26'); // Should stop at 25
  });

  it('should handle empty metrics array', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 }
      }
    };
    const html = generateHTMLReport(data, '/repo', {
      includeTopStats: true,
      topStatsMetrics: []
    });
    expect(html).toContain('Top Statistics');
    expect(html).not.toContain('Most Commits:');
    expect(html).not.toContain('Most Additions:');
  });

  it('should handle non-array topStatsMetrics option', () => {
    const data = {
      ...baseData,
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 }
      }
    };
    const html = generateHTMLReport(data, '/repo', {
      includeTopStats: true,
      topStatsMetrics: 'invalid' as unknown as string[]
    });
    expect(html).toContain('Most Commits:');
    expect(html).toContain('Most Additions:');
  });
});
