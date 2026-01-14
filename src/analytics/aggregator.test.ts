import {
  aggregateBasic,
  computeMeta,
  findSimilarKey,
  getDisplayDetails,
  normalizeKey,
  pickSortMetric,
  printCSV,
  printTable
} from './aggregator.ts';

function withConsoleLogSpy(fn: () => void) {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    fn();
    expect(spy).toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
}

const addSortArr = [
  { additions: 2, commits: 1, changes: 10 },
  { additions: 5, commits: 2, changes: 8 }
];

const delSortArr = [
  { deletions: 2, commits: 1, changes: 10 },
  { deletions: 5, commits: 2, changes: 8 }
];

describe('normalizeKey', () => {
  it('should return normalized name when groupBy is name', () => {
    const commit = { authorName: 'Alice', authorEmail: 'alice@example.com' };
    const key = normalizeKey(commit, 'name');
    expect(key).toBe('alice');
  });

  it('should return normalized email when groupBy is email', () => {
    const commit = { authorName: 'Bob', authorEmail: 'bob@example.com' };
    const key = normalizeKey(commit, 'email');
    expect(key).toBe('bob');
  });

  it('should use aliasResolver if provided', () => {
    const commit = { authorName: 'Carol', authorEmail: 'carol@example.com' };
    const aliasResolver = (n: string) => `Alias-${n}`;
    const key = normalizeKey(commit, 'name', aliasResolver);
    expect(key).toBe('Alias-carol');
  });

  it('should fallback to empty string if no name/email', () => {
    const commit = {};
    const key = normalizeKey(commit, 'name');
    expect(key).toBe('');
  });

  it('should fallback to name when email is missing and groupBy is email', () => {
    const commit = { authorName: 'Alice' };
    const key = normalizeKey(commit, 'email');
    expect(key).toBe('alice');
  });

  it('should fallback to email when name is missing and groupBy is name', () => {
    const commit = { authorEmail: 'bob@example.com' };
    const key = normalizeKey(commit, 'name');
    expect(key).toBe('bob');
  });

  it('should pass name and email to aliasResolver', () => {
    const commit = { authorName: 'Carol', authorEmail: 'carol@example.com' };
    const aliasResolver = vi.fn((n: string, name?: string, email?: string) => {
      expect(name).toBe('Carol');
      expect(email).toBe('carol@example.com');
      return `Alias-${n}`;
    });
    normalizeKey(commit, 'name', aliasResolver);
    expect(aliasResolver).toHaveBeenCalled();
  });

  it('should handle null aliasResolver', () => {
    const commit = { authorName: 'Dave', authorEmail: 'dave@example.com' };
    const key = normalizeKey(commit, 'name', null);
    expect(key).toBe('dave');
  });
});

describe('getDisplayDetails', () => {
  it('should return canonical details if present', () => {
    const canonicalDetails = new Map([
      ['alice', { name: 'Alice Smith', email: 'alice@company.com' }]
    ]);
    const result = getDisplayDetails('alice', 'Alice', 'alice@example.com', canonicalDetails);
    expect(result).toEqual({ name: 'Alice Smith', email: 'alice@company.com' });
  });
  it('should fallback to defaults if not present', () => {
    const canonicalDetails = new Map();
    const result = getDisplayDetails('bob', 'Bob', 'bob@example.com', canonicalDetails);
    expect(result).toEqual({ name: 'Bob', email: 'bob@example.com' });
  });

  it('should use default name when canonical name is missing', () => {
    const canonicalDetails = new Map([['charlie', { email: 'charlie@company.com' }]]);
    const result = getDisplayDetails(
      'charlie',
      'Charlie Default',
      'charlie@default.com',
      canonicalDetails
    );
    expect(result).toEqual({ name: 'Charlie Default', email: 'charlie@company.com' });
  });

  it('should use default email when canonical email is missing', () => {
    const canonicalDetails = new Map([['dave', { name: 'Dave Canonical' }]]);
    const result = getDisplayDetails('dave', 'Dave Default', 'dave@default.com', canonicalDetails);
    expect(result).toEqual({ name: 'Dave Canonical', email: 'dave@default.com' });
  });

  it('should handle undefined canonicalDetails', () => {
    const result = getDisplayDetails('eve', 'Eve', 'eve@example.com');
    expect(result).toEqual({ name: 'Eve', email: 'eve@example.com' });
  });
});

