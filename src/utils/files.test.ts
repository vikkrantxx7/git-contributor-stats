import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { countTotalLines, ensureDir, safeReadPackageJson, tryLoadJSON } from './files';

function withTmpDir<T>(fn: (dir: string) => T | Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utils-test-'));
  return Promise.resolve(fn(dir)).finally(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

describe('safeReadPackageJson', () => {
  it('should return object for valid package.json', () => {
    const pkg = safeReadPackageJson();
    expect(typeof pkg).toBe('object');
  });
});

describe('safeReadPackageJson edge cases', () => {
  it('should return empty object if package.json does not exist', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('fail');
    });
    expect(safeReadPackageJson()).toEqual({});
    spy.mockRestore();
  });
  it('should return empty object if package.json is invalid', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => 'not-json');
    expect(safeReadPackageJson()).toEqual({});
    spy.mockRestore();
  });
});

describe('ensureDir', () => {
  it('should create a directory if it does not exist', async () => {
    await withTmpDir((tmpDir) => {
      const newDir = path.join(tmpDir, 'subdir');
      ensureDir(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });
  });
});

describe('ensureDir edge cases', () => {
  it('should do nothing for empty string', () => {
    ensureDir('');
    expect(true).toBe(true); // assertion to satisfy lint
  });
  it('should not throw if directory already exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utils-test-'));
    ensureDir(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(true); // assertion to satisfy lint
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('tryLoadJSON', () => {
  it('should load valid JSON file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utils-test-'));
    const filePath = path.join(tmpDir, 'test.json');
    fs.writeFileSync(filePath, JSON.stringify({ a: 1 }));
    const obj = tryLoadJSON(filePath);
    expect(obj).toEqual({ a: 1 });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null for invalid JSON file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utils-test-'));
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, 'not-json');
    expect(tryLoadJSON(filePath)).toBeNull();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('tryLoadJSON edge cases', () => {
  it('should return null if file does not exist', async () => {
    await withTmpDir((tmpDir) => {
      const missingPath = path.join(tmpDir, 'does-not-exist.json');
      expect(tryLoadJSON(missingPath)).toBeNull();
    });
  });
});

describe('countTotalLines', () => {
  it('should return 0 if git fails', async () => {
    await withTmpDir(async (tmpDir) => {
      const runGit = () => ({ ok: false });
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
    });
  });

  it('should return 0 if no files', async () => {
    await withTmpDir(async (tmpDir) => {
      const runGit = () => ({ ok: true, stdout: '' });
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
    });
  });
  it('should count lines in files', async () => {
    await withTmpDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'a.txt');
      fs.writeFileSync(filePath, 'a\nb\nc');
      const runGit = () => ({ ok: true, stdout: 'a.txt' });
      const statSpy = vi.spyOn(fs, 'statSync').mockImplementation(
        (_path: fs.PathLike) =>
          ({
            isFile: () => true,
            size: 10
          }) as unknown as fs.Stats
      );
      const readSpy = vi
        .spyOn(fs, 'readFileSync')
        .mockImplementation((_path: fs.PathOrFileDescriptor, options?: unknown) => {
          if (typeof options === 'string') {
            return 'a\nb\nc';
          }
          if (
            options &&
            typeof options === 'object' &&
            'encoding' in options &&
            (options as { encoding?: BufferEncoding | null }).encoding !== null
          ) {
            return 'a\nb\nc';
          }
          return Buffer.from('a\nb\nc');
        });
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(3);
      statSpy.mockRestore();
      readSpy.mockRestore();
    });
  });
  it('should skip non-files and large files', async () => {
    await withTmpDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'a.txt');
      fs.writeFileSync(filePath, 'a\nb\nc');
      const runGit = () => ({ ok: true, stdout: 'a.txt' });
      const statSpy = vi.spyOn(fs, 'statSync').mockImplementation(
        (_path: fs.PathLike) =>
          ({
            isFile: () => false,
            size: 10
          }) as unknown as fs.Stats
      );
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
      statSpy.mockRestore();
    });
  });
  it('should handle file read errors gracefully', async () => {
    await withTmpDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'a.txt');
      fs.writeFileSync(filePath, 'a\nb\nc');
      const runGit = () => ({ ok: true, stdout: 'a.txt' });
      const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('fail');
      });
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
      readSpy.mockRestore();
    });
  });

  it('should skip files larger than 50MB', async () => {
    await withTmpDir(async (tmpDir) => {
      const runGit = () => ({ ok: true, stdout: 'large.txt' });
      const statSpy = vi.spyOn(fs, 'statSync').mockImplementation(
        (_path: fs.PathLike) =>
          ({
            isFile: () => true,
            size: 60 * 1024 * 1024 // 60MB
          }) as unknown as fs.Stats
      );
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
      statSpy.mockRestore();
    });
  });

  it('should handle statSync errors gracefully', async () => {
    await withTmpDir(async (tmpDir) => {
      const runGit = () => ({ ok: true, stdout: 'a.txt' });
      const statSpy = vi.spyOn(fs, 'statSync').mockImplementation(() => {
        throw new Error('stat failed');
      });
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
      statSpy.mockRestore();
    });
  });

  it('should handle stdout with undefined', async () => {
    await withTmpDir(async (tmpDir) => {
      const runGit = () => ({ ok: true, stdout: undefined });
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
    });
  });

  it('should handle top-level try-catch errors', async () => {
    await withTmpDir(async (tmpDir) => {
      const runGit = () => {
        throw new Error('runGit failed');
      };
      const result = await countTotalLines(tmpDir, runGit);
      expect(result).toBe(0);
    });
  });
});

describe('ensureDir null input', () => {
  it('should handle null-like input gracefully', () => {
    ensureDir(null as unknown as string);
    ensureDir(undefined as unknown as string);
    expect(true).toBe(true); // No error thrown
  });
});
