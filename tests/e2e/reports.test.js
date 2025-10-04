import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { existsSync, readFileSync } from 'node:fs';
import { createTempRepo, initRepo, seedBasicHistory, cleanupRepo } from '../utils/repo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(dirname(__dirname));

describe('Reports (MD/HTML) and charts (SVG)', () => {
  let tmpRepo;
  let outDir;

  beforeAll(async () => {
    tmpRepo = createTempRepo();
    await initRepo(tmpRepo);
    await seedBasicHistory(tmpRepo);
    outDir = join(tmpRepo, 'out');
  });

  afterAll(() => {
    cleanupRepo(tmpRepo);
  });

  it('generates Markdown and HTML reports with charts', async () => {
    const md = join(outDir, 'report.md');
    const html = join(outDir, 'report.html');
    const { exitCode } = await execa('node', [
      'cli.js',
      '--repo', tmpRepo,
      '--out-dir', outDir,
      '--md', md,
      '--html', html,
      '--no-count-lines',
      '--charts',
      '--chart-format', 'svg'
    ], { cwd: repoRoot });

    expect(exitCode).toBe(0);

    expect(existsSync(md)).toBe(true);
    const mdContent = readFileSync(md, { encoding: 'utf8' });
    expect(mdContent).toMatch(/Top contributors/i);

    expect(existsSync(html)).toBe(true);
    const htmlContent = readFileSync(html, { encoding: 'utf8' });
    expect(htmlContent).toMatch(/Git Contributor Stats/);
    expect(htmlContent).toMatch(/chart\.js/i);

    // Charts default to outDir when --charts is used
    const svgCommits = join(outDir, 'top-commits.svg');
    const svgNet = join(outDir, 'top-net.svg');
    const svgHeat = join(outDir, 'heatmap.svg');

    for (const f of [svgCommits, svgNet, svgHeat]) {
      expect(existsSync(f)).toBe(true);
      const svg = readFileSync(f, { encoding: 'utf8' });
      expect(svg).toMatch(/<svg/i);
    }
  });

  it('respects --no-top-stats in Markdown', async () => {
    const noTsDir = join(outDir, 'no-topstats');
    const md = join(noTsDir, 'report.md');
    await execa('node', [
      'cli.js',
      '--repo', tmpRepo,
      '--out-dir', noTsDir,
      '--md', md,
      '--no-top-stats',
      '--no-count-lines'
    ], { cwd: repoRoot });

    const mdContent = readFileSync(md, { encoding: 'utf8' });
    expect(mdContent).not.toMatch(/## Top stats/);
    expect(mdContent).toMatch(/## Top contributors/);
  });
});
