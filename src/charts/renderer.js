/**
 * Chart rendering with ChartJS and fallback support
 */
import fs from 'fs';
import path from 'path';
import { ensureDir } from '../utils/files.js';
import { generateBarChartSVG, generateHeatmapSVG } from './svg.js';

// Dynamic import of ChartJS dependencies
let ChartJSNodeCanvas, registerables;
try {
  ({ ChartJSNodeCanvas } = await import('chartjs-node-canvas'));
  ({ registerables } = await import('chart.js'));
} catch (e) {
  ChartJSNodeCanvas = null;
  registerables = null;
  if (process.env.NODE_ENV !== 'production') {
    console.error('[warn] chartjs-node-canvas not available, using fallback SVG generation.');
  }
}

/**
 * Create ChartJS canvas instance
 * @param {string} format - 'svg' or 'png'
 * @param {number} width
 * @param {number} height
 * @returns {object} Canvas instance
 */
function createCanvas(format, width, height) {
  const type = format === 'svg' ? 'svg' : 'png';
  return new ChartJSNodeCanvas({
    width,
    height,
    type,
    chartCallback: (ChartJS) => {
      try {
        if (ChartJS && registerables) ChartJS.register(...registerables);
      } catch (_) {}
    }
  });
}

/**
 * Render bar chart to file
 * @param {string} format - Output format ('svg' or 'png')
 * @param {string} title - Chart title
 * @param {string[]} labels - Bar labels
 * @param {number[]} values - Bar values
 * @param {string} filePath - Output file path
 * @param {object} options - Rendering options
 */
export async function renderBarChartImage(format, title, labels, values, filePath, options = {}) {
  const width = options.width || 900;
  const height = options.height || 400;

  try {
    ensureDir(path.dirname(filePath));
  } catch (dirErr) {
    console.error(`[error] Failed to create directory for chart: ${dirErr.message}`);
    return;
  }

  try {
    if (!labels || !values || labels.length === 0) {
      if (options.verbose) console.error(`[warn] No data for bar chart: ${title}`);
      labels = ["No data"];
      values = [0];
    }

    // Use fallback SVG generation for SVG format or when ChartJSNodeCanvas is unavailable
    if (!ChartJSNodeCanvas || format === 'svg') {
      const svg = generateBarChartSVG(title, labels, values, { limit: options.limit || 25 });
      fs.writeFileSync(filePath, svg, 'utf8');
      return;
    }

    const canvas = createCanvas(format, width, height);
    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: '#4e79a7'
        }]
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
        },
      },
    };
    const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';

    const buffer = await canvas.renderToBuffer(config, mime);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    if (format === 'svg') {
      try {
        const svg = generateBarChartSVG(title, labels, values, { limit: options.limit || 25 });
        fs.writeFileSync(filePath, svg, 'utf8');
      } catch (svgErr) {
        console.error(`[error] Failed to generate chart ${filePath}: ${svgErr.message}`);
      }
    } else {
      console.error(`[error] Failed to generate PNG chart ${filePath}: ${err.message}`);
    }
  }
}

/**
 * Render heatmap to file
 * @param {string} format - Output format ('svg' or 'png')
 * @param {number[][]} heatmap - 2D heatmap data
 * @param {string} filePath - Output file path
 * @param {object} options - Rendering options
 */
export async function renderHeatmapImage(format, heatmap, filePath, options = {}) {
  const width = options.width || 900;
  const height = options.height || 220;

  try {
    ensureDir(path.dirname(filePath));
  } catch (dirErr) {
    console.error(`[error] Failed to create directory for heatmap: ${dirErr.message}`);
    return;
  }

  try {
    // Ensure heatmap data is valid
    if (!heatmap || !Array.isArray(heatmap) || heatmap.length === 0) {
      if (options.verbose) console.error(`[warn] Invalid heatmap data, creating empty heatmap`);
      heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    }

    // Use fallback SVG generation for SVG format or when ChartJSNodeCanvas is unavailable
    if (!ChartJSNodeCanvas || format === 'svg') {
      const svg = generateHeatmapSVG(heatmap);
      fs.writeFileSync(filePath, svg, 'utf8');
      return;
    }

    const canvas = createCanvas(format, width, height);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const datasetForDay = (row, i) => ({
      label: days[i],
      data: row,
      backgroundColor: row.map(val => {
        const alpha = val > 0 ? Math.min(1, 0.15 + 0.85 * (val / Math.max(1, Math.max(...row)))) : 0.05;
        return `rgba(78,121,167,${alpha})`;
      }),
      borderWidth: 0,
      type: 'bar',
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    });

    const data = { labels: hours, datasets: heatmap.map(datasetForDay) };
    const config = {
      type: 'bar',
      data,
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
        },
      },
    };
    const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';

    const buffer = await canvas.renderToBuffer(config, mime);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    if (format === 'svg') {
      try {
        const svg = generateHeatmapSVG(heatmap);
        fs.writeFileSync(filePath, svg, 'utf8');
      } catch (svgErr) {
        console.error(`[error] Failed to generate heatmap ${filePath}: ${svgErr.message}`);
      }
    } else {
      console.error(`[error] Failed to generate PNG heatmap ${filePath}: ${err.message}`);
    }
  }
}
