import fs from 'node:fs';
import path from 'node:path';

interface GitResult {
  ok: boolean;
  stdout?: string;
  error?: string;
  code?: number;
}

type RunGitFunction = (repoPath: string, args: string[]) => GitResult;

export function safeReadPackageJson(): Record<string, unknown> {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, { encoding: 'utf8' }));
  } catch {
    return {};
  }
}

export function ensureDir(dir: string): void {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function tryLoadJSON(filePath: string): Record<string, unknown> | null {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export async function countTotalLines(repoPath: string, runGit: RunGitFunction): Promise<number> {
  try {
    const res = runGit(repoPath, ['ls-files']);
    if (!res.ok) return 0;

    const files = res.stdout!.split(/\r?\n/).filter(Boolean);
    let total = 0;

    for (const rel of files) {
      const abs = path.join(repoPath, rel);
      try {
        const stat = fs.statSync(abs);
        if (!stat.isFile() || stat.size > 50 * 1024 * 1024) continue;
        const content = fs.readFileSync(abs, 'utf8');
        total += content.split(/\r?\n/).length;
      } catch {
        /* ignore */
      }
    }
    return total;
  } catch {
    return 0;
  }
}
