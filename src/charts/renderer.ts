import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from '../utils/files.js';
import { generateBarChartSVG, generateHeatmapSVG } from './svg.js';

interface ChartOptions {
  width?: number;
  height?: number;
  verbose?: boolean;
  limit?: number;
}

// ESM-only: Use top-level await to load chart libraries
let ChartJSNodeCanvas: unknown = null;
let registerables: unknown = null;

try {
  const [modCanvas, modChart] = await Promise.all([
    import('chartjs-node-canvas'),
    import('chart.js')
  ]);
  ChartJSNodeCanvas = modCanvas.ChartJSNodeCanvas;
  registerables = modChart.registerables;
} catch (_error) {
  // Chart library not available, will fall back to SVG
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[warn] chartjs-node-canvas not available, using fallback SVG generation.');
  }
}

function createCanvas(format: string, width: number, height: number): unknown {
  if (!ChartJSNodeCanvas) return null;

  const type = format === 'svg' ? 'svg' : 'png';
  // biome-ignore lint/suspicious/noExplicitAny: ChartJS types are dynamic and not available at compile time
  return new (ChartJSNodeCanvas as any)({
    width,
    height,
    type,
    chartCallback: (ChartJS: unknown) => {
      try {
        // biome-ignore lint/suspicious/noExplicitAny: ChartJS types are dynamic
        if (ChartJS && registerables) (ChartJS as any).register(...(registerables as any));
      } catch (_error) {
        // Ignore registration errors
      }
    }
  });
}

function validateAndPrepareDirectory(filePath: string): boolean {
  try {
    ensureDir(path.dirname(filePath));
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`[error] Failed to create directory: ${message}`);
    return false;
  }
}

function sanitizeChartData(
  labels: string[],
  values: number[],
  title: string,
  verbose?: boolean
): { labels: string[]; values: number[] } {
  if (!labels || !values || labels.length === 0) {
    if (verbose) {
      console.warn(`[warn] No data for bar chart: ${title}`);
    }
    return { labels: ['No data'], values: [0] };
  }
  return { labels, values };
}

function shouldUsePNG(format: string): boolean {
  return format !== 'svg' && ChartJSNodeCanvas !== null;
}

async function renderSVGFallback(
  filePath: string,
  generator: () => string,
  errorContext: string
): Promise<void> {
  try {
    const svg = generator();
    fs.writeFileSync(filePath, svg, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`[error] ${errorContext}: ${message}`);
  }
}

export async function renderBarChartImage(
  format: string,
  title: string,
  labels: string[],
  values: number[],
  filePath: string,
  options: ChartOptions = {}
): Promise<void> {
  if (!validateAndPrepareDirectory(filePath)) return;

  const { width = 900, height = 400, verbose = false, limit = 25 } = options;
  const sanitized = sanitizeChartData(labels, values, title, verbose);

  // Use SVG if format is svg or PNG library is unavailable
  if (!shouldUsePNG(format)) {
    await renderSVGFallback(
      filePath,
      () => generateBarChartSVG(title, sanitized.labels, sanitized.values, { limit }),
      `Failed to generate SVG chart ${filePath}`
    );
    return;
  }

  // Render PNG using ChartJS
  try {
    const canvas = createCanvas(format, width, height);
    if (!canvas) {
      // Fallback to SVG if canvas creation failed
      await renderSVGFallback(
        filePath,
        () => generateBarChartSVG(title, sanitized.labels, sanitized.values, { limit }),
        `Canvas creation failed for ${filePath}`
      );
      return;
    }

    const config = {
      type: 'bar',
      data: {
        labels: sanitized.labels,
        datasets: [
          {
            label: title,
            data: sanitized.values,
            backgroundColor: '#4e79a7'
          }
        ]
      },
      options: {
        plugins: {
          title: { display: true, text: title },
          legend: { display: false }
        },
        responsive: false,
        scales: {
          x: { ticks: { maxRotation: 45, minRotation: 45, autoSkip: false } },
          y: { beginAtZero: true }
        }
      }
    };

    const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';
    // biome-ignore lint/suspicious/noExplicitAny: Canvas renderToBuffer requires dynamic typing
    const buffer = await (canvas as any).renderToBuffer(config, mime);
    fs.writeFileSync(filePath, buffer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`[error] Failed to generate PNG chart: ${message}`);
    // Fallback to SVG on error
    await renderSVGFallback(
      filePath,
      () => generateBarChartSVG(title, sanitized.labels, sanitized.values, { limit }),
      `Fallback SVG generation failed for ${filePath}`
    );
  }
}

export async function renderHeatmapImage(
  format: string,
  heatmap: number[][],
  filePath: string,
  options: ChartOptions = {}
): Promise<void> {
  if (!validateAndPrepareDirectory(filePath)) return;

  const { width = 900, height = 220, verbose = false } = options;

  // Sanitize heatmap data
  const sanitizedHeatmap =
    !heatmap || !Array.isArray(heatmap) || heatmap.length === 0
      ? (() => {
          if (verbose) {
            console.warn('[warn] Invalid heatmap data, creating empty heatmap');
          }
          return Array.from({ length: 7 }, () => new Array(24).fill(0));
        })()
      : heatmap;

  // Use SVG if format is svg or PNG library is unavailable
  if (!shouldUsePNG(format)) {
    await renderSVGFallback(
      filePath,
      () => generateHeatmapSVG(sanitizedHeatmap),
      `Failed to generate SVG heatmap ${filePath}`
    );
    return;
  }

  // Render PNG using ChartJS
  try {
    const canvas = createCanvas(format, width, height);
    if (!canvas) {
      // Fallback to SVG if canvas creation failed
      await renderSVGFallback(
        filePath,
        () => generateHeatmapSVG(sanitizedHeatmap),
        `Canvas creation failed for ${filePath}`
      );
      return;
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const datasets = sanitizedHeatmap.map((row, i) => ({
      label: days[i],
      data: row,
      backgroundColor: row.map((val) => {
        const maxVal = Math.max(1, Math.max(...row));
        const alpha = val > 0 ? Math.min(1, 0.15 + 0.85 * (val / maxVal)) : 0.05;
        return `rgba(78,121,167,${alpha})`;
      }),
      borderWidth: 0,
      type: 'bar',
      barPercentage: 1,
      categoryPercentage: 1
    }));

    const config = {
      type: 'bar',
      data: { labels: hours, datasets },
      options: {
        indexAxis: 'y',
        plugins: {
          title: { display: true, text: 'Commit Activity Heatmap (weekday x hour)' },
          legend: { display: false }
        },
        responsive: false,
        scales: {
          x: { stacked: true, beginAtZero: true },
          y: { stacked: true }
        }
      }
    };

    const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';
    // biome-ignore lint/suspicious/noExplicitAny: Canvas renderToBuffer requires dynamic typing
    const buffer = await (canvas as any).renderToBuffer(config, mime);
    fs.writeFileSync(filePath, buffer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`[error] Failed to generate PNG heatmap: ${message}`);
    // Fallback to SVG on error
    await renderSVGFallback(
      filePath,
      () => generateHeatmapSVG(sanitizedHeatmap),
      `Fallback SVG generation failed for ${filePath}`
    );
  }
}