describe('findSimilarKey', () => {
  it('should return similar key above threshold', () => {
    const result = findSimilarKey('alice', ['alic', 'bob'], 0.8);
    expect(result).toBe('alic');
  });
  it('should return null if no similar key', () => {
    const result = findSimilarKey('alice', ['bob', 'carol'], 0.9);
    expect(result).toBeNull();
  });
});

describe('aggregateBasic', () => {
  it('should aggregate commits by name', () => {
    const commits = [
      {
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        additions: 5,
        deletions: 2,
        date: '2023-01-01'
      },
      {
        authorName: 'Alice',
        authorEmail: 'alice@company.com',
        additions: 3,
        deletions: 1,
        date: '2023-01-02'
      },
      {
        authorName: 'Bob',
        authorEmail: 'bob@example.com',
        additions: 2,
        deletions: 1,
        date: '2023-01-03'
      }
    ];
    const options = { groupBy: 'name' as const };
    const result = aggregateBasic(commits, options);
    expect(result).toHaveLength(2);
    expect(result[0].commits + result[1].commits).toBe(3);
    expect(result[0].additions + result[1].additions).toBe(10);
    expect(result[0].deletions + result[1].deletions).toBe(4);
  });
  it('should aggregate commits by email', () => {
    const commits = [
      {
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        additions: 5,
        deletions: 2,
        date: '2023-01-01'
      },
      {
        authorName: 'Alice',
        authorEmail: 'alice@company.com',
        additions: 3,
        deletions: 1,
        date: '2023-01-02'
      }
    ];
    const options = { groupBy: 'email' as const };
    const result = aggregateBasic(commits, options);
    // Both emails normalize to 'alice', so only one contributor is expected
    expect(result).toHaveLength(1);
  });
});

