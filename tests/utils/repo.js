import {appendFileSync, existsSync, mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {execa} from 'execa';

export function createTempRepo() {
  return mkdtempSync(join(tmpdir(), 'git-contrib-stats-'));
}

export async function initRepo(repoDir) {
  await execa('git', ['init'], { cwd: repoDir });
  await execa('git', ['config', 'user.name', 'Tester'], { cwd: repoDir });
  await execa('git', ['config', 'user.email', 'tester@example.com'], { cwd: repoDir });
}

export async function seedBasicHistory(repoDir) {
  // initial commit
  writeFileSync(join(repoDir, 'README.md'), '# Test Repository\nInitial content\n');
  await execa('git', ['add', '.'], { cwd: repoDir });
  await execa('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });

  // Alice
  appendFileSync(join(repoDir, 'README.md'), '\n## Features\n- Feature A\n');
  writeFileSync(join(repoDir, 'src.js'), 'console.log("hello");\n');
  await execa('git', ['add', '.'], { cwd: repoDir });
  await execa('git', ['commit', '-m', 'Add features and src', '--author', 'Alice Developer <alice@example.com>'], { cwd: repoDir });

  // Bob
  writeFileSync(join(repoDir, 'app.js'), 'console.log("improved");\n');
  await execa('git', ['add', '.'], { cwd: repoDir });
  await execa('git', ['commit', '-m', 'Improve app', '--author', 'Bob Contributor <bob@example.com>'], { cwd: repoDir });

  // Charlie (deletion)
  if (existsSync(join(repoDir, 'src.js'))) {
    await execa('git', ['rm', 'src.js'], { cwd: repoDir });
  }
  appendFileSync(join(repoDir, 'README.md'), '\n## Changelog\n- Removed src.js\n');
  await execa('git', ['add', '.'], { cwd: repoDir });
  await execa('git', ['commit', '-m', 'Remove src.js and update changelog', '--author', 'Charlie Maintainer <charlie@example.com>'], { cwd: repoDir });
}

export function cleanupRepo(dir) {
  rmSync(dir, { recursive: true, force: true });
}

