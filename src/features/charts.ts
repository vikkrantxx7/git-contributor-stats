// Feature: Chart generation (SVG and PNG)
// Lazy-loadable module for chart rendering

import fs from 'node:fs';
import path from 'node:path';
import { renderBarChartImage, renderHeatmapImage } from '../charts/renderer.ts';
import { generateBarChartSVG, generateHeatmapSVG } from '../charts/svg.ts';
import { ensureDir } from '../utils/files.ts';
import type { ContributorStatsResult } from './stats.ts';

export interface ChartOptions {
  charts?: boolean;
  chartsDir?: string;
  chartFormat?: string;
  verbose?: boolean;
}

export async function generateCharts(
  final: ContributorStatsResult,
  opts: ChartOptions = {},
  outDir?: string
): Promise<void> {
  const chartsRequested = opts.charts;
  if (!chartsRequested) return;

  const chartsDir = outDir || opts.chartsDir || path.join(process.cwd(), 'charts');
  ensureDir(chartsDir);

  const formatOpt = String(opts.chartFormat || 'svg').toLowerCase();
  const formats = formatOpt === 'both' ? ['svg', 'png'] : [formatOpt === 'png' ? 'png' : 'svg'];

  const names = final.topContributors.map((c) => String(c.name || ''));
  const commitsVals = final.topContributors.map((c) => Number(c.commits || 0));
  const netVals = final.topContributors.map((c) => Number(c.added || 0) - Number(c.deleted || 0));

  const tasks: Promise<void>[] = [];
  for (const fmt of formats) {
    const ext = fmt === 'svg' ? '.svg' : '.png';
    tasks.push(
      renderBarChartImage(
        fmt,
        'Top contributors by commits',
        names,
        commitsVals,
        path.join(chartsDir, `top-commits${ext}`),
        { limit: 25, verbose: opts.verbose }
      ),
      renderBarChartImage(
        fmt,
        'Top contributors by net lines',
        names,
        netVals,
        path.join(chartsDir, `top-net${ext}`),
        { limit: 25, verbose: opts.verbose }
      ),
      renderHeatmapImage(fmt, final.heatmap, path.join(chartsDir, `heatmap${ext}`), {
        verbose: opts.verbose
      })
    );
  }
  await Promise.all(tasks);

  if (formats.includes('svg')) {
    await ensureFallbackSVGs(chartsDir, names, commitsVals, netVals, final.heatmap, opts.verbose);
  }
  console.error(`Wrote ${formats.join('+').toUpperCase()} charts to ${chartsDir}`);
}

async function ensureFallbackSVGs(
  chartsDir: string,
  names: string[],
  commitsVals: number[],
  netVals: number[],
  heatmap: number[][],
  verbose?: boolean
): Promise<void> {
  const svgFiles = [
    {
      path: path.join(chartsDir, 'top-commits.svg'),
      gen: () =>
        generateBarChartSVG('Top contributors by commits', names, commitsVals, { limit: 25 })
    },
    {
      path: path.join(chartsDir, 'top-net.svg'),
      gen: () => generateBarChartSVG('Top contributors by net lines', names, netVals, { limit: 25 })
    },
    { path: path.join(chartsDir, 'heatmap.svg'), gen: () => generateHeatmapSVG(heatmap) }
  ];
  for (const { path: svgPath, gen } of svgFiles) {
    if (!fs.existsSync(svgPath)) {
      try {
        fs.writeFileSync(svgPath, gen(), 'utf8');
      } catch (e) {
        if (verbose) console.error('[error] Fallback write failed', svgPath, (e as Error).message);
      }
    }
  }
}