describe('aggregateBasic edge cases', () => {
  it('should handle empty commits array', () => {
    const result = aggregateBasic([], { groupBy: 'name' });
    expect(result).toEqual([]);
  });
  it('should handle commits with missing fields', () => {
    const commits = [{}, { authorName: 'X' }];
    const result = aggregateBasic(commits, { groupBy: 'name' });
    expect(result.length).toBeGreaterThan(0);
  });
  it('should merge similar keys with similarity threshold', () => {
    const commits = [
      { authorName: 'Jon', authorEmail: 'jon@example.com' },
      { authorName: 'John', authorEmail: 'john@example.com' }
    ];
    // Lower threshold to 0.7 so Jon and John are merged
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      similarity: 0.7
    });
    expect(result.length).toBe(1);
  });
  it('should use aliasResolver and canonicalDetails', () => {
    const commits = [{ authorName: 'A', authorEmail: 'a@x.com' }];
    const aliasResolver = () => 'Z'; // n is unused
    const canonicalDetails = new Map([['Z', { name: 'Zed', email: 'zed@x.com' }]]);
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      aliasResolver,
      canonicalDetails
    });
    expect(result[0].name).toBe('Zed');
    expect(result[0].emails).toContain('zed@x.com');
  });

  it('should not apply similarity merging when similarity is 0', () => {
    const commits = [
      { authorName: 'Jon', authorEmail: 'jon@example.com' },
      { authorName: 'John', authorEmail: 'john@example.com' }
    ];
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      similarity: 0
    });
    expect(result.length).toBe(2);
  });

  it('should not apply similarity merging when similarity is undefined', () => {
    const commits = [
      { authorName: 'Jon', authorEmail: 'jon@example.com' },
      { authorName: 'John', authorEmail: 'john@example.com' }
    ];
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      similarity: undefined
    });
    expect(result.length).toBe(2);
  });

  it('should handle commits without dates', () => {
    const commits = [
      { authorName: 'Alice', authorEmail: 'alice@example.com', additions: 5, deletions: 2 }
    ];
    const result = aggregateBasic(commits, { groupBy: 'name' });
    expect(result[0].firstCommitDate).toBeUndefined();
    expect(result[0].lastCommitDate).toBeUndefined();
  });

  it('should handle commits without additions/deletions', () => {
    const commits = [{ authorName: 'Bob', authorEmail: 'bob@example.com', date: '2023-01-01' }];
    const result = aggregateBasic(commits, { groupBy: 'name' });
    expect(result[0].additions).toBe(0);
    expect(result[0].deletions).toBe(0);
    expect(result[0].changes).toBe(0);
  });

  it('should update existing aggregation when same key appears multiple times', () => {
    const commits = [
      {
        authorName: 'Carol',
        authorEmail: 'carol1@example.com',
        additions: 5,
        deletions: 2,
        date: '2023-01-01'
      },
      {
        authorName: 'Carol',
        authorEmail: 'carol2@example.com',
        additions: 3,
        deletions: 1,
        date: '2023-01-02'
      }
    ];
    const result = aggregateBasic(commits, { groupBy: 'name' });
    expect(result.length).toBe(1);
    expect(result[0].commits).toBe(2);
    expect(result[0].additions).toBe(8);
    expect(result[0].deletions).toBe(3);
    expect(result[0].emails).toHaveLength(2);
  });

  it('should convert to contributor with empty name when groupBy is email', () => {
    const commits = [{ authorEmail: 'test@example.com', additions: 5, deletions: 2 }];
    const result = aggregateBasic(commits, { groupBy: 'email' });
    expect(result[0].name).toBe('');
  });

  it('should lowercase emails when adding to aggregation', () => {
    const commits = [
      { authorName: 'Dave', authorEmail: 'Dave@Example.COM', additions: 5, deletions: 2 }
    ];
    const result = aggregateBasic(commits, { groupBy: 'name' });
    expect(result[0].emails).toContain('dave@example.com');
  });

  it('should handle canonical details with only email', () => {
    const commits = [{ authorName: 'E', authorEmail: 'e@x.com' }];
    const canonicalDetails = new Map([['e', { email: 'canonical@email.com' }]]);
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      canonicalDetails
    });
    expect(result[0].emails).toContain('canonical@email.com');
  });

  it('should track first and last commit dates correctly', () => {
    const commits = [
      { authorName: 'Frank', date: '2023-03-01' },
      { authorName: 'Frank', date: '2023-01-01' },
      { authorName: 'Frank', date: '2023-05-01' }
    ];
    const result = aggregateBasic(commits, { groupBy: 'name' });
    expect(result[0].firstCommitDate).toBe('2023-01-01T00:00:00.000Z');
    expect(result[0].lastCommitDate).toBe('2023-05-01T00:00:00.000Z');
  });

  it('should merge multiple similar contributors with similarity threshold', () => {
    const commits = [
      {
        authorName: 'Jonathan',
        authorEmail: 'jonathan@example.com',
        additions: 10,
        deletions: 2,
        date: '2023-01-01'
      },
      {
        authorName: 'Jon',
        authorEmail: 'jon@example.com',
        additions: 5,
        deletions: 1,
        date: '2023-02-01'
      },
      {
        authorName: 'John',
        authorEmail: 'john@example.com',
        additions: 8,
        deletions: 3,
        date: '2023-03-01'
      }
    ];
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      similarity: 0.6
    });
    // With similarity 0.6, Jon and John merge (similarity 0.75), but Jonathan stays separate
    expect(result.length).toBe(2);
    // Find the merged Jon/John contributor
    const jonJohn = result.find(
      (c: { commits: number; additions: number; deletions: number }) => c.commits === 2
    );
    expect(jonJohn).toBeDefined();
    expect(jonJohn?.additions).toBe(13);
    expect(jonJohn?.deletions).toBe(4);
    // Find Jonathan (not merged)
    const jonathan = result.find(
      (c: { commits: number; additions: number }) => c.commits === 1 && c.additions === 10
    );
    expect(jonathan).toBeDefined();
  });

  it('should handle date merging during similarity merging', () => {
    const commits = [
      { authorName: 'Steve', date: '2023-05-01', additions: 5, deletions: 2 },
      { authorName: 'Steven', date: '2023-01-01', additions: 3, deletions: 1 }
    ];
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      similarity: 0.7
    });
    expect(result.length).toBe(1);
    expect(result[0].firstCommitDate).toBe('2023-01-01T00:00:00.000Z');
    expect(result[0].lastCommitDate).toBe('2023-05-01T00:00:00.000Z');
  });

  it('should handle email merging during similarity merging', () => {
    const commits = [
      { authorName: 'Steven', authorEmail: 'steven1@example.com', additions: 5 },
      { authorName: 'Stephen', authorEmail: 'steven2@example.com', additions: 3 }
    ];
    const result = aggregateBasic(commits, {
      groupBy: 'name',
      similarity: 0.7
    });
    // Steven and Stephen have similarity ~0.71 (2 character difference out of 7: 'v' vs 'ph')
    expect(result.length).toBe(1);
    expect(result[0].emails.length).toBe(2);
    expect(result[0].emails).toContain('steven1@example.com');
    expect(result[0].emails).toContain('steven2@example.com');
  });
});

