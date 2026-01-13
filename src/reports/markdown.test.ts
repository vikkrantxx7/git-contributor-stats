import { generateMarkdownReport } from './markdown';

describe('generateMarkdownReport', () => {
  it('should generate markdown report with repo name and contributors', () => {
    const data = {
      contributors: {},
      topContributors: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          commits: 5,
          added: 10,
          deleted: 3,
          topFiles: [{ filename: 'file1.js', changes: 7 }]
        },
        {
          name: 'Bob',
          email: 'bob@example.com',
          commits: 3,
          added: 7,
          deleted: 2,
          topFiles: [{ filename: 'file2.js', changes: 5 }]
        }
      ],
      totalCommits: 8,
      totalLines: 100,
      busFactor: { filesSingleOwner: [] },
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 },
        byDeletions: { name: 'Alice', deleted: 3 },
        byNet: { name: 'Alice', net: 7 },
        byChanges: { name: 'Alice', changes: 13 }
      },
      heatmap: [],
      commitFrequency: { monthly: { '2025-11': 8 } }
    };
    const md = generateMarkdownReport(data, '/repo', { includeTopStats: true });
    expect(md).toContain('Git Contributor Stats');
    expect(md).toContain('Alice');
    expect(md).toContain('Bob');
    expect(md).toContain('/repo');
    expect(md).toContain('Most commits');
    expect(md).toContain('file1.js');
    expect(md).toContain('file2.js');
    expect(md).toContain('2025-11');
  });

  it('should skip top stats section if includeTopStats is false', () => {
    const data = {
      contributors: {},
      topContributors: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          commits: 5,
          added: 10,
          deleted: 3,
          topFiles: []
        }
      ],
      totalCommits: 5,
      totalLines: 100,
      busFactor: { filesSingleOwner: [] },
      topStats: {
        byCommits: { name: 'Alice', commits: 5 }
      },
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo', { includeTopStats: false });
    expect(md).not.toContain('Most commits');
    expect(md).toContain('Top contributors');
  });

  it('should include only selected topStatsMetrics', () => {
    const data = {
      contributors: {},
      topContributors: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          commits: 5,
          added: 10,
          deleted: 3,
          topFiles: []
        }
      ],
      totalCommits: 5,
      totalLines: 100,
      busFactor: { filesSingleOwner: [] },
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 }
      },
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo', {
      includeTopStats: true,
      topStatsMetrics: ['commits']
    });
    expect(md).toContain('Most commits');
    expect(md).not.toContain('Most additions');
  });

  it('should handle empty topContributors', () => {
    const data = {
      contributors: {},
      topContributors: [],
      totalCommits: 0,
      totalLines: 0,
      busFactor: { filesSingleOwner: [] },
      topStats: {},
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo');
    expect(md).toContain('Top contributors');
  });

  it('should handle empty busFactor.filesSingleOwner', () => {
    const data = {
      contributors: {},
      topContributors: [],
      totalCommits: 0,
      totalLines: 0,
      busFactor: {},
      topStats: {},
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo');
    expect(md).toContain('Files with single contributor:** 0');
  });

  it('should handle empty commitFrequency.monthly', () => {
    const data = {
      contributors: {},
      topContributors: [],
      totalCommits: 0,
      totalLines: 0,
      busFactor: { filesSingleOwner: [] },
      topStats: {},
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo');
    expect(md).toContain('Recent Monthly Activity');
  });

  it('should handle empty heatmap', () => {
    const data = {
      contributors: {},
      topContributors: [],
      totalCommits: 0,
      totalLines: 0,
      busFactor: { filesSingleOwner: [] },
      topStats: {},
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo');
    expect(md).toContain('Commit Heatmap Data');
    expect(md).toContain('```json');
  });

  it('should handle contributors with missing fields', () => {
    const data = {
      contributors: {},
      topContributors: [
        { name: 'Alice', email: '', commits: 5, added: 10, deleted: 3, topFiles: [] },
        { name: 'Bob', email: '', commits: 3, added: 7, deleted: 2, topFiles: [] }
      ],
      totalCommits: 8,
      totalLines: 100,
      busFactor: { filesSingleOwner: [] },
      topStats: {},
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo');
    expect(md).toContain('Alice');
    expect(md).toContain('Bob');
  });

  it('should handle topStats with missing entries', () => {
    const data = {
      contributors: {},
      topContributors: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          commits: 5,
          added: 10,
          deleted: 3,
          topFiles: []
        }
      ],
      totalCommits: 5,
      totalLines: 100,
      busFactor: { filesSingleOwner: [] },
      topStats: {},
      heatmap: [],
      commitFrequency: { monthly: {} }
    };
    const md = generateMarkdownReport(data, '/repo', { includeTopStats: true });
    expect(md).toContain('Top stats');
  });
});

describe('generateMarkdownReport additional branch coverage', () => {
  it('should omit Top stats section when topStats is absent even if includeTopStats is true', () => {
    const md = generateMarkdownReport(
      {
        contributors: { a: {} },
        topContributors: [
          {
            name: 'Alice',
            email: 'a@example.com',
            commits: 1,
            added: 2,
            deleted: 1,
            topFiles: []
          }
        ],
        totalCommits: 1,
        totalLines: 10,
        busFactor: { filesSingleOwner: [] },
        heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
        commitFrequency: { monthly: { '2026-01': 1 } }
      },
      '/repo',
      { includeTopStats: true }
    );

    expect(md).toContain('## Summary');
    expect(md).not.toContain('## Top stats');
  });

  it('should render Top stats with filtered metrics and handle missing entries', () => {
    const md = generateMarkdownReport(
      {
        contributors: { a: {} },
        topContributors: [
          {
            name: 'Alice',
            email: 'a@example.com',
            commits: 1,
            added: 2,
            deleted: 1,
            topFiles: []
          }
        ],
        totalCommits: 1,
        totalLines: 10,
        busFactor: {},
        topStats: {
          byCommits: { name: 'Alice', email: 'a@example.com', commits: 1, added: 0, deleted: 0 },
          byAdditions: null,
          byDeletions: undefined,
          byNet: { name: 'Bob', email: '', commits: 0, added: 10, deleted: 2 },
          byChanges: undefined
        },
        heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
        commitFrequency: { monthly: { '2026-01': 1 } }
      },
      '/repo',
      { includeTopStats: true, topStatsMetrics: ['commits', 'additions', 'net'] }
    );

    expect(md).toContain('## Top stats');
    expect(md).toContain('Most commits');
    // null entry => em dash line
    expect(md).toContain('Most additions');
    expect(md).toContain('—');
    // net entry with empty email should not include <>
    expect(md).toContain('Best net contribution');
  });

  it('should render bus factor section without high-risk table when filesSingleOwner is missing', () => {
    const md = generateMarkdownReport(
      {
        contributors: {},
        topContributors: [],
        totalCommits: 0,
        totalLines: 0,
        busFactor: {},
        topStats: undefined,
        heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
        commitFrequency: { monthly: {} }
      },
      '/repo'
    );

    expect(md).toContain('## Bus Factor Analysis');
    expect(md).toContain('Files with single contributor:** 0');
    expect(md).not.toContain('High-Risk Files');
  });

  it('should format top contributors rows when topFiles is missing', () => {
    const md = generateMarkdownReport(
      {
        contributors: { a: {} },
        topContributors: [
          {
            name: 'Alice',
            email: 'a@example.com',
            commits: 1,
            added: 0,
            deleted: 0,
            // topFiles omitted
            topFiles: undefined as unknown as []
          }
        ],
        totalCommits: 1,
        totalLines: 0,
        busFactor: {},
        heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
        commitFrequency: { monthly: { '2026-01': 1 } }
      },
      '/repo'
    );

    expect(md).toContain('## Top contributors');
    expect(md).toContain('**Alice**');
  });

  it('should include only the last 12 months in Recent Monthly Activity, sorted ascending', () => {
    const monthly: Record<string, number> = {};
    for (let i = 1; i <= 15; i++) {
      const month = `2025-${String(i).padStart(2, '0')}`;
      monthly[month] = i;
    }

    const md = generateMarkdownReport(
      {
        contributors: {},
        topContributors: [],
        totalCommits: 0,
        totalLines: 0,
        busFactor: { filesSingleOwner: [] },
        topStats: undefined,
        heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
        commitFrequency: { monthly }
      },
      '/repo',
      { includeTopStats: false }
    );

    // Oldest 3 months should be sliced off (01-03)
    expect(md).not.toContain('| 2025-01 |');
    expect(md).not.toContain('| 2025-02 |');
    expect(md).not.toContain('| 2025-03 |');

    // Newest month should be present
    expect(md).toContain('| 2025-15 |');

    // Ensure 12 months present (04..15)
    for (let i = 4; i <= 15; i++) {
      expect(md).toContain(`| 2025-${String(i).padStart(2, '0')} |`);
    }
  });
});
