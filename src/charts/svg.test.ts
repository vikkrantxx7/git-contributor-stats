import { generateBarChartSVG, generateHeatmapSVG } from './svg';

describe('generateBarChartSVG', () => {
  it('should generate SVG with title, labels, and values', () => {
    const svg = generateBarChartSVG('Test Chart', ['A', 'B'], [10, 20], {
      width: 400,
      height: 200
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Test Chart');
    expect(svg).toContain('A');
    expect(svg).toContain('B');
    expect(svg).toContain('10');
    expect(svg).toContain('20');
  });

  it('should show "No data" for empty input', () => {
    const svg = generateBarChartSVG('Empty', [], [], {});
    expect(svg).toContain('No data');
  });
});

describe('generateHeatmapSVG', () => {
  it('should generate SVG with day and hour labels', () => {
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    heatmap[0][0] = 5;
    const svg = generateHeatmapSVG(heatmap);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Sun');
    expect(svg).toContain('0');
    expect(svg).toContain('5');
  });
});