describe('pickSortMetric', () => {
  it('should sort by commits', () => {
    const arr = [
      { commits: 2, changes: 10 },
      { commits: 5, changes: 8 }
    ];
    const sorter = pickSortMetric('commits');
    arr.sort(sorter);
    expect(arr[0].commits).toBe(5);
  });
  it('should sort by additions', () => {
    const arr = [...addSortArr];
    const sorter = pickSortMetric('additions');
    arr.sort(sorter);
    expect(arr[0].additions).toBe(5);
  });
  it('should sort by deletions', () => {
    const arr = [...delSortArr];
    const sorter = pickSortMetric('deletions');
    arr.sort(sorter);
    expect(arr[0].deletions).toBe(5);
  });
  it('should sort by changes by default', () => {
    const arr = [
      { changes: 2, commits: 1 },
      { changes: 5, commits: 2 }
    ];
    const sorter = pickSortMetric();
    arr.sort(sorter);
    expect(arr[0].changes).toBe(5);
  });

  it.each([['adds', 'additions'] as const, ['lines-added', 'additions'] as const])(
    'should sort by %s alias',
    (metric, _normalized) => {
      const arr = [...addSortArr];
      const sorter = pickSortMetric(metric);
      arr.sort(sorter);
      expect(arr[0].additions).toBe(5);

      expect(_normalized).toBe('additions');
    }
  );

  it.each([['dels', 'deletions'] as const, ['lines-deleted', 'deletions'] as const])(
    'should sort by %s alias',
    (metric, _normalized) => {
      const arr = [...delSortArr];
      const sorter = pickSortMetric(metric);
      arr.sort(sorter);
      expect(arr[0].deletions).toBe(5);
      expect(_normalized).toBe('deletions');
    }
  );

  it('should handle uppercase metric names', () => {
    const arr = [
      { commits: 2, changes: 10 },
      { commits: 5, changes: 8 }
    ];
    const sorter = pickSortMetric('COMMITS');
    arr.sort(sorter);
    expect(arr[0].commits).toBe(5);
  });

  it('should use changes as tiebreaker for commits', () => {
    const arr = [
      { commits: 5, changes: 10 },
      { commits: 5, changes: 8 }
    ];
    const sorter = pickSortMetric('commits');
    arr.sort(sorter);
    expect(arr[0].changes).toBe(10);
  });

  it('should use commits as tiebreaker for additions', () => {
    const arr = [
      { additions: 5, commits: 2, changes: 10 },
      { additions: 5, commits: 3, changes: 8 }
    ];
    const sorter = pickSortMetric('additions');
    arr.sort(sorter);
    expect(arr[0].commits).toBe(3);
  });

  it('should use commits as tiebreaker for deletions', () => {
    const arr = [
      { deletions: 5, commits: 2, changes: 10 },
      { deletions: 5, commits: 3, changes: 8 }
    ];
    const sorter = pickSortMetric('deletions');
    arr.sort(sorter);
    expect(arr[0].commits).toBe(3);
  });

  it('should use commits as tiebreaker for changes', () => {
    const arr = [
      { changes: 10, commits: 2 },
      { changes: 10, commits: 3 }
    ];
    const sorter = pickSortMetric();
    arr.sort(sorter);
    expect(arr[0].commits).toBe(3);
  });
});

