import { describe, expect, it } from 'vitest';
import { generateMarkdownReport } from './markdown';

type MarkdownData = Parameters<typeof generateMarkdownReport>[0];

type MinimalReportInput = {
  contributors: MarkdownData['contributors'];
  topContributors: MarkdownData['topContributors'];
  totalCommits: MarkdownData['totalCommits'];
  totalLines: MarkdownData['totalLines'];
  busFactor: MarkdownData['busFactor'];
  commitFrequency: MarkdownData['commitFrequency'];
  heatmap: MarkdownData['heatmap'];
  topStats?: MarkdownData['topStats'];
};

const repoPath = '/repo';
const emptyMonthly: Record<string, number> = {};
const defaultHeatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));

function makeTopContributor(
  overrides: Partial<MarkdownData['topContributors'][number]> = {}
): MarkdownData['topContributors'][number] {
  return {
    name: 'Alice',
    email: 'alice@example.com',
    commits: 1,
    added: 0,
    deleted: 0,
    topFiles: [],
    ...overrides
  };
}

function makeData(overrides: Partial<MarkdownData> = {}): MarkdownData {
  return {
    contributors: {},
    topContributors: [],
    totalCommits: 0,
    totalLines: 0,
    busFactor: { filesSingleOwner: [] },
    topStats: {},
    heatmap: [],
    commitFrequency: { monthly: {} },
    ...overrides
  };
}

function emptyReportData(overrides: Partial<MarkdownData> = {}): MarkdownData {
  return makeData({
    topContributors: [],
    totalCommits: 0,
    totalLines: 0,
    busFactor: { filesSingleOwner: [] },
    topStats: {},
    commitFrequency: { monthly: emptyMonthly },
    ...overrides
  });
}

function minimalReportInput(overrides: Partial<MinimalReportInput> = {}): MinimalReportInput {
  return {
    contributors: {},
    topContributors: [],
    totalCommits: 0,
    totalLines: 0,
    busFactor: { filesSingleOwner: [] },
    heatmap: defaultHeatmap,
    commitFrequency: { monthly: emptyMonthly },
    ...overrides
  };
}

function makeSingleAliceData(
  overrides: Partial<MarkdownData> = {},
  contributorOverrides: Partial<MarkdownData['topContributors'][number]> = {}
): MarkdownData {
  return makeData({
    topContributors: [
      makeTopContributor({
        name: 'Alice',
        commits: 5,
        added: 10,
        deleted: 3,
        topFiles: [],
        ...contributorOverrides
      })
    ],
    totalCommits: 5,
    totalLines: 100,
    busFactor: { filesSingleOwner: [] },
    commitFrequency: { monthly: emptyMonthly },
    ...overrides
  });
}

function makeTopStatsWithMissingEntries(
  overrides: Partial<NonNullable<MarkdownData['topStats']>> = {}
): NonNullable<MarkdownData['topStats']> {
  return {
    byCommits: { name: 'Alice', email: 'a@example.com', commits: 1, added: 0, deleted: 0 },
    byAdditions: null,
    byDeletions: undefined,
    byNet: { name: 'Bob', email: '', commits: 0, added: 10, deleted: 2 },
    byChanges: undefined,
    ...overrides
  };
}

