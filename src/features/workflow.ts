// Feature: GitHub Actions workflow generator
// Separated for tree-shaking when not needed

import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from '../utils/files.ts';

export async function generateWorkflow(repo: string): Promise<void> {
  const wfPath = path.join(repo, '.github', 'workflows', 'git-contributor-stats.yml');
  ensureDir(path.dirname(wfPath));
  const content = `name: Git Contributor Stats
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install deps
        run: npm ci || npm i
      - name: Run report
        run: npx git-contributor-stats --out-dir=./reports --html=reports/report.html --json --charts
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: git-contrib-report
          path: reports
`;
  fs.writeFileSync(wfPath, content, 'utf8');
  console.error(`Wrote sample GitHub Actions workflow to ${wfPath}`);
}
