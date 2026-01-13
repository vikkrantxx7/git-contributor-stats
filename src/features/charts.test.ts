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
  return {
    topContributors,
    heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
    busFactor: { busFactor: 1, candidates: [], filesSingleOwner: [] },
    basic: {
      groupBy: 'name' as 'name',
      labelBy: 'name' as 'name',
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

describe('generateCharts', () => {
  it('should generate SVG charts for top contributors', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));
    const final = createFinal([
      {
        name: 'Alice',
        commits: 10,
        added: 20,
        deleted: 5,
        net: 15,
        changes: 25,
        files: {},
        topFiles: [] as TopFileEntry[]
      },
      {
        name: 'Bob',
        commits: 7,
        added: 15,
        deleted: 3,
        net: 12,
        changes: 18,
        files: {},
        topFiles: [] as TopFileEntry[]
      }
    ]);
    await generateCharts(final, { charts: true, chartsDir: tmpDir, chartFormat: 'svg' });
    expect(fs.existsSync(path.join(tmpDir, 'top-commits.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'top-net.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'heatmap.svg'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate PNG charts for top contributors', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));
    const final = createFinal([
      {
        name: 'Alice',
        commits: 10,
        added: 20,
        deleted: 5,
        net: 15,
        changes: 25,
        files: {},
        topFiles: [] as TopFileEntry[]
      },
      {
        name: 'Bob',
        commits: 7,
        added: 15,
        deleted: 3,
        net: 12,
        changes: 18,
        files: {},
        topFiles: [] as TopFileEntry[]
      }
    ]);
    // Skip if chartjs-node-canvas is not available
    let chartjsNodeCanvasAvailable = false;
    try {
      // Use dynamic import for ESM compatibility
      await import('chartjs-node-canvas');
      chartjsNodeCanvasAvailable = true;
    } catch {}
    if (!chartjsNodeCanvasAvailable) {
      // Use console.info for non-critical info
      console.info('Skipping PNG chart test: chartjs-node-canvas not available');
      return;
    }
    await generateCharts(final, { charts: true, chartsDir: tmpDir, chartFormat: 'png' });
    expect(fs.existsSync(path.join(tmpDir, 'top-commits.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'top-net.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'heatmap.png'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }, 30000);

  it('should generate both SVG and PNG charts when chartFormat is both', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));
    const final = createFinal([
      {
        name: 'Alice',
        commits: 10,
        added: 20,
        deleted: 5,
        net: 15,
        changes: 25,
        files: {},
        topFiles: [] as TopFileEntry[]
      },
      {
        name: 'Bob',
        commits: 7,
        added: 15,
        deleted: 3,
        net: 12,
        changes: 18,
        files: {},
        topFiles: [] as TopFileEntry[]
      }
    ]);
    await generateCharts(final, { charts: true, chartsDir: tmpDir, chartFormat: 'both' });
    expect(fs.existsSync(path.join(tmpDir, 'top-commits.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'top-net.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'heatmap.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'top-commits.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'top-net.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'heatmap.png'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should not generate charts when charts option is false', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));
    const final = createFinal([]);
    await generateCharts(final, { charts: false, chartsDir: tmpDir, chartFormat: 'svg' });
    expect(fs.existsSync(path.join(tmpDir, 'top-commits.svg'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'top-net.svg'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'heatmap.svg'))).toBe(false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('generateCharts additional branch coverage', () => {
  it('should default chartFormat to svg when omitted', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));
    const { generateCharts } = await import('./charts');

    await generateCharts(createFinal([]), { charts: true, chartsDir: tmpDir });

    expect(fs.existsSync(path.join(tmpDir, 'top-commits.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'top-net.svg'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'heatmap.svg'))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create fallback SVGs when renderers do not write output', async () => {
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
      const { generateCharts } = await import('./charts');
      await generateCharts(createFinal([]), {
        charts: true,
        chartsDir: tmpDir,
        chartFormat: 'svg'
      });

      // ensureFallbackSVGs should write missing SVGs
      expect(fs.existsSync(path.join(tmpDir, 'top-commits.svg'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'top-net.svg'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'heatmap.svg'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      vi.doUnmock('../charts/renderer.ts');
      vi.resetModules();
    }
  });

  it('should handle fallback SVG write errors and log when verbose', async () => {
    vi.resetModules();

    vi.doMock('../charts/renderer.ts', () => ({
      renderBarChartImage: async () => {
        // no-op so fallback path triggers
      },
      renderHeatmapImage: async () => {
        // no-op
      }
    }));

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = (() => {
      throw new Error('write blocked');
    }) as unknown as typeof fs.writeFileSync;

    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));

    try {
      const { generateCharts } = await import('./charts');
      await generateCharts(createFinal([]), {
        charts: true,
        chartsDir: tmpDir,
        chartFormat: 'svg',
        verbose: true
      });

      expect(consoleErr).toHaveBeenCalled();
    } finally {
      consoleErr.mockRestore();
      fs.writeFileSync = originalWriteFileSync;
      fs.rmSync(tmpDir, { recursive: true, force: true });
      vi.doUnmock('../charts/renderer.ts');
      vi.resetModules();
    }
  });

  it('should treat unknown chartFormat values as svg', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charts-test-'));

    try {
      await generateCharts(createFinal([]), {
        charts: true,
        chartsDir: tmpDir,
        chartFormat: 'JPG'
      });

      // Unknown format should normalize to svg
      expect(fs.existsSync(path.join(tmpDir, 'top-commits.svg'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'top-net.svg'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'heatmap.svg'))).toBe(true);

      // And should not create jpg outputs
      expect(fs.existsSync(path.join(tmpDir, 'top-commits.jpg'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