describe('generateMarkdownReport', () => {
  it('should generate markdown report with repo name and contributors', () => {
    const data = makeData({
      topContributors: [
        makeTopContributor({
          name: 'Alice',
          commits: 5,
          added: 10,
          deleted: 3,
          topFiles: [{ filename: 'file1.js', changes: 7 }]
        }),
        makeTopContributor({
          name: 'Bob',
          commits: 3,
          added: 7,
          deleted: 2,
          topFiles: [{ filename: 'file2.js', changes: 5 }]
        })
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
      commitFrequency: { monthly: { '2025-11': 8 } }
    });
    const md = generateMarkdownReport(data, repoPath, { includeTopStats: true });
    expect(md).toContain('Git Contributor Stats');
    expect(md).toContain('Alice');
    expect(md).toContain('Bob');
    expect(md).toContain(repoPath);
    expect(md).toContain('Most commits');
    expect(md).toContain('file1.js');
    expect(md).toContain('file2.js');
    expect(md).toContain('2025-11');
  });

  it('should skip top stats section if includeTopStats is false', () => {
    const data = makeSingleAliceData({
      topStats: {
        byCommits: { name: 'Alice', commits: 5 }
      }
    });

    const md = generateMarkdownReport(data, repoPath, { includeTopStats: false });
    expect(md).not.toContain('Most commits');
    expect(md).toContain('Top contributors');
  });

  it('should include only selected topStatsMetrics', () => {
    const data = makeSingleAliceData({
      topStats: {
        byCommits: { name: 'Alice', commits: 5 },
        byAdditions: { name: 'Alice', added: 10 }
      }
    });

    const md = generateMarkdownReport(data, repoPath, {
      includeTopStats: true,
      topStatsMetrics: ['commits']
    });
    expect(md).toContain('Most commits');
    expect(md).not.toContain('Most additions');
  });

  it.each([
    [
      'empty topContributors',
      emptyReportData(),
      (md: string) => {
        expect(md).toContain('Top contributors');
      }
    ],
    [
      'empty busFactor.filesSingleOwner',
      emptyReportData({ busFactor: {} as MarkdownData['busFactor'] }),
      (md: string) => {
        expect(md).toContain('Files with single contributor:** 0');
      }
    ],
    [
      'empty commitFrequency.monthly',
      emptyReportData({
        commitFrequency: { monthly: emptyMonthly } as MarkdownData['commitFrequency']
      }),
      (md: string) => {
        expect(md).toContain('Recent Monthly Activity');
      }
    ],
    [
      'empty heatmap',
      emptyReportData(),
      (md: string) => {
        expect(md).toContain('Commit Heatmap Data');
        expect(md).toContain('```json');
      }
    ]
  ])('should handle %s', (_name, data, assertMd) => {
    const md = generateMarkdownReport(data, repoPath);
    assertMd(md);
  });

  it('should handle contributors with missing fields', () => {
    const data = makeData({
      topContributors: [
        { name: 'Alice', email: '', commits: 5, added: 10, deleted: 3, topFiles: [] },
        { name: 'Bob', email: '', commits: 3, added: 7, deleted: 2, topFiles: [] }
      ],
      totalCommits: 8,
      totalLines: 100,
      busFactor: { filesSingleOwner: [] },
      topStats: {},
      commitFrequency: { monthly: emptyMonthly }
    });
    const md = generateMarkdownReport(data, repoPath);
    expect(md).toContain('Alice');
    expect(md).toContain('Bob');
  });

  it('should handle topStats with missing entries', () => {
    const data = makeSingleAliceData({ topStats: {} });
    const md = generateMarkdownReport(data, repoPath, { includeTopStats: true });
    expect(md).toContain('Top stats');
  });
});

describe('generateMarkdownReport additional branch coverage', () => {
  it('should omit Top stats section when topStats is absent even if includeTopStats is true', () => {
    const md = generateMarkdownReport(
      minimalReportInput({
        contributors: { a: {} },
        topContributors: [
          makeTopContributor({
            name: 'Alice',
            email: 'a@example.com',
            commits: 1,
            added: 2,
            deleted: 1
          })
        ],
        totalCommits: 1,
        totalLines: 10,
        commitFrequency: { monthly: { '2026-01': 1 } },
        // Intentionally omit topStats
        topStats: undefined
      }) as MarkdownData,
      repoPath,
      { includeTopStats: true }
    );

    expect(md).toContain('## Summary');
    expect(md).not.toContain('## Top stats');
  });

  it('should render Top stats with filtered metrics and handle missing entries', () => {
    const md = generateMarkdownReport(
      minimalReportInput({
        contributors: { a: {} },
        topContributors: [
          makeTopContributor({
            name: 'Alice',
            email: 'a@example.com',
            commits: 1,
            added: 2,
            deleted: 1
          })
        ],
        totalCommits: 1,
        totalLines: 10,
        busFactor: {} as MarkdownData['busFactor'],
        topStats: makeTopStatsWithMissingEntries(),
        commitFrequency: { monthly: { '2026-01': 1 } }
      }) as MarkdownData,
      repoPath,
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
      minimalReportInput({
        topStats: undefined,
        busFactor: {} as MarkdownData['busFactor'],
        commitFrequency: { monthly: emptyMonthly }
      }) as MarkdownData,
      repoPath
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
        heatmap: defaultHeatmap,
        commitFrequency: { monthly: { '2026-01': 1 } }
      },
      repoPath
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
        heatmap: defaultHeatmap,
        commitFrequency: { monthly }
      },
      repoPath,
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
