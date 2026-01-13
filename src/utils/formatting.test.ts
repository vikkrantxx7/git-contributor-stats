import {
  formatNumber,
  formatTopStatsLines,
  getMetricValue,
  parseTopStatsMetrics,
  svgEscape
} from './formatting';

describe('formatNumber', () => {
  it('should format numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });
});

describe('svgEscape', () => {
  it('should escape special SVG characters', () => {
    expect(svgEscape('<tag>&text>')).toBe('&lt;tag&gt;&amp;text&gt;');
  });
});

describe('parseTopStatsMetrics', () => {
  it('should return all metrics for empty input', () => {
    expect(parseTopStatsMetrics()).toEqual(['commits', 'additions', 'deletions', 'net', 'changes']);
  });
  it('should filter and normalize metrics', () => {
    expect(parseTopStatsMetrics('commits,net')).toEqual(['commits', 'net']);
  });
  it('should return all metrics for invalid input', () => {
    expect(parseTopStatsMetrics('foo,bar')).toEqual([
      'commits',
      'additions',
      'deletions',
      'net',
      'changes'
    ]);
  });
});

describe('getMetricValue', () => {
  it('should return metric value if present', () => {
    expect(getMetricValue({ commits: 5 }, 'commits')).toBe(5);
  });
  it('should calculate net if requested', () => {
    expect(getMetricValue({ added: 10, deleted: 3 }, 'net')).toBe(7);
  });
  it('should return undefined for missing metric', () => {
    expect(getMetricValue({}, 'unknown')).toBeUndefined();
  });
  it('should return 0 for net if added/deleted are missing', () => {
    expect(getMetricValue({}, 'net')).toBe(0);
  });
});

describe('formatTopStatsLines', () => {
  it('should format lines for top stats', () => {
    const stats = {
      byCommits: { name: 'Alice', commits: 5, added: 10, deleted: 3, net: 7, changes: 13 },
      byNet: { name: 'Alice', commits: 5, added: 10, deleted: 3, net: 7, changes: 13 }
    };
    const lines = formatTopStatsLines(stats, ['commits', 'net']);
    expect(lines[0]).toContain('Most commits: Alice');
    expect(lines[0]).toContain('5');
    expect(lines[1]).toContain('Best net lines: Alice');
    expect(lines[1]).toContain('7');
  });
  it('should handle missing entry', () => {
    const stats = {};
    const lines = formatTopStatsLines(stats, ['commits']);
    expect(lines[0]).toContain('Most commits: —');
  });
  it('should include email if present', () => {
    const stats = {
      byCommits: { name: 'Bob', email: 'bob@example.com', commits: 2 }
    };
    const lines = formatTopStatsLines(stats, ['commits']);
    expect(lines[0]).toContain('<bob@example.com>');
  });
  it('should show em dash if name missing', () => {
    const stats = {
      byCommits: { email: 'anon@example.com', commits: 1 }
    };
    const lines = formatTopStatsLines(stats, ['commits']);
    expect(lines[0]).toContain('Most commits: — <anon@example.com>');
  });
  it('should handle missing metric in stats', () => {
    const stats = {};
    const lines = formatTopStatsLines(stats, ['changes']);
    expect(lines[0]).toContain('Most changes (±): —');
  });

  it('should format additions line', () => {
    const stats = {
      byAdditions: { name: 'Charlie', added: 100 }
    };
    const lines = formatTopStatsLines(stats, ['additions']);
    expect(lines[0]).toContain('Most additions: Charlie');
    expect(lines[0]).toContain('100');
  });

  it('should format deletions line', () => {
    const stats = {
      byDeletions: { name: 'Dave', deleted: 50 }
    };
    const lines = formatTopStatsLines(stats, ['deletions']);
    expect(lines[0]).toContain('Most deletions: Dave');
    expect(lines[0]).toContain('50');
  });

  it('should format changes line', () => {
    const stats = {
      byChanges: { name: 'Eve', changes: 200 }
    };
    const lines = formatTopStatsLines(stats, ['changes']);
    expect(lines[0]).toContain('Most changes (±): Eve');
    expect(lines[0]).toContain('200');
  });

  it('should use default metrics when empty array is passed', () => {
    const stats = {
      byCommits: { name: 'Alice', commits: 5 },
      byAdditions: { name: 'Bob', added: 10 }
    };
    const lines = formatTopStatsLines(stats, []);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should handle entry with no metric value', () => {
    const stats = {
      byCommits: { name: 'Frank' }
    };
    const lines = formatTopStatsLines(stats, ['commits']);
    expect(lines[0]).toContain('Most commits: Frank');
  });

  it('should handle entry without name or email', () => {
    const stats = {
      byCommits: { commits: 10 }
    };
    const lines = formatTopStatsLines(stats, ['commits']);
    expect(lines[0]).toContain('—');
  });

  it('should handle all metrics at once', () => {
    const stats = {
      byCommits: { name: 'Alice', commits: 5 },
      byAdditions: { name: 'Bob', added: 10 },
      byDeletions: { name: 'Charlie', deleted: 3 },
      byNet: { name: 'Dave', net: 7 },
      byChanges: { name: 'Eve', changes: 13 }
    };
    const lines = formatTopStatsLines(stats, [
      'commits',
      'additions',
      'deletions',
      'net',
      'changes'
    ]);
    expect(lines.length).toBe(5);
  });
});

describe('parseTopStatsMetrics edge cases', () => {
  it('should handle whitespace in input', () => {
    expect(parseTopStatsMetrics('  commits  ,  net  ')).toEqual(['commits', 'net']);
  });

  it('should handle uppercase input', () => {
    expect(parseTopStatsMetrics('COMMITS,NET')).toEqual(['commits', 'net']);
  });

  it('should handle mixed valid and invalid metrics', () => {
    expect(parseTopStatsMetrics('commits,invalid,net,bad')).toEqual(['commits', 'net']);
  });

  it('should handle empty string input', () => {
    expect(parseTopStatsMetrics('')).toEqual([
      'commits',
      'additions',
      'deletions',
      'net',
      'changes'
    ]);
  });

  it('should handle single metric', () => {
    expect(parseTopStatsMetrics('commits')).toEqual(['commits']);
  });

  it('should deduplicate metrics', () => {
    expect(parseTopStatsMetrics('commits,commits,net,net')).toEqual(['commits', 'net']);
  });

  it('should filter out empty parts', () => {
    expect(parseTopStatsMetrics('commits,,,,net')).toEqual(['commits', 'net']);
  });
});

describe('getMetricValue edge cases', () => {
  it('should handle entry with only added', () => {
    expect(getMetricValue({ added: 10 }, 'net')).toBe(10);
  });

  it('should handle entry with only deleted', () => {
    expect(getMetricValue({ deleted: 5 }, 'net')).toBe(-5);
  });

  it('should handle entry with zero values', () => {
    expect(getMetricValue({ commits: 0 }, 'commits')).toBe(0);
  });

  it('should return undefined for non-existent metric', () => {
    expect(getMetricValue({ commits: 5 }, 'nonexistent')).toBeUndefined();
  });

  it('should handle all metric types', () => {
    const entry = {
      commits: 5,
      added: 10,
      deleted: 3,
      changes: 13
    };
    expect(getMetricValue(entry, 'commits')).toBe(5);
    expect(getMetricValue(entry, 'added')).toBe(10);
    expect(getMetricValue(entry, 'deleted')).toBe(3);
    expect(getMetricValue(entry, 'changes')).toBe(13);
  });
});

describe('formatNumber edge cases', () => {
  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should format negative numbers', () => {
    expect(formatNumber(-1000)).toContain('-');
  });

  it('should format large numbers', () => {
    expect(formatNumber(1000000)).toContain(',');
  });
});

describe('svgEscape edge cases', () => {
  it('should handle empty string', () => {
    expect(svgEscape('')).toBe('');
  });

  it('should handle string with no special characters', () => {
    expect(svgEscape('normal text')).toBe('normal text');
  });

  it('should handle multiple occurrences', () => {
    expect(svgEscape('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
  });

  it('should handle all special characters together', () => {
    expect(svgEscape('<>&<>&')).toBe('&lt;&gt;&amp;&lt;&gt;&amp;');
  });
});
