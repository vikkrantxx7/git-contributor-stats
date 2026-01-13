import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateWorkflow } from './workflow';

describe('generateWorkflow', () => {
  it('should generate a GitHub Actions workflow file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
    await generateWorkflow(tmpDir);
    const wfPath = path.join(tmpDir, '.github', 'workflows', 'git-contributor-stats.yml');
    expect(fs.existsSync(wfPath)).toBe(true);
    const content = fs.readFileSync(wfPath, 'utf8');
    expect(content).toContain('Git Contributor Stats');
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('actions/setup-node@v4');
    expect(content).toContain('npx git-contributor-stats');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
