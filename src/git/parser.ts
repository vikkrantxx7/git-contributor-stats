interface FileChange {
  added: number;
  deleted: number;
  filename: string;
}

export interface Commit {
  hash: string;
  authorName: string;
  authorEmail: string;
  date?: Date;
  additions: number;
  deletions: number;
  filesChanged: number;
  files: FileChange[];
}

function createCommitFromHeader(headerLine: string): Commit | null {
  const [hash, name, email, date] = headerLine.split('\x00');
  if (!hash) return null;

  return {
    hash,
    authorName: name || '',
    authorEmail: email || '',
    date: date ? new Date(date) : undefined,
    additions: 0,
    deletions: 0,
    filesChanged: 0,
    files: []
  };
}

function parseFileChangeLine(line: string): FileChange | null {
  const parts = line.split(/\t+/);
  if (parts.length < 3) return null;

  const added = parts[0] === '-' ? 0 : Number.parseInt(parts[0], 10) || 0;
  const deleted = parts[1] === '-' ? 0 : Number.parseInt(parts[1], 10) || 0;
  const filename = parts.slice(2).join('\t');

  return { added, deleted, filename };
}

function addFileChangeToCommit(commit: Commit, fileChange: FileChange): void {
  commit.additions += fileChange.added;
  commit.deletions += fileChange.deleted;
  commit.filesChanged += 1;
  commit.files.push(fileChange);
}

function processHeaderLine(line: string): Commit | null {
  if (!line) return null;
  return createCommitFromHeader(line);
}

function processFileChangeLine(commit: Commit, line: string): void {
  if (!line) return;
  const fileChange = parseFileChangeLine(line);
  if (fileChange) {
    addFileChangeToCommit(commit, fileChange);
  }
}

export function parseGitLog(stdout?: string): Commit[] {
  if (!stdout) return [];

  const lines = stdout.split(/\r?\n/);
  const commits: Commit[] = [];
  let current: Commit | null = null;
  let expectHeader = false;

  for (const line of lines) {
    if (line === '---') {
      if (current) commits.push(current);
      current = null;
      expectHeader = true;
    } else if (expectHeader) {
      current = processHeaderLine(line);
      expectHeader = false;
    } else if (current) {
      processFileChangeLine(current, line);
    }
  }

  if (current) commits.push(current);
  return commits;
}
