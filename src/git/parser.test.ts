import { parseGitLog } from './parser';

describe('parseGitLog', () => {
  it('should return empty array for empty stdout', () => {
    expect(parseGitLog('')).toEqual([]);
    expect(parseGitLog(undefined)).toEqual([]);
  });

  it('should parse a single commit with file changes', () => {
    const stdout = `---\nabc123\x00Alice\x00alice@example.com\x002023-01-01T10:00:00Z\n10\t2\tfile1.js\n---`;
    const commits = parseGitLog(stdout);
    expect(commits).toHaveLength(1);
    expect(commits[0].hash).toBe('abc123');
    expect(commits[0].authorName).toBe('Alice');
    expect(commits[0].authorEmail).toBe('alice@example.com');
    expect(commits[0].additions).toBe(10);
    expect(commits[0].deletions).toBe(2);
    expect(commits[0].filesChanged).toBe(1);
    expect(commits[0].files[0].filename).toBe('file1.js');
  });

  it('should parse multiple commits', () => {
    const stdout = `---\nabc123\x00Alice\x00alice@example.com\x002023-01-01T10:00:00Z\n10\t2\tfile1.js\n---\ndef456\x00Bob\x00bob@example.com\x002023-01-02T11:00:00Z\n5\t1\tfile2.js\n---`;
    const commits = parseGitLog(stdout);
    expect(commits).toHaveLength(2);
    expect(commits[1].hash).toBe('def456');
    expect(commits[1].authorName).toBe('Bob');
    expect(commits[1].files[0].filename).toBe('file2.js');
  });
});

describe('parseGitLog additional branches', () => {
  it('should ignore empty header line after separator and not create a commit', () => {
    const stdout = `---\n\n---`;
    expect(parseGitLog(stdout)).toEqual([]);
  });

  it('should ignore invalid/blank file change lines and keep commit totals at 0', () => {
    const stdout = `---\nabc123\x00Alice\x00alice@example.com\x002023-01-01T10:00:00Z\n\ninvalid\n---`;
    const commits = parseGitLog(stdout);
    expect(commits).toHaveLength(1);
    expect(commits[0].filesChanged).toBe(0);
    expect(commits[0].additions).toBe(0);
    expect(commits[0].deletions).toBe(0);
  });

  it("should treat '-' for added/deleted as 0 and parse filenames with tabs", () => {
    const stdout = `---\nabc123\x00\x00\x00\n-\t-\tsome\tfile.txt\n---`;
    const commits = parseGitLog(stdout);
    expect(commits).toHaveLength(1);
    expect(commits[0].authorName).toBe('');
    expect(commits[0].authorEmail).toBe('');
    expect(commits[0].filesChanged).toBe(1);
    expect(commits[0].additions).toBe(0);
    expect(commits[0].deletions).toBe(0);
    expect(commits[0].files[0].filename).toBe('some\tfile.txt');
  });
});