describe('pickSortMetric edge cases', () => {
  it('should sort by unknown key (default to changes)', () => {
    const arr = [
      { changes: 2, commits: 1 },
      { changes: 5, commits: 2 }
    ];
    const sorter = pickSortMetric('unknown');
    arr.sort(sorter);
    expect(arr[0].changes).toBe(5);
  });
});

describe('computeMeta', () => {
  it('should compute meta for contributors', () => {
    const contributors = [
      {
        key: 'alice',
        name: 'Alice',
        emails: [],
        commits: 2,
        additions: 5,
        deletions: 3,
        changes: 8,
        firstCommitDate: '2023-01-01',
        lastCommitDate: '2023-01-02'
      },
      {
        key: 'bob',
        name: 'Bob',
        emails: [],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3,
        firstCommitDate: '2023-01-03',
        lastCommitDate: '2023-01-03'
      }
    ];
    const meta = computeMeta(contributors);
    expect(meta.commits).toBe(3);
    expect(meta.additions).toBe(7);
    expect(meta.deletions).toBe(4);
    expect(meta.contributors).toBe(2);
    expect(meta.firstCommitDate).toBe('2023-01-01T00:00:00.000Z');
    expect(meta.lastCommitDate).toBe('2023-01-03T00:00:00.000Z');
  });
});

describe('computeMeta edge cases', () => {
  it('should handle empty contributors', () => {
    const meta = computeMeta([]);
    expect(meta.commits).toBe(0);
    expect(meta.additions).toBe(0);
    expect(meta.deletions).toBe(0);
    expect(meta.contributors).toBe(0);
    expect(meta.firstCommitDate).toBeUndefined();
    expect(meta.lastCommitDate).toBeUndefined();
  });
  it('should handle contributors with missing dates', () => {
    const meta = computeMeta([
      { key: 'test', name: 'Test', emails: [], commits: 1, additions: 2, deletions: 3, changes: 5 }
    ]);
    expect(meta.firstCommitDate).toBeUndefined();
    expect(meta.lastCommitDate).toBeUndefined();
  });

  it('should handle contributors with missing commits/additions/deletions', () => {
    const meta = computeMeta([
      {
        key: 'test',
        name: 'Test',
        emails: [],
        commits: 0,
        additions: 0,
        deletions: 0,
        changes: 0,
        firstCommitDate: '2023-01-01',
        lastCommitDate: '2023-01-02'
      }
    ]);
    expect(meta.commits).toBe(0);
    expect(meta.additions).toBe(0);
    expect(meta.deletions).toBe(0);
  });

  it('should find earliest first commit date', () => {
    const contributors = [
      {
        key: 'a',
        name: 'A',
        emails: [],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3,
        firstCommitDate: '2023-03-01'
      },
      {
        key: 'b',
        name: 'B',
        emails: [],
        commits: 2,
        additions: 3,
        deletions: 2,
        changes: 5,
        firstCommitDate: '2023-01-01'
      },
      {
        key: 'c',
        name: 'C',
        emails: [],
        commits: 1,
        additions: 1,
        deletions: 1,
        changes: 2,
        firstCommitDate: '2023-02-01'
      }
    ];
    const meta = computeMeta(contributors);
    expect(meta.firstCommitDate).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should find latest last commit date', () => {
    const contributors = [
      {
        key: 'a',
        name: 'A',
        emails: [],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3,
        lastCommitDate: '2023-01-01'
      },
      {
        key: 'b',
        name: 'B',
        emails: [],
        commits: 2,
        additions: 3,
        deletions: 2,
        changes: 5,
        lastCommitDate: '2023-05-01'
      },
      {
        key: 'c',
        name: 'C',
        emails: [],
        commits: 1,
        additions: 1,
        deletions: 1,
        changes: 2,
        lastCommitDate: '2023-03-01'
      }
    ];
    const meta = computeMeta(contributors);
    expect(meta.lastCommitDate).toBe('2023-05-01T00:00:00.000Z');
  });
});

