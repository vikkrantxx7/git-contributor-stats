/**
 * Pure SVG chart generation utilities (fallback when ChartJS unavailable)
 */
import { svgEscape } from '../utils/formatting.js';

/**
 * Generate SVG bar chart
 * @param {string} title - Chart title
 * @param {string[]} labels - Bar labels
 * @param {number[]} values - Bar values
 * @param {object} options - Chart options
 * @returns {string} SVG content
 */
export function generateBarChartSVG(title, labels, values, options = {}) {
  const maxBars = Math.min(labels.length, options.limit || 20);
  labels = labels.slice(0, maxBars);
  values = values.slice(0, maxBars);

  const width = options.width || 900;
  const height = options.height || 360;
  const margin = { top: 40, right: 20, bottom: 120, left: 80 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const maxVal = Math.max(1, ...values);
  const denom = Math.max(1, maxBars);
  const barW = chartW / denom * 0.7;
  const gap = chartW / denom * 0.3;

  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  svg.push(`<style>text{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px} .title{font-size:16px;font-weight:700}</style>`);
  svg.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  svg.push(`<text class="title" x="${margin.left}" y="${margin.top - 12}">${svgEscape(title)}</text>`);

  // axes
  svg.push(`<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartH}" stroke="#333"/>`);
  svg.push(`<line x1="${margin.left}" y1="${margin.top + chartH}" x2="${margin.left + chartW}" y2="${margin.top + chartH}" stroke="#333"/>`);

  // bars
  labels.forEach((lab, i) => {
    const x = margin.left + i * (barW + gap) + gap * 0.5;
    const h = Math.round((values[i] / maxVal) * chartH);
    const y = margin.top + (chartH - h);
    svg.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#4e79a7"/>`);
    svg.push(`<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle">${values[i]}</text>`);
    const labText = (lab.length > 16) ? lab.slice(0, 16) + '…' : lab;
    svg.push(`<g transform="translate(${x + barW / 2},${margin.top + chartH + 4}) rotate(45)"><text text-anchor="start">${svgEscape(labText)}</text></g>`);
  });

  if (maxBars === 0) {
    svg.push(`<text x="${margin.left + chartW / 2}" y="${margin.top + chartH / 2}" text-anchor="middle" fill="#666">No data</text>`);
  }

  // y ticks
  for (let t = 0; t <= 4; t++) {
    const val = Math.round((t / 4) * maxVal);
    const yy = margin.top + chartH - Math.round((t / 4) * chartH);
    svg.push(`<line x1="${margin.left - 5}" y1="${yy}" x2="${margin.left}" y2="${yy}" stroke="#333"/>`);
    svg.push(`<text x="${margin.left - 8}" y="${yy + 4}" text-anchor="end">${val}</text>`);
  }
  svg.push(`</svg>`);
  return svg.join('');
}

/**
 * Generate SVG heatmap
 * @param {number[][]} heatmap - 2D array of heatmap values
 * @returns {string} SVG content
 */
export function generateHeatmapSVG(heatmap) {
  const cellW = 26, cellH = 20;
  const margin = { top: 28, right: 10, bottom: 10, left: 28 };
  const width = margin.left + margin.right + 24 * cellW;
  const height = margin.top + margin.bottom + 7 * cellH;
  const max = Math.max(1, ...heatmap.flat());
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  svg.push(`<style>text{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:10px}</style>`);

  // hour headers
  for (let h = 0; h < 24; h++) {
    svg.push(`<text x="${margin.left + h * cellW + 6}" y="${margin.top - 10}" text-anchor="middle">${h}</text>`);
  }

  for (let d = 0; d < 7; d++) {
    svg.push(`<text x="${margin.left - 6}" y="${margin.top + d * cellH + 14}" text-anchor="end">${days[d]}</text>`);
    for (let h = 0; h < 24; h++) {
      const val = heatmap[d][h] || 0;
      const intensity = Math.round((val / max) * 200);
      const fill = `rgb(${255 - intensity},255,${255 - intensity})`;
      svg.push(`<rect x="${margin.left + h * cellW}" y="${margin.top + d * cellH}" width="${cellW - 1}" height="${cellH - 1}" fill="${fill}"/>`);
      if (val > 0) svg.push(`<text x="${margin.left + h * cellW + (cellW / 2)}" y="${margin.top + d * cellH + 14}" text-anchor="middle">${val}</text>`);
    }
  }
  svg.push(`</svg>`);
  return svg.join('');
}
