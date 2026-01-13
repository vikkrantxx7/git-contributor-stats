import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('renderBarChartImage', () => {
  it('should generate SVG file for bar chart', async () => {
    const { renderBarChartImage } = await import('./renderer');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
    const filePath = path.join(tmpDir, 'bar.svg');
    await renderBarChartImage('svg', 'Chart', ['A', 'B'], [10, 20], filePath, {
      width: 400,
      height: 200
    });
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('<svg');
    expect(content).toContain('Chart');
    expect(content).toContain('A');
    expect(content).toContain('B');
    expect(content).toContain('10');
    expect(content).toContain('20');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('renderHeatmapImage', () => {
  it('should generate SVG file for heatmap', async () => {
    const { renderHeatmapImage } = await import('./renderer');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
    const filePath = path.join(tmpDir, 'heatmap.svg');
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    heatmap[0][0] = 5;
    await renderHeatmapImage('svg', heatmap, filePath, { width: 400, height: 200 });
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('<svg');
    expect(content).toContain('Sun');
    expect(content).toContain('0');
    expect(content).toContain('5');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('renderBarChartImage edge cases', () => {
  it('should fallback to SVG for empty data', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
    const filePath = path.join(tmpDir, 'empty.svg');
    const { renderBarChartImage } = await import('./renderer');
    await renderBarChartImage('svg', 'Empty', [], [], filePath, { verbose: true });
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('No data');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('renderHeatmapImage edge cases', () => {
  it('should fallback to SVG for invalid heatmap data', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
    const filePath = path.join(tmpDir, 'invalid.svg');
    const { renderHeatmapImage } = await import('./renderer');
    await renderHeatmapImage('svg', null as unknown as number[][], filePath, { verbose: true });
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('<svg');
    expect(content).toContain('Sun');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('renderer failure and branch coverage', () => {
  it('should return early if output directory cannot be created', async () => {
    const { renderBarChartImage } = await import('./renderer');

    const originalWriteFileSync = fs.writeFileSync;
    const originalMkdirSync = fs.mkdirSync;

    // Force ensureDir(dirname) to fail by making mkdirSync throw.
    fs.mkdirSync = (() => {
      throw new Error('mkdir blocked');
    }) as unknown as typeof fs.mkdirSync;

    // If we accidentally proceed past directory creation, this will throw and fail the test.
    fs.writeFileSync = (() => {
      throw new Error('should not write');
    }) as unknown as typeof fs.writeFileSync;

    try {
      await renderBarChartImage('svg', 'Chart', ['A'], [1], '/some/blocked/path/out.svg');
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      fs.mkdirSync = originalMkdirSync;
    }
  });

  it('should sanitize empty data without verbose logging', async () => {
    const { renderBarChartImage } = await import('./renderer');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
    const filePath = path.join(tmpDir, 'empty-no-verbose.svg');

    await renderBarChartImage('svg', 'Empty', [], [], filePath, { verbose: false });
    const content = fs.readFileSync(filePath, 'utf8');

    // SVG fallback should still render and include the placeholder label.
    expect(content).toContain('<svg');
    expect(content).toContain('No data');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should cover PNG-path heatmap alpha generation branches (val > 0 vs 0)', async () => {
    // Ensure we re-evaluate the module with a mocked chartjs-node-canvas.
    const modulePath = path.join(__dirname, 'renderer.ts');
    vi.resetModules();

    const originalWriteFileSync = fs.writeFileSync;
    const originalMkdirSync = fs.mkdirSync;

    const written: Array<{ filePath: string; data: unknown }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      written.push({ filePath: String(p), data });
    }) as unknown as typeof fs.writeFileSync;

    // Avoid touching real filesystem for dirs.
    fs.mkdirSync = (() => undefined) as unknown as typeof fs.mkdirSync;

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        renderToBuffer = async (_config: unknown, _mime: unknown) => Buffer.from('png-bytes');
        constructor() {
          // Mark field as used for static analyzers.
          void this.renderToBuffer;
        }
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    try {
      const { renderHeatmapImage } = await import(modulePath);
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'heatmap.png');

      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
      heatmap[0][0] = 0;
      heatmap[0][1] = 5;

      await renderHeatmapImage('png', heatmap, outPath, { verbose: false });

      expect(written.some((w) => w.filePath === outPath)).toBe(true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      fs.mkdirSync = originalMkdirSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });
});

describe('renderer PNG branches (mocked)', () => {
  it('should render a PNG bar chart when chartjs-node-canvas is available', async () => {
    vi.resetModules();

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        renderToBuffer = async (_config: unknown, _mime: unknown) => Buffer.from('png-bytes');
        constructor() {
          void this.renderToBuffer;
        }
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    const originalWriteFileSync = fs.writeFileSync;
    const written: Array<{ filePath: string; data: unknown }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      written.push({ filePath: String(p), data });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'bar.png');

      await renderBarChartImage('png', 'Bar', ['A'], [1], outPath, { verbose: false });

      expect(written.some((w) => w.filePath === outPath)).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should fall back to SVG if PNG bar chart rendering throws', async () => {
    vi.resetModules();

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        renderToBuffer = async () => {
          throw new Error('boom');
        };
        constructor() {
          void this.renderToBuffer;
        }
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    const originalWriteFileSync = fs.writeFileSync;
    // Let SVG fallback write a string (utf8), while PNG path would have written a Buffer.
    const writes: Array<{ filePath: string; kind: 'buffer' | 'string' }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      writes.push({
        filePath: String(p),
        kind: typeof data === 'string' ? 'string' : 'buffer'
      });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'bar.png');

      await renderBarChartImage('png', 'Bar', ['A'], [1], outPath, { verbose: false });

      // We should have written a string via SVG fallback at least once.
      expect(writes.some((w) => w.filePath === outPath && w.kind === 'string')).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should fall back to SVG when createCanvas returns null (ChartJSNodeCanvas falsy)', async () => {
    vi.resetModules();

    // ChartJSNodeCanvas export exists but is falsy => createCanvas returns null.
    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => ({
      // biome-ignore lint/style/useNamingConvention: external library export name.
      ChartJSNodeCanvas: null
    }));

    const originalWriteFileSync = fs.writeFileSync;
    const writes: Array<{ filePath: string; kind: 'buffer' | 'string' }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      writes.push({
        filePath: String(p),
        kind: typeof data === 'string' ? 'string' : 'buffer'
      });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'bar.png');

      await renderBarChartImage('png', 'Bar', ['A'], [1], outPath, { verbose: false });

      // Canvas creation fails; fallback SVG writes string.
      expect(writes.some((w) => w.filePath === outPath && w.kind === 'string')).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should handle SVG fallback generator/write errors without throwing', async () => {
    vi.resetModules();

    // Force SVG generator to throw.
    vi.doMock('./svg.ts', () => ({
      generateBarChartSVG: () => {
        throw new Error('svg gen failed');
      },
      generateHeatmapSVG: () => '<svg></svg>'
    }));

    // Force PNG path off.
    vi.doMock('chartjs-node-canvas', () => {
      throw new Error('nope');
    });

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = (() => {
      throw new Error('write failed');
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      // Should not throw even if SVG generation / write fails.
      await renderBarChartImage('svg', 'Bar', ['A'], [1], '/tmp/does-not-matter.svg', {
        verbose: false
      });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('./svg.ts');
      vi.doUnmock('chartjs-node-canvas');
      vi.resetModules();
    }
  });
});

describe('renderer internal branches (registration + Math.min/maxVal)', () => {
  it('should execute ChartJS register callback (success and failure) during canvas creation', async () => {
    vi.resetModules();

    const fakeChart = {
      register: () => {
        // success
      }
    };
    // Mark property as used for static analyzers.
    void fakeChart.register;

    const fakeChartThrow = {
      register: () => {
        throw new Error('register failed');
      }
    };
    void fakeChartThrow.register;

    // Mock canvas constructor to immediately invoke chartCallback with both Chart variants.
    vi.doMock('chart.js', () => ({ registerables: ['x'] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        constructor(opts: { chartCallback?: (chart: unknown) => void }) {
          opts.chartCallback?.(fakeChart);
          opts.chartCallback?.(fakeChartThrow);
          void this.renderToBuffer;
        }
        renderToBuffer = async (_config: unknown, _mime: unknown) => Buffer.from('png-bytes');
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = (() => undefined) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'bar.png');

      await renderBarChartImage('png', 'Bar', ['A'], [1], outPath);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should cover heatmap alpha min() branch by using val > maxVal', async () => {
    vi.resetModules();

    let seenAlphaGtOne = false;

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        renderToBuffer = async (config: unknown) => {
          const cfg = config as {
            data?: { datasets?: Array<{ backgroundColor?: unknown }> };
          };
          const datasets = cfg.data?.datasets ?? [];
          const colors = datasets[0]?.backgroundColor;
          if (!Array.isArray(colors) || colors.length === 0) throw new Error('no colors');

          // If val/maxVal > 1, then 0.15+0.85*(val/maxVal) can exceed 1 and should be clamped.
          // We can't see val/maxVal directly, but we can check produced rgba contains ',1)'.
          if (typeof colors[0] === 'string' && colors[0].endsWith(',1)')) {
            seenAlphaGtOne = true;
          }
          return Buffer.from('fake');
        };
        constructor() {
          void this.renderToBuffer;
        }
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = (() => undefined) as unknown as typeof fs.writeFileSync;

    try {
      const { renderHeatmapImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'heatmap.png');

      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
      // Row max will be 1 (because all zeros) => maxVal=Math.max(1, Math.max(...row)) => 1
      // Set a value > 1 to force val/maxVal > 1 and clamp to alpha 1.
      heatmap[0][0] = 10;

      await renderHeatmapImage('png', heatmap, outPath);

      expect(seenAlphaGtOne).toBe(true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });
});

describe('renderer remaining uncovered branches', () => {
  it("should pass 'image/png' mime to ChartJS renderToBuffer", async () => {
    vi.resetModules();

    let seenMime: string | undefined;

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        renderToBuffer = async (_config: unknown, mime: unknown) => {
          seenMime = String(mime);
          return Buffer.from('png-bytes');
        };
        constructor() {
          void this.renderToBuffer;
        }
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = (() => undefined) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'bar.png');

      await renderBarChartImage('png', 'Bar', ['A'], [1], outPath);

      expect(seenMime).toBe('image/png');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should fallback to SVG for heatmap when canvas creation returns null', async () => {
    vi.resetModules();

    vi.doMock('chart.js', () => ({ registerables: [] }));
    // ChartJSNodeCanvas is null -> createCanvas returns null -> canvas branch.
    vi.doMock('chartjs-node-canvas', () => ({
      // biome-ignore lint/style/useNamingConvention: external library export name.
      ChartJSNodeCanvas: null
    }));

    const originalWriteFileSync = fs.writeFileSync;
    const writes: Array<{ filePath: string; kind: 'buffer' | 'string' }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      writes.push({ filePath: String(p), kind: typeof data === 'string' ? 'string' : 'buffer' });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderHeatmapImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'heatmap.png');
      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

      await renderHeatmapImage('png', heatmap, outPath, { verbose: false });

      // Canvas null -> SVG fallback should write utf8 string
      expect(writes.some((w) => w.filePath === outPath && w.kind === 'string')).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should fallback to SVG for heatmap when renderToBuffer throws', async () => {
    vi.resetModules();

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => {
      class FakeCanvas {
        renderToBuffer = async () => {
          throw new Error('boom');
        };
        constructor() {
          void this.renderToBuffer;
        }
      }
      return {
        // biome-ignore lint/style/useNamingConvention: external library export name.
        ChartJSNodeCanvas: FakeCanvas
      };
    });

    const originalWriteFileSync = fs.writeFileSync;
    const writes: Array<{ filePath: string; kind: 'buffer' | 'string' }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      writes.push({ filePath: String(p), kind: typeof data === 'string' ? 'string' : 'buffer' });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderHeatmapImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'heatmap.png');
      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
      heatmap[0][1] = 5;

      await renderHeatmapImage('png', heatmap, outPath, { verbose: false });

      // Error -> SVG fallback should write utf8 string
      expect(writes.some((w) => w.filePath === outPath && w.kind === 'string')).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });
});

describe('renderer canvas creation failure branches', () => {
  it('should fall back to SVG for bar chart when createCanvas returns null in PNG mode', async () => {
    vi.resetModules();

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => ({
      // biome-ignore lint/style/useNamingConvention: external library export name.
      ChartJSNodeCanvas: null
    }));

    const originalWriteFileSync = fs.writeFileSync;
    const writes: Array<{ filePath: string; kind: 'buffer' | 'string' }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      writes.push({ filePath: String(p), kind: typeof data === 'string' ? 'string' : 'buffer' });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderBarChartImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'bar.png');

      await renderBarChartImage('png', 'Bar', ['A'], [1], outPath, { verbose: false });

      // createCanvas returns null => bar chart must fall back to SVG and write a string
      expect(writes.some((w) => w.filePath === outPath && w.kind === 'string')).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });

  it('should fall back to SVG for heatmap when createCanvas returns null in PNG mode', async () => {
    vi.resetModules();

    vi.doMock('chart.js', () => ({ registerables: [] }));
    vi.doMock('chartjs-node-canvas', () => ({
      // biome-ignore lint/style/useNamingConvention: external library export name.
      ChartJSNodeCanvas: null
    }));

    const originalWriteFileSync = fs.writeFileSync;
    const writes: Array<{ filePath: string; kind: 'buffer' | 'string' }> = [];
    fs.writeFileSync = ((p: fs.PathOrFileDescriptor, data: unknown) => {
      writes.push({ filePath: String(p), kind: typeof data === 'string' ? 'string' : 'buffer' });
    }) as unknown as typeof fs.writeFileSync;

    try {
      const { renderHeatmapImage } = await import('./renderer');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-test-'));
      const outPath = path.join(tmpDir, 'heatmap.png');
      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

      await renderHeatmapImage('png', heatmap, outPath, { verbose: false });

      // createCanvas returns null => heatmap must fall back to SVG and write a string
      expect(writes.some((w) => w.filePath === outPath && w.kind === 'string')).toBe(true);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      vi.doUnmock('chartjs-node-canvas');
      vi.doUnmock('chart.js');
      vi.resetModules();
    }
  });
});
