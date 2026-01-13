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
