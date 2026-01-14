import { generateCSVReport, toCSV } from './csv';

describe('toCSV', () => {
  it('should format rows and headers correctly', () => {
    const rows = [
      { name: 'Alice', commits: 5, added: 10 },
      { name: 'Bob', commits: 3, added: 7 }
    ];
    const headers = ['name', 'commits', 'added'];
    const csv = toCSV(rows, headers);
    expect(csv).toContain('Name,Commits,Added');
    expect(csv).toContain('Alice,5,10');
    expect(csv).toContain('Bob,3,7');
  });

  it('should escape commas and quotes', () => {
    const rows = [{ name: 'Alice, "The Great"', commits: 5, added: 10 }];
    const headers = ['name', 'commits', 'added'];
    const csv = toCSV(rows, headers);
    expect(csv).toContain('"Alice, ""The Great""",5,10');
  });
});

describe('toCSV edge cases', () => {
  it('should escape newlines', () => {
    const rows = [{ name: 'Alice\nBob', commits: 1, added: 2 }];
    const headers = ['name', 'commits', 'added'];
    const csv = toCSV(rows, headers);
    expect(csv).toContain('Name,Commits,Added');
    expect(csv).toContain('"Alice\nBob",1,2');
  });

  it('should include only header row when rows are empty', () => {
    const csv = toCSV([], ['name', 'commits']);
    expect(csv.trim()).toBe('Name,Commits');
  });

  it('should handle empty headers array', () => {
    const csv = toCSV([{ name: 'Alice' }], []);
    // header row is an empty line, row is also empty (no columns)
    expect(csv).toBe('\n');
  });
});

describe('generateCSVReport', () => {
  it('should generate a CSV report for contributors', () => {
    const analysis = {
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
      ]
    };
    const csv = generateCSVReport(analysis);
    expect(csv).toContain('Alice <alice@example.com>');
    expect(csv).toContain('Bob <bob@example.com>');
    expect(csv).toContain('file1.js (7)');
    expect(csv).toContain('file2.js (5)');
  });
});

describe('generateCSVReport edge cases', () => {
  it('should fallback to Unknown name and empty email, and handle missing topFiles', () => {
    const analysis = {
      topContributors: [
        {
          // name/email omitted
          commits: 1,
          added: 2,
          deleted: 3
          // topFiles omitted => branch produces ''
        }
      ]
    };

    const csv = generateCSVReport(analysis);
    expect(csv).toContain('Contributor,Commits,Added,Deleted,Net,TopFiles');
    expect(csv).toContain('Unknown <>,1,2,3,-1,');
  });

  it('should include up to 5 top files and handle empty topFiles array', () => {
    const analysis = {
      topContributors: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          commits: 1,
          added: 10,
          deleted: 3,
          topFiles: [
            { filename: 'a.js', changes: 1 },
            { filename: 'b.js', changes: 2 },
            { filename: 'c.js', changes: 3 },
            { filename: 'd.js', changes: 4 },
            { filename: 'e.js', changes: 5 },
            { filename: 'f.js', changes: 6 }
          ]
        },
        {
          name: 'Bob',
          email: 'bob@example.com',
          commits: 1,
          added: 1,
          deleted: 1,
          topFiles: []
        }
      ]
    };

    const csv = generateCSVReport(analysis);

    // Alice: only first 5 files should appear
    expect(csv).toContain('a.js (1); b.js (2); c.js (3); d.js (4); e.js (5)');
    expect(csv).not.toContain('f.js (6)');

    // Bob: empty array path (still truthy) => join('') => empty string
    expect(csv).toContain('Bob <bob@example.com>');
  });
});