describe('printTable', () => {
  it('should print a formatted table for contributors', () => {
    const contributors = [
      {
        key: 'alice',
        name: 'Alice',
        emails: ['alice@example.com'],
        commits: 2,
        additions: 5,
        deletions: 3,
        changes: 8
      },
      {
        key: 'bob',
        name: 'Bob',
        emails: ['bob@example.com'],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ];
    const meta = {
      contributors: 2,
      commits: 3,
      additions: 7,
      deletions: 4,
      firstCommitDate: '2023-01-01T00:00:00.000Z',
      lastCommitDate: '2023-01-03T00:00:00.000Z'
    };

    withConsoleLogSpy(() => {
      printTable(contributors, meta, 'name');
    });
  });
});

describe('printTable edge cases', () => {
  it('should handle empty contributors', () => {
    withConsoleLogSpy(() => {
      printTable([], { contributors: 0, commits: 0, additions: 0, deletions: 0 }, 'name');
    });
  });
  it('should print with labelBy email', () => {
    const contributors = [
      {
        key: 'a@x.com',
        name: 'A',
        emails: ['a@x.com'],
        commits: 1,
        additions: 2,
        deletions: 3,
        changes: 5
      }
    ];
    const meta = { contributors: 1, commits: 1, additions: 2, deletions: 3 };

    withConsoleLogSpy(() => {
      printTable(contributors, meta, 'email');
    });
  });

  it('should print table with date range', () => {
    const contributors = [
      {
        key: 'grace',
        name: 'Grace',
        emails: ['grace@example.com'],
        commits: 5,
        additions: 10,
        deletions: 3,
        changes: 13
      }
    ];
    const meta = {
      contributors: 1,
      commits: 5,
      additions: 10,
      deletions: 3,
      firstCommitDate: '2023-01-01T00:00:00.000Z',
      lastCommitDate: '2023-12-31T00:00:00.000Z'
    };

    withConsoleLogSpy(() => {
      printTable(contributors, meta, 'name');
    });
  });

  it('should print table without date range when dates are missing', () => {
    const contributors = [
      {
        key: 'henry',
        name: 'Henry',
        emails: ['henry@example.com'],
        commits: 3,
        additions: 7,
        deletions: 2,
        changes: 9
      }
    ];
    const meta = {
      contributors: 1,
      commits: 3,
      additions: 7,
      deletions: 2
    };

    withConsoleLogSpy(() => {
      printTable(contributors, meta, 'name');
    });
  });

  it('should handle contributors with unknown name', () => {
    const contributors = [
      {
        key: 'unknown',
        name: '',
        emails: ['unknown@example.com'],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ];
    const meta = { contributors: 1, commits: 1, additions: 2, deletions: 1 };

    withConsoleLogSpy(() => {
      printTable(contributors, meta, 'name');
    });
  });

  it('should handle contributors with unknown key', () => {
    const contributors = [
      {
        key: '',
        name: 'Unknown',
        emails: [],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ];
    const meta = { contributors: 1, commits: 1, additions: 2, deletions: 1 };

    withConsoleLogSpy(() => {
      printTable(contributors, meta, 'email');
    });
  });
});

describe('printCSV', () => {
  it('should print a CSV for contributors', () => {
    const contributors = [
      {
        key: 'alice',
        name: 'Alice',
        emails: ['alice@example.com'],
        commits: 2,
        additions: 5,
        deletions: 3,
        changes: 8
      },
      {
        key: 'bob',
        name: 'Bob',
        emails: ['bob@example.com'],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ];

    withConsoleLogSpy(() => {
      printCSV(contributors, 'name');
    });
  });

  it('should print CSV with labelBy email', () => {
    const contributors = [
      {
        key: 'carol@example.com',
        name: 'Carol',
        emails: ['carol@example.com'],
        commits: 3,
        additions: 10,
        deletions: 5,
        changes: 15
      }
    ];

    withConsoleLogSpy(() => {
      printCSV(contributors, 'email');
    });
  });

  it('should handle empty contributors in CSV', () => {
    withConsoleLogSpy(() => {
      printCSV([], 'name');
    });
  });

  it('should handle contributors with empty name in CSV', () => {
    const contributors = [
      {
        key: 'test@example.com',
        name: '',
        emails: ['test@example.com'],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ];

    withConsoleLogSpy(() => {
      printCSV(contributors, 'name');
    });
  });

  it('should handle contributors with empty key in CSV', () => {
    const contributors = [
      {
        key: '',
        name: 'Test User',
        emails: [],
        commits: 1,
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ];

    withConsoleLogSpy(() => {
      printCSV(contributors, 'email');
    });
  });
});
