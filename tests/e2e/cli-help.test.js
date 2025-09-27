import { join } from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.substring(0, __filename.lastIndexOf('/'));
const repoRoot = join(__dirname, '..', '..');

describe('CLI basics', () => {
  it('shows help with examples', async () => {
    const { stdout, stderr, exitCode } = await execa('node', ['cli.js', '--help'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/git-contributor-stats/i);
    expect(stdout).toMatch(/Examples:/i);
  });

  it('prints semver on --version', async () => {
    const { stdout, exitCode } = await execa('node', ['cli.js', '--version'], { cwd: repoRoot });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+].*)?$/);
  });
});
