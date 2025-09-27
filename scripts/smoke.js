#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 2,
  verbose: process.argv.includes('--verbose') || process.env.VERBOSE === 'true'
};

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`🧪 Running ${this.tests.length} smoke tests...\n`);

    for (const { name, fn } of this.tests) {
      try {
        console.log(`⏳ ${name}...`);
        const start = Date.now();
        await fn();
        const duration = Date.now() - start;
        console.log(`✅ ${name} (${duration}ms)`);
        this.passed++;
      } catch (error) {
        console.error(`❌ ${name}: ${error.message}`);
        if (TEST_CONFIG.verbose) {
          console.error(error.stack);
        }
        this.failed++;
      }
      console.log('');
    }

    this.printSummary();
    if (this.failed > 0) process.exit(1);
  }

  printSummary() {
    console.log('📊 Test Summary:');
    console.log(`  ✅ Passed: ${this.passed}`);
    console.log(`  ❌ Failed: ${this.failed}`);
    console.log(`  ⏭️  Skipped: ${this.skipped}`);
    console.log(`  📈 Success Rate: ${this.passed}/${this.tests.length} (${Math.round(this.passed/this.tests.length*100)}%)`);
  }
}

function run(cmd, args, opts = {}) {
  const timeout = opts.timeout || TEST_CONFIG.timeout;
  const res = spawnSync(cmd, args, {
    stdio: opts.stdio || 'inherit',
    cwd: opts.cwd || process.cwd(),
    encoding: 'utf8',
    timeout
  });

  if (res.error) {
    if (res.error.code === 'TIMEOUT') {
      throw new Error(`Command timed out after ${timeout}ms: ${cmd} ${args.join(' ')}`);
    }
    throw res.error;
  }
  if (res.status !== 0) {
    const errorMsg = res.stderr || res.stdout || 'Unknown error';
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status}: ${errorMsg}`);
  }
  return res;
}

function ensureTestRepo(root) {
  const tmp = path.join(root, 'tmp-smoke-repo');

  // Clean up any existing repo
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch(_) {}

  // Create directory and initialize git repo
  fs.mkdirSync(tmp, { recursive: true });

  try {
    run('git', ['init'], { cwd: tmp, stdio: 'pipe' });
    run('git', ['config', 'user.name', 'Tester'], { cwd: tmp, stdio: 'pipe' });
    run('git', ['config', 'user.email', 'tester@example.com'], { cwd: tmp, stdio: 'pipe' });

    // Create initial file and commit
    fs.writeFileSync(path.join(tmp, 'README.md'), '# Test Repository\nInitial content\n', 'utf8');

    // Create src directory BEFORE writing to it
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/main.js'), 'console.log("Hello World");\n', 'utf8');

    run('git', ['add', '.'], { cwd: tmp, stdio: 'pipe' });
    run('git', ['commit', '-m', 'Initial commit'], { cwd: tmp, stdio: 'pipe' });

    // Second author with more realistic changes
    fs.appendFileSync(path.join(tmp, 'README.md'), '\n## Features\n- Feature A\n- Feature B\n', 'utf8');
    fs.writeFileSync(path.join(tmp, 'src/utils.js'), 'export function helper() {\n  return "helper";\n}\n', 'utf8');
    run('git', ['add', '.'], { cwd: tmp, stdio: 'pipe' });
    run('git', ['commit', '-m', 'Add features and utils', '--author', 'Alice Developer <alice@example.com>'], { cwd: tmp, stdio: 'pipe' });

    // Third author with deletions and modifications
    fs.writeFileSync(path.join(tmp, 'src/main.js'), 'console.log("Hello, improved world!");\nconsole.log("Added logging");\n', 'utf8');
    fs.writeFileSync(path.join(tmp, 'package.json'), '{\n  "name": "test-repo",\n  "version": "1.0.0"\n}\n', 'utf8');
    run('git', ['add', '.'], { cwd: tmp, stdio: 'pipe' });
    run('git', ['commit', '-m', 'Improve main.js and add package.json', '--author', 'Bob Contributor <bob@example.com>'], { cwd: tmp, stdio: 'pipe' });

    // Fourth commit with file deletion
    fs.unlinkSync(path.join(tmp, 'src/utils.js'));
    fs.appendFileSync(path.join(tmp, 'README.md'), '\n## Changelog\n- Removed utils.js\n', 'utf8');
    run('git', ['add', '.'], { cwd: tmp, stdio: 'pipe' });
    run('git', ['commit', '-m', 'Remove utils.js and update changelog', '--author', 'Charlie Maintainer <charlie@example.com>'], { cwd: tmp, stdio: 'pipe' });

    // Verify the repo has commits
    const logResult = run('git', ['log', '--oneline'], { cwd: tmp, stdio: 'pipe' });
    if (!logResult.stdout || logResult.stdout.trim().length === 0) {
      throw new Error('Test repository has no commits after creation');
    }

    const commitCount = logResult.stdout.trim().split('\n').length;
    if (TEST_CONFIG.verbose) {
      console.log(`Created test repo with ${commitCount} commits`);
      console.log('Commits:', logResult.stdout.trim().split('\n').map(line => `  - ${line}`).join('\n'));
    }

    return { path: tmp, commitCount };

  } catch (error) {
    console.error('Failed to create test repository:', error.message);
    throw error;
  }
}

// Test validation helpers
function validateJSON(data) {
  const required = ['meta', 'totalCommits', 'contributors', 'topContributors', 'topStats', 'heatmap', 'busFactor'];
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`JSON output missing required field: ${field}`);
    }
  }

  if (typeof data.totalCommits !== 'number' || data.totalCommits < 1) {
    throw new Error('Invalid totalCommits in JSON output');
  }

  if (!Array.isArray(data.topContributors) || data.topContributors.length === 0) {
    throw new Error('Invalid topContributors in JSON output');
  }

  if (!Array.isArray(data.heatmap) || data.heatmap.length !== 7) {
    throw new Error('Invalid heatmap structure in JSON output');
  }

  return true;
}

function validateFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${description}: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error(`Empty ${description}: ${filePath}`);
  }

  return true;
}

function validateSVGContent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('<svg') || !content.includes('</svg>')) {
    throw new Error(`Invalid SVG content in ${filePath}`);
  }
  return true;
}

function validateMarkdownContent(filePath, shouldIncludeTopStats = true) {
  const content = fs.readFileSync(filePath, 'utf8');

  const requiredSections = ['# Git Contributor Stats', '## Summary', '## Top contributors'];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`Markdown missing required section "${section}" in ${filePath}`);
    }
  }

  if (shouldIncludeTopStats && !content.includes('## Top stats')) {
    throw new Error(`Markdown should include Top stats section in ${filePath}`);
  }

  if (!shouldIncludeTopStats && content.includes('## Top stats')) {
    throw new Error(`Markdown should not include Top stats section in ${filePath}`);
  }

  return true;
}

function validateHTMLContent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const requiredElements = ['<html', '<head>', '<body>', '<title>', 'Git Contributor Stats'];
  for (const element of requiredElements) {
    if (!content.includes(element)) {
      throw new Error(`HTML missing required element "${element}" in ${filePath}`);
    }
  }

  // Check for Chart.js integration
  if (!content.includes('chart.js')) {
    throw new Error(`HTML should include Chart.js integration in ${filePath}`);
  }

  return true;
}

// Main test suite
async function runSmokeTests() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, '..');

  const runner = new TestRunner();

  // Test 1: CLI Help Output
  runner.test('CLI Help Output', () => {
    const result = run('node', ['cli.js', '--help'], { cwd: root, stdio: 'pipe', timeout: 10000 });
    if (!result.stdout.includes('git-contributor-stats')) {
      throw new Error('Help output should contain program name');
    }
    if (!result.stdout.includes('Examples:')) {
      throw new Error('Help output should contain examples');
    }
  });

  // Test 2: CLI Version
  runner.test('CLI Version', () => {
    const result = run('node', ['cli.js', '--version'], { cwd: root, stdio: 'pipe', timeout: 5000 });
    if (!result.stdout.trim().match(/^\d+\.\d+\.\d+/)) {
      throw new Error('Version output should be in semver format');
    }
  });

  // Test 3: Create Test Repository
  let testRepo;
  runner.test('Create Test Repository', () => {
    testRepo = ensureTestRepo(root);
    if (testRepo.commitCount < 3) {
      throw new Error(`Expected at least 3 commits, got ${testRepo.commitCount}`);
    }
  });

  // Test 4: Basic JSON Output
  runner.test('Basic JSON Output', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--json', '--no-count-lines'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 15000
    });

    const parsed = JSON.parse(result.stdout || '{}');
    validateJSON(parsed);

    if (parsed.totalCommits !== testRepo.commitCount) {
      throw new Error(`Expected ${testRepo.commitCount} commits, got ${parsed.totalCommits}`);
    }
  });

  // Test 5: Table Output
  runner.test('Table Output Format', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--format', 'table', '--top', '5', '--no-count-lines'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 10000
    });

    if (!result.stdout.includes('Contributors:') || !result.stdout.includes('Commits')) {
      throw new Error('Table output should contain contributor summary');
    }
  });

  // Test 6: CSV Output
  runner.test('CSV Output Format', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--format', 'csv', '--top', '5', '--no-count-lines'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 10000
    });

    const lines = result.stdout.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV output should have header and data rows');
    }

    const header = lines[0];
    if (!header.includes('rank') || !header.includes('commits')) {
      throw new Error('CSV header should contain expected columns');
    }
  });

  // Test 7: Generate Reports with Top Stats
  runner.test('Generate Reports with Top Stats', () => {
    const out = path.join(root, 'reports-smoke');
    try { fs.rmSync(out, { recursive: true, force: true }); } catch(_) {}

    run('node', ['cli.js', '--repo', testRepo.path, '--out-dir', out, '--md', path.join(out, 'report.md'), '--html', path.join(out, 'report.html'), '--no-count-lines', '--charts'], {
      cwd: root,
      timeout: 20000
    });

    // Validate generated files
    validateFileExists(path.join(out, 'report.md'), 'Markdown report');
    validateFileExists(path.join(out, 'report.html'), 'HTML report');
    validateMarkdownContent(path.join(out, 'report.md'), true);
    validateHTMLContent(path.join(out, 'report.html'));
  });

  // Test 8: SVG Charts Generation
  runner.test('SVG Charts Generation', () => {
    const out = path.join(root, 'reports-smoke');
    const svgFiles = [
      { path: path.join(out, 'top-commits.svg'), name: 'top-commits SVG' },
      { path: path.join(out, 'top-net.svg'), name: 'top-net SVG' },
      { path: path.join(out, 'heatmap.svg'), name: 'heatmap SVG' }
    ];

    for (const { path: svgPath, name } of svgFiles) {
      validateFileExists(svgPath, name);
      validateSVGContent(svgPath);
    }
  });

  // Test 9: Reports without Top Stats
  runner.test('Generate Reports without Top Stats', () => {
    const out2 = path.join(root, 'reports-smoke-no-topstats');
    try { fs.rmSync(out2, { recursive: true, force: true }); } catch(_) {}

    run('node', ['cli.js', '--repo', testRepo.path, '--out-dir', out2, '--md', path.join(out2, 'report.md'), '--html', path.join(out2, 'report.html'), '--no-top-stats', '--no-count-lines'], {
      cwd: root,
      timeout: 15000
    });

    validateFileExists(path.join(out2, 'report.md'), 'Markdown report (no top stats)');
    validateMarkdownContent(path.join(out2, 'report.md'), false);
  });

  // Test 10: CSV File Output
  runner.test('CSV File Output', () => {
    const csvPath = path.join(root, 'test-output.csv');
    try { fs.unlinkSync(csvPath); } catch(_) {}

    run('node', ['cli.js', '--repo', testRepo.path, '--csv', csvPath, '--no-count-lines'], {
      cwd: root,
      timeout: 10000
    });

    validateFileExists(csvPath, 'CSV file');

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file should have header and data rows');
    }

    // Cleanup
    try { fs.unlinkSync(csvPath); } catch(_) {}
  });

  // Test 11: Branch Filtering
  runner.test('Branch/Commit Range Filtering', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--branch', 'HEAD~1..HEAD', '--json', '--no-count-lines'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 10000
    });

    const parsed = JSON.parse(result.stdout || '{}');
    if (parsed.totalCommits !== 1) {
      throw new Error(`Expected 1 commit with HEAD~1..HEAD filter, got ${parsed.totalCommits}`);
    }
  });

  // Test 12: Author Filtering
  runner.test('Author Filtering', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--author', 'alice@example.com', '--json', '--no-count-lines'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 10000
    });

    const parsed = JSON.parse(result.stdout || '{}');
    if (parsed.totalCommits !== 1) {
      throw new Error(`Expected 1 commit from Alice, got ${parsed.totalCommits}`);
    }
  });

  // Test 13: Chart Format Options
  runner.test('Chart Format Options', () => {
    const chartDir = path.join(root, 'test-charts');
    try { fs.rmSync(chartDir, { recursive: true, force: true }); } catch(_) {}

    run('node', ['cli.js', '--repo', testRepo.path, '--charts-dir', chartDir, '--chart-format', 'svg', '--charts', '--no-count-lines'], {
      cwd: root,
      timeout: 15000
    });

    const svgFiles = ['top-commits.svg', 'top-net.svg', 'heatmap.svg'];
    for (const file of svgFiles) {
      validateFileExists(path.join(chartDir, file), `Chart ${file}`);
      validateSVGContent(path.join(chartDir, file));
    }

    // Cleanup
    try { fs.rmSync(chartDir, { recursive: true, force: true }); } catch(_) {}
  });

  // Test 14: Similarity Threshold
  runner.test('Similarity Threshold Processing', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--similarity', '0.5', '--json', '--no-count-lines'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 10000
    });

    const parsed = JSON.parse(result.stdout || '{}');
    validateJSON(parsed);

    // Should still have same number of commits
    if (parsed.totalCommits !== testRepo.commitCount) {
      throw new Error(`Similarity filtering shouldn't change commit count`);
    }
  });

  // Test 15: Error Handling - Invalid Repository
  runner.test('Error Handling - Invalid Repository', () => {
    try {
      run('node', ['cli.js', '--repo', '/nonexistent/path', '--json'], {
        cwd: root,
        stdio: 'pipe',
        timeout: 5000
      });
      throw new Error('Should have failed with invalid repository');
    } catch (error) {
      if (!error.message.includes('Not a Git repository')) {
        throw new Error(`Expected git repository error, got: ${error.message}`);
      }
    }
  });

  // Test 16: Performance Test - Large Output
  runner.test('Performance Test - Large Output', () => {
    const result = run('node', ['cli.js', '--repo', testRepo.path, '--json', '--verbose'], {
      cwd: root,
      stdio: 'pipe',
      timeout: 25000
    });

    const parsed = JSON.parse(result.stdout || '{}');
    validateJSON(parsed);

    // Verify verbose output in stderr
    if (!result.stderr.includes('[debug]')) {
      throw new Error('Verbose mode should include debug output');
    }
  });

  await runner.run();
}

// Cleanup function
function cleanup(root) {
  const cleanupPaths = [
    path.join(root, 'tmp-smoke-repo'),
    path.join(root, 'test-output.csv'),
    path.join(root, 'test-charts')
  ];

  for (const cleanupPath of cleanupPaths) {
    try {
      fs.rmSync(cleanupPath, { recursive: true, force: true });
    } catch(_) {}
  }
}

// Main execution
(async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, '..');

  try {
    await runSmokeTests();
    console.log('\n🎉 All smoke tests passed!');
  } catch (error) {
    console.error('\n💥 Smoke tests failed:', error.message);
    process.exit(1);
  } finally {
    if (!process.argv.includes('--no-cleanup')) {
      cleanup(root);
    }
  }
})();
