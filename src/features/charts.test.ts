import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { FileStats, TopContributor, TopFileEntry } from '../analytics/analyzer';
import { generateCharts } from './charts';

function emptyContributor() {
  return {
    name: '',
    commits: 0,
    added: 0,
    deleted: 0,
    net: 0,
    changes: 0,
    files: {} as Record<string, FileStats>,
    topFiles: [] as TopFileEntry[]
  };
}
function emptyTopStats() {
  const empty = emptyContributor();
  return {
    byCommits: { ...empty },
    byAdditions: { ...empty },
    byDeletions: { ...empty },
    byNet: { ...empty },
    byChanges: { ...empty }
  };
}

// Use a proper type for topContributors and remove unused chartType param
function createFinal(topContributors: TopContributor[]) {
  const name = 'name' as const;

  return {
    topContributors,
    heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    busFactor: { busFactor: 1, candidates: [], filesSingleOwner: [] },
    basic: {
      groupBy: name,
      labelBy: name,
      meta: {
        contributors: topContributors.length,
        commits: topContributors.reduce((a, c) => a + c.commits, 0),
        additions: topContributors.reduce((a, c) => a + c.added, 0),
        deletions: topContributors.reduce((a, c) => a + c.deleted, 0)
      }
    },
    meta: {
      repo: '/repo',
      generatedAt: new Date().toISOString(),
      branch: 'main',
      since: null,
      until: null
    },
    totalCommits: topContributors.reduce((a, c) => a + c.commits, 0),
    totalLines: 100,
    contributors: {},
    topStats: emptyTopStats(),
    commitFrequency: {
      monthly: { '2025-11': topContributors.reduce((a, c) => a + c.commits, 0) },
      weekly: {}
    },
    heatmapContributors: {}
  };
}

function withTmpDir<T>(fn: (tmpDir: string) => Promise<T> | T): Promise<T> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));
  return Promise.resolve()
    .then(() => fn(tmpDir))
    .finally(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
}

async function withMockedNoopRenderer<T>(
  fn: (ctx: { tmpDir: string; generateChartsFresh: typeof generateCharts }) => Promise<T> | T
): Promise<T> {
  vi.resetModules();

  vi.doMock('../charts/renderer.ts', () => ({
    renderBarChartImage: async () => {
      // no-op: simulate renderer not writing files
    },
    renderHeatmapImage: async () => {
      // no-op
    }
  }));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));

  try {
    const { generateCharts: generateChartsFresh } = await import('./charts');
    return await fn({ tmpDir, generateChartsFresh });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.doUnmock('../charts/renderer.ts');
    vi.resetModules();
  }
}

function makeContributor(
  name: string,
  commits: number,
  added: number,
  deleted: number
): TopContributor {
  return {
    name,
    commits,
    added,
    deleted,
    net: added - deleted,
    changes: commits + added + deleted,
    files: {},
    topFiles: [] as TopFileEntry[]
  };
}

function expectChartFiles(tmpDir: string, ext: string, shouldExist = true) {
  const exists = (file: string) => fs.existsSync(path.join(tmpDir, file));

  if (shouldExist) {
    expect(exists(`top-commits.${ext}`)).toBe(true);
    expect(exists(`top-net.${ext}`)).toBe(true);
    expect(exists(`heatmap.${ext}`)).toBe(true);
  } else {
    expect(exists(`top-commits.${ext}`)).toBe(false);
    expect(exists(`top-net.${ext}`)).toBe(false);
    expect(exists(`heatmap.${ext}`)).toBe(false);
  }
}

describe('generateCharts', () => {
  it('should generate SVG charts for top contributors', async () => {
    const final = createFinal([
      makeContributor('Alice', 10, 20, 5),
      makeContributor('Bob', 7, 15, 3)
    ]);

    await withTmpDir(async (tmpDir) => {
      await generateCharts(final, { charts: true, chartsDir: tmpDir, chartFormat: 'svg' });
      expectChartFiles(tmpDir, 'svg', true);
    });
  });

  it('should generate PNG charts for top contributors', async () => {
    const final = createFinal([
      makeContributor('Alice', 10, 20, 5),
      makeContributor('Bob', 7, 15, 3)
    ]);

    // Skip if chartjs-node-canvas is not available
    let chartjsNodeCanvasAvailable = false;
    try {
      await import('chartjs-node-canvas');
      chartjsNodeCanvasAvailable = true;
    } catch {}
    if (!chartjsNodeCanvasAvailable) {
      console.info('Skipping PNG chart test: chartjs-node-canvas not available');
      return;
    }

    await withTmpDir(async (tmpDir) => {
      await generateCharts(final, { charts: true, chartsDir: tmpDir, chartFormat: 'png' });
      expectChartFiles(tmpDir, 'png', true);
    });
  }, 30000);

  it('should generate both SVG and PNG charts when chartFormat is both', async () => {
    const final = createFinal([
      makeContributor('Alice', 10, 20, 5),
      makeContributor('Bob', 7, 15, 3)
    ]);

    await withTmpDir(async (tmpDir) => {
      await generateCharts(final, { charts: true, chartsDir: tmpDir, chartFormat: 'both' });
      expectChartFiles(tmpDir, 'svg', true);
      expectChartFiles(tmpDir, 'png', true);
    });
  });

  it('should not generate charts when charts option is false', async () => {
    const final = createFinal([]);
    await withTmpDir(async (tmpDir) => {
      await generateCharts(final, { charts: false, chartsDir: tmpDir, chartFormat: 'svg' });
      expectChartFiles(tmpDir, 'svg', false);
    });
  });
});

describe('generateCharts additional branch coverage', () => {
  it('should default chartFormat to svg when omitted', async () => {
    await withTmpDir(async (tmpDir) => {
      const { generateCharts } = await import('./charts');
      await generateCharts(createFinal([]), { charts: true, chartsDir: tmpDir });
      expectChartFiles(tmpDir, 'svg', true);
    });
  });

  it('should create fallback SVGs when renderers do not write output', async () => {
    await withMockedNoopRenderer(async ({ tmpDir, generateChartsFresh }) => {
      await generateChartsFresh(createFinal([]), {
        charts: true,
        chartsDir: tmpDir,
        chartFormat: 'svg'
      });

      // ensureFallbackSVGs should write missing SVGs
      expectChartFiles(tmpDir, 'svg', true);
    });
  });

  it('should handle fallback SVG write errors and log when verbose', async () => {
    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = (() => {
      throw new Error('write blocked');
    }) as unknown as typeof fs.writeFileSync;

    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await withMockedNoopRenderer(async ({ tmpDir, generateChartsFresh }) => {
        await generateChartsFresh(createFinal([]), {
          charts: true,
          chartsDir: tmpDir,
          chartFormat: 'svg',
          verbose: true
        });

        expect(consoleErr).toHaveBeenCalled();
      });
    } finally {
      consoleErr.mockRestore();
      fs.writeFileSync = originalWriteFileSync;
    }
  });

  it('should treat unknown chartFormat values as svg', async () => {
    await withTmpDir(async (tmpDir) => {
      await generateCharts(createFinal([]), {
        charts: true,
        chartsDir: tmpDir,
        chartFormat: 'JPG'
      });

      expectChartFiles(tmpDir, 'svg', true);
      expect(fs.existsSync(path.join(tmpDir, 'top-commits.jpg'))).toBe(false);
    });
  });
});
