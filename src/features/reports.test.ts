import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateReports } from './reports';

describe('generateReports', () => {
  it('should generate CSV, Markdown, and HTML reports', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-'));
    const name = 'name' as const;
    const final = {
      topContributors: [
        {
          name: 'Alice',
          email: 'alice@example.com',
          commits: 5,
          added: 10,
          deleted: 3,
          net: 7,
          changes: 13,
          files: {},
          topFiles: [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }]
        },
        {
          name: 'Bob',
          email: 'bob@example.com',
          commits: 3,
          added: 7,
          deleted: 2,
          net: 5,
          changes: 9,
          files: {},
          topFiles: [{ filename: 'file2.js', changes: 5, added: 3, deleted: 2 }]
        }
      ],
      contributors: {},
      totalCommits: 8,
      totalLines: 100,
      busFactor: { busFactor: 1, candidates: [], filesSingleOwner: [] },
      basic: {
        groupBy: name,
        labelBy: name,
        meta: { contributors: 2, commits: 8, additions: 17, deletions: 5 }
      },
      meta: {
        repo: '/repo',
        generatedAt: new Date().toISOString(),
        branch: 'main',
        since: null,
        until: null
      },
      topStats: {
        byCommits: {
          name: 'Alice',
          commits: 5,
          added: 10,
          deleted: 3,
          net: 7,
          changes: 13,
          files: {},
          topFiles: [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }]
        },
        byAdditions: {
          name: 'Alice',
          commits: 5,
          added: 10,
          deleted: 3,
          net: 7,
          changes: 13,
          files: {},
          topFiles: [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }]
        },
        byDeletions: {
          name: 'Alice',
          commits: 5,
          added: 10,
          deleted: 3,
          net: 7,
          changes: 13,
          files: {},
          topFiles: [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }]
        },
        byNet: {
          name: 'Alice',
          commits: 5,
          added: 10,
          deleted: 3,
          net: 7,
          changes: 13,
          files: {},
          topFiles: [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }]
        },
        byChanges: {
          name: 'Alice',
          commits: 5,
          added: 10,
          deleted: 3,
          net: 7,
          changes: 13,
          files: {},
          topFiles: [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }]
        }
      },
      commitFrequency: { monthly: { '2025-11': 8 }, weekly: {} },
      heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
      heatmapContributors: {}
    };

    await generateReports(final, { outDir: tmpDir });

    expect(fs.existsSync(path.join(tmpDir, 'contributors.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'report.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'report.html'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate only CSV if only csv option is set', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-csv-'));
    const final = { ...getMinimalFinal() };
    const csvPath = path.join(tmpDir, 'only.csv');
    await generateReports(final, { csv: csvPath });
    expect(fs.existsSync(csvPath)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'report.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'report.html'))).toBe(false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate only Markdown if only md option is set', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-md-'));
    const final = { ...getMinimalFinal() };
    const mdPath = path.join(tmpDir, 'only.md');
    await generateReports(final, { md: mdPath });
    expect(fs.existsSync(mdPath)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'contributors.csv'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'report.html'))).toBe(false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate only HTML if only html option is set', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-html-'));
    const final = { ...getMinimalFinal() };
    const htmlPath = path.join(tmpDir, 'only.html');
    await generateReports(final, { html: htmlPath });
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'contributors.csv'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'report.md'))).toBe(false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should handle empty contributors and missing filesSingleOwner/topFiles', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-empty-'));
    const final = {
      ...getMinimalFinal(),
      topContributors: [],
      busFactor: { busFactor: 1, candidates: [] }
    };

    await generateReports(final, { outDir: tmpDir });

    expect(fs.existsSync(path.join(tmpDir, 'contributors.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'report.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'report.html'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should include topStats metrics if topStats option is set', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-topstats-'));
    const final = { ...getMinimalFinal() };
    await generateReports(final, { outDir: tmpDir, topStats: 'commits,additions' });
    expect(fs.existsSync(path.join(tmpDir, 'report.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'report.html'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should log output if verbose is set', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-test-verbose-'));
    const final = { ...getMinimalFinal() };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await generateReports(final, { outDir: tmpDir, verbose: true });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

function getMinimalFinal() {
  const topFiles = [{ filename: 'file1.js', changes: 7, added: 5, deleted: 2 }];
  const name = 'name' as const;
  const contributor = {
    name: 'Alice',
    email: 'alice@example.com',
    commits: 5,
    added: 10,
    deleted: 3,
    net: 7,
    changes: 13,
    files: {},
    topFiles
  };
  const topStatsEntry = { ...contributor };
  return {
    topContributors: [contributor],
    contributors: {},
    totalCommits: 5,
    totalLines: 100,
    busFactor: { busFactor: 1, candidates: [] },
    basic: {
      groupBy: name,
      labelBy: name,
      meta: { contributors: 1, commits: 5, additions: 10, deletions: 3 }
    },
    meta: {
      repo: '/repo',
      generatedAt: new Date().toISOString(),
      branch: 'main',
      since: null,
      until: null
    },
    topStats: {
      byCommits: topStatsEntry,
      byAdditions: topStatsEntry,
      byDeletions: topStatsEntry,
      byNet: topStatsEntry,
      byChanges: topStatsEntry
    },
    commitFrequency: { monthly: { '2025-11': 5 }, weekly: {} },
    heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    heatmapContributors: {}
  };
}
