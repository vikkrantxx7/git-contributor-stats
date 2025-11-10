# git-contributor-stats

A powerful, fast Node.js CLI and library to analyze Git repository contributions with detailed statistics, charts, and multiple output formats.

[![npm version](https://img.shields.io/npm/v/git-contributor-stats.svg)](https://www.npmjs.com/package/git-contributor-stats)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

> **📦 Modular & Tree-Shakeable**
> 
> This package uses subpath exports for optimal bundle sizes. Import only what you need:
> - `git-contributor-stats/stats` - Core statistics
> - `git-contributor-stats/charts` - Chart generation
> - `git-contributor-stats/reports` - Report generation
> - `git-contributor-stats/output` - Console output
> - `git-contributor-stats/workflow` - GitHub Actions workflow
> 
> See [Technical Docs](./docs/technical/TECHNICAL.md) for architecture details and [Quick Start](./docs/QUICK-START.md) for usage examples.

---

## Overview

Analyze your Git repository to gain insights into contributor activity, code ownership, commit patterns, and project health. Get comprehensive statistics including commits, lines added/deleted, file changes, temporal patterns, bus factor analysis, and beautiful visualizations.

**Requirements:** Node.js 18+ (ESM-only)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
  - [Basic Commands](#basic-commands)
  - [Filtering Options](#filtering-options)
  - [Output Formats](#output-formats)
  - [Charts & Visualizations](#charts--visualizations)
  - [Report Customization](#report-customization)
- [Programmatic API](#programmatic-api)
- [Identity Management](#identity-management)
- [Configuration](#configuration)
- [Examples](#examples)
- [Output Reference](#output-reference)
- [Performance Tips](#performance-tips)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Analytics
- **Contributor Metrics**: Commits, lines added/deleted, net contributions, file changes
- **Top Contributors**: Ranked by commits, additions, deletions, net changes, or total changes
- **File-Level Insights**: Top files per contributor, ownership distribution
- **Temporal Analysis**: Monthly and weekly commit frequency breakdown
- **Activity Heatmap**: Commit patterns by weekday and hour (7×24 grid)
- **Bus Factor**: Identify single-owner files and knowledge concentration risks
- **Total LOC**: Count total lines across tracked files (optional for performance)

### Filtering & Grouping
- **Branch/Range**: Analyze specific branches or commit ranges
- **Time-Based**: Filter by date (absolute or relative: `90.days`, `2.weeks`, etc.)
- **Author Patterns**: Focus on specific contributors
- **Path Filtering**: Analyze specific directories or files
- **Identity Merging**: Consolidate multiple emails/names per contributor

### Output & Visualization
- **Multiple Formats**: Table, JSON, CSV, Markdown, HTML
- **Charts**: SVG/PNG bar charts (top commits, net contributions) and heatmaps
- **Customizable Reports**: Control which sections appear in outputs
- **Batch Export**: Write all reports to a single directory

### Developer Experience
- **Dual Interface**: CLI tool and programmatic Node.js API
- **TypeScript Support**: Full type definitions included
- **GitHub Actions**: Built-in workflow generator
- **Performance Options**: Skip expensive operations when needed

## Installation

### Global Installation (CLI)

```bash
npm install -g git-contributor-stats
```

### Local Project (Programmatic Use)

```bash
npm install git-contributor-stats
```

## Quick Start

> 💡 **New to this tool?** See [**Quick Start Guide**](./docs/QUICK-START.md) for detailed use cases and examples

### CLI - Basic Usage

```bash
# Analyze current repository
git-contributor-stats

# Top 10 contributors
git-contributor-stats --top 10

# Last 90 days with JSON output
git-contributor-stats --since 90.days --json

# Generate all reports and charts (most popular!)
git-contributor-stats --out-dir reports --md --html --charts

# Specific folder analysis
git-contributor-stats src/ --top 20
```

### Programmatic - Basic Usage

```javascript
// Import only what you need using subpath exports
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  since: '90.days',
  countLines: false
});

console.log(`Total commits: ${stats.totalCommits}`);
console.log(`Top contributor: ${stats.topContributors[0].name}`);
```

## CLI Usage

### Command Syntax

```bash
git-contributor-stats [options] [paths...]
```

**Arguments:**
- `[paths...]` - Optional pathspec(s) to limit analysis to certain files/directories

### Basic Commands

```bash
# Show help
git-contributor-stats --help

# Show version
git-contributor-stats --version

# Analyze current repository (default: table output)
git-contributor-stats

# Analyze specific repository
git-contributor-stats --repo /path/to/repo

# Analyze specific paths only
git-contributor-stats src/ lib/
```

### Filtering Options

#### Repository & Branch

| Option | Description | Example |
|--------|-------------|---------|
| `-r, --repo <path>` | Path to Git repository | `--repo /path/to/repo` |
| `-b, --branch <name>` | Branch or commit range | `--branch main` or `--branch main..feature` |

#### Time-Based Filtering

| Option | Description | Example |
|--------|-------------|---------|
| `--since <when>` | Only commits after date | `--since 2024-01-01` or `--since 90.days` |
| `--until <when>` | Only commits before date | `--until 2024-12-31` or `--until 1.week` |

**Supported relative time formats:**
- Days: `30.days`, `1.day`
- Weeks: `2.weeks`, `1.week`
- Months: `3.months`, `1.month`
- Years: `1.year`, `2.years`

**Example:**
```bash
# Last quarter
git-contributor-stats --since 90.days

# Specific date range
git-contributor-stats --since 2024-01-01 --until 2024-06-30

# Last 2 weeks on main branch
git-contributor-stats -b main --since 2.weeks
```

#### Author & Merge Filtering

| Option | Description | Example |
|--------|-------------|---------|
| `-a, --author <pattern>` | Filter by author (string/regex) | `--author "John"` |
| `--include-merges` | Include merge commits | `--include-merges` |

**Example:**
```bash
# Contributions from specific author
git-contributor-stats --author "jane@example.com"

# Include merge commits (excluded by default)
git-contributor-stats --include-merges
```

### Grouping & Sorting

| Option | Description | Default | Values |
|--------|-------------|---------|--------|
| `-g, --group-by <field>` | Group contributors by | `email` | `email`, `name` |
| `-s, --sort-by <metric>` | Sort contributors by | `changes` | `changes`, `commits`, `additions`, `deletions` |
| `-t, --top <n>` | Limit to top N contributors | All | Any number |

**Example:**
```bash
# Group by name instead of email
git-contributor-stats --group-by name

# Sort by commit count, show top 15
git-contributor-stats --sort-by commits --top 15

# Sort by net lines added
git-contributor-stats --sort-by additions --top 10
```

### Output Formats

#### Standard Output (stdout)

| Option | Description | Output |
|--------|-------------|--------|
| `-f, --format <kind>` | Format for stdout | `table`, `json`, `csv` |
| `--json` | Comprehensive JSON analysis | Full analysis object |

**Example:**
```bash
# Table output (default)
git-contributor-stats

# JSON to stdout
git-contributor-stats --json

# CSV to stdout
git-contributor-stats --format csv

# Compact table with top 10
git-contributor-stats --format table --top 10
```

#### File Outputs

| Option | Description |
|--------|-------------|
| `--csv <path>` | Write CSV report to file |
| `--md <path>` | Write Markdown report to file |
| `--html <path>` | Write HTML dashboard to file |
| `--out-dir <path>` | Directory for all outputs (uses default names) |

**Example:**
```bash
# Individual file outputs
git-contributor-stats --csv stats.csv --md report.md --html dashboard.html

# Use output directory (creates contributors.csv, report.md, report.html)
git-contributor-stats --out-dir reports

# Combine with specific names
git-contributor-stats --out-dir reports --md reports/custom-report.md
```

### Charts & Visualizations

#### Chart Generation

| Option | Description | Default |
|--------|-------------|---------|
| `--charts` | Generate charts | Disabled |
| `--charts-dir <path>` | Directory for charts | `./charts` or `--out-dir` |
| `--chart-format <fmt>` | Chart format | `svg` |

**Chart formats:**
- `svg` - Scalable Vector Graphics (recommended)
- `png` - Portable Network Graphics
- `both` - Generate both SVG and PNG

**Generated charts:**
1. `top-commits.svg/png` - Bar chart of top contributors by commit count
2. `top-net.svg/png` - Bar chart of top contributors by net lines
3. `heatmap.svg/png` - Activity heatmap (weekday × hour)

**Example:**
```bash
# Generate SVG charts in default location
git-contributor-stats --charts

# Generate PNG charts
git-contributor-stats --charts --chart-format png

# Generate both formats in custom directory
git-contributor-stats --charts --charts-dir ./output/charts --chart-format both

# Charts with reports
git-contributor-stats --out-dir reports --md --html --charts
```

### Report Customization

#### Top Stats Configuration

Control which metrics appear in the "Top Stats" section of reports and stdout:

| Option | Description | Default |
|--------|-------------|---------|
| `--top-stats <list>` | Comma-separated metrics to show | All metrics |
| `--no-top-stats` | Omit Top Stats section entirely | Enabled |

**Available metrics:**
- `commits` - Most commits
- `additions` - Most lines added
- `deletions` - Most lines deleted
- `net` - Best net contribution (additions - deletions)
- `changes` - Most total changes (additions + deletions)

**Example:**
```bash
# Show only commits and net in Top Stats
git-contributor-stats --top-stats commits,net --md report.md

# Omit Top Stats entirely (faster, cleaner output)
git-contributor-stats --no-top-stats --html dashboard.html

# Default: all metrics shown
git-contributor-stats --md report.md
```

### Identity Management

| Option | Description |
|--------|-------------|
| `--alias-file <path>` | Path to alias mapping JSON |
| `--similarity <0..1>` | Name merge similarity threshold (default: 0.85) |

**Example:**
```bash
# Use custom alias file
git-contributor-stats --alias-file config/aliases.json

# Adjust similarity threshold (higher = stricter matching)
git-contributor-stats --similarity 0.9

# Combine with reports
git-contributor-stats --alias-file aliases.json --out-dir reports --md --html
```

See [Identity Management](#identity-management-1) section for alias file format.

### Performance Options

| Option | Description | Impact |
|--------|-------------|--------|
| `--no-count-lines` | Skip total LOC counting | Faster analysis |

**Example:**
```bash
# Skip LOC counting for large repos (significant speed improvement)
git-contributor-stats --no-count-lines --json

# Fast report generation
git-contributor-stats --out-dir reports --md --html --no-count-lines
```

### Additional Options

| Option | Description |
|--------|-------------|
| `--generate-workflow` | Create GitHub Actions workflow file |
| `-v, --verbose` | Enable verbose logging (stderr) |

**Example:**
```bash
# Generate GitHub Actions workflow
git-contributor-stats --generate-workflow

# Debug mode
git-contributor-stats --verbose --json

# See what git commands are being run
git-contributor-stats -v --since 30.days
```

## Programmatic API

Use `git-contributor-stats` as a library in your Node.js/TypeScript projects.

### Basic Usage

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

// Analyze current repository
const stats = await getContributorStats({
  repo: '.',
  since: '90.days',
  countLines: false
});

console.log(`Total commits: ${stats.totalCommits}`);
console.log(`Contributors: ${Object.keys(stats.contributors).length}`);
console.log(`Top contributor: ${stats.topContributors[0].name}`);
```

### API Reference

#### `getContributorStats(options)`

Returns a Promise that resolves to a comprehensive analysis object.

**Options:**

```typescript
interface ContributorStatsOptions {
  // Repository options
  repo?: string;                    // Path to repository (default: '.')
  branch?: string;                  // Branch or range (e.g., 'main..feature')
  paths?: string | string[];        // Pathspec(s) to limit analysis
  
  // Filtering options
  since?: string;                   // Date or relative time (e.g., '90.days')
  until?: string;                   // Date or relative time
  author?: string;                  // Author pattern (string/regex)
  includeMerges?: boolean;          // Include merge commits (default: false)
  
  // Grouping & sorting
  groupBy?: 'email' | 'name';       // Group by field (default: 'email')
  labelBy?: 'email' | 'name';       // Display label (default: 'name')
  sortBy?: 'changes' | 'commits' | 'additions' | 'deletions';
  top?: number;                     // Limit to top N contributors
  
  // Identity management
  similarity?: number;              // Name merge threshold (default: 0.85)
  aliasFile?: string;              // Path to alias JSON file
  aliasConfig?: AliasConfig;       // Inline alias configuration
  
  // Performance
  countLines?: boolean;            // Count total LOC (default: true)
  verbose?: boolean;               // Enable verbose logging (default: false)
}
```

**Return Value:**

```typescript
interface ContributorStatsResult {
  meta: {
    generatedAt: string;           // ISO timestamp
    repo: string;                  // Repository path
    branch: string | null;         // Branch name
    since: string | null;          // Since date/time
    until: string | null;          // Until date/time
  };
  
  totalCommits: number;            // Total commit count
  totalLines: number;              // Total lines of code
  
  contributors: Record<string, ContributorsMapEntry>;
  topContributors: TopContributor[];
  
  topStats: {
    byCommits: TopContributor | null;
    byAdditions: TopContributor | null;
    byDeletions: TopContributor | null;
    byNet: TopContributor | null;
    byChanges: TopContributor | null;
  };
  
  commitFrequency: {
    monthly: Record<string, number>;
    weekly: Record<string, number>;
  };
  
  heatmap: number[][];             // 7x24 grid (weekday x hour)
  
  busFactor: {
    filesSingleOwner: Array<{
      file: string;
      owner: string;
      changes: number;
    }>;
  };
  
  basic: {
    contributors: TopContributor[];
    meta: ContributorsMeta;
    groupBy: 'email' | 'name';
  };
}
```

### Advanced Usage Examples

#### Analyze Specific Time Period

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '/path/to/repo',
  since: '2024-01-01',
  until: '2024-06-30',
  branch: 'main'
});

console.log('Q1-Q2 2024 Stats:');
console.log(`- Commits: ${stats.totalCommits}`);
console.log(`- Active contributors: ${stats.topContributors.length}`);
```

#### Filter by Author and Path

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  author: 'jane@example.com',
  paths: ['src/', 'lib/'],
  since: '30.days'
});

console.log(`Jane's contributions in src/ and lib/ (last 30 days):`);
console.log(`- Commits: ${stats.topContributors[0]?.commits || 0}`);
console.log(`- Files changed: ${Object.keys(stats.topContributors[0]?.files || {}).length}`);
```

#### Generate Reports Programmatically

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateReports } from 'git-contributor-stats/reports';

const stats = await getContributorStats({
  repo: '.',
  since: '90.days',
  countLines: false
});

// Generate reports
await generateReports(stats, {
  outDir: 'reports',
  md: 'reports/quarterly-report.md',
  html: 'reports/quarterly-report.html',
  csv: 'reports/contributors.csv'
});

console.log('Reports generated in ./reports/');
```

#### Generate Charts Programmatically

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateCharts } from 'git-contributor-stats/charts';

const stats = await getContributorStats({
  repo: '.',
  since: '90.days'
});

// Generate SVG charts
await generateCharts(stats, {
  charts: true,
  chartsDir: 'output/charts',
  chartFormat: 'svg'
});

// Or PNG charts
await generateCharts(stats, {
  charts: true,
  chartsDir: 'output/charts',
  chartFormat: 'png'
});

// Or both
await generateCharts(stats, {
  charts: true,
  chartsDir: 'output/charts',
  chartFormat: 'both'
});
```

#### Using Alias Configuration Inline

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  aliasConfig: {
    groups: [
      ['jane@example.com', 'jane.doe@example.com', 'Jane Doe'],
      ['john@example.com', 'john.smith@example.com']
    ],
    canonical: {
      'jane@example.com': {
        name: 'Jane Doe',
        email: 'jane@example.com'
      },
      'john@example.com': {
        name: 'John Smith',
        email: 'john@example.com'
      }
    }
  },
  similarity: 0.9
});
```

#### Custom Analysis and Reporting

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  since: '1.year',
  groupBy: 'name',
  sortBy: 'commits'
});

// Custom analysis
const topContributor = stats.topContributors[0];
const busFactorFiles = stats.busFactor.filesSingleOwner.length;
const avgCommitsPerMonth = stats.totalCommits / 12;

console.log('Annual Report:');
console.log(`Top contributor: ${topContributor.name}`);
console.log(`- Commits: ${topContributor.commits}`);
console.log(`- Net lines: ${topContributor.net}`);
console.log(`\nRisk Analysis:`);
console.log(`- Single-owner files: ${busFactorFiles}`);
console.log(`- Avg commits/month: ${avgCommitsPerMonth.toFixed(1)}`);

// Access monthly breakdown
const monthlyActivity = stats.commitFrequency.monthly;
console.log('\nMonthly Activity:');
Object.entries(monthlyActivity)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([month, commits]) => {
    console.log(`${month}: ${commits} commits`);
  });
```

#### TypeScript Support

Full TypeScript definitions are included:

```typescript
import type { 
  ContributorStatsOptions,
  ContributorStatsResult,
  TopContributor,
  TopStatsSummary,
  BusFactorInfo
} from 'git-contributor-stats/stats';
import { getContributorStats } from 'git-contributor-stats/stats';

const options: ContributorStatsOptions = {
  repo: '.',
  since: '90.days',
  countLines: false
};

const stats: ContributorStatsResult = await getContributorStats(options);

// Type-safe access
const topContributor: TopContributor = stats.topContributors[0];
const busFactor: BusFactorInfo = stats.busFactor;
```

### Exported Functions

```typescript
// From 'git-contributor-stats/stats'
export async function getContributorStats(
  options?: ContributorStatsOptions
): Promise<ContributorStatsResult>

// From 'git-contributor-stats/reports'
export async function generateReports(
  stats: ContributorStatsResult,
  options?: ReportOptions
): Promise<void>

// From 'git-contributor-stats/charts'
export async function generateCharts(
  stats: ContributorStatsResult,
  options?: ChartOptions,
  outDir?: string
): Promise<void>

// From 'git-contributor-stats/output'
export function handleStdoutOutput(
  stats: ContributorStatsResult,
  options?: OutputOptions
): void

// From 'git-contributor-stats/workflow'
export async function generateWorkflow(repo: string): Promise<void>
```

## Identity Management

Consolidate multiple emails and names for the same person using alias mapping.

### Auto-Detection

The tool automatically looks for `.git-contributor-stats-aliases.json` in the repository root.

### Alias File Location

```bash
# Use default file (if exists)
git-contributor-stats

# Use custom file
git-contributor-stats --alias-file config/aliases.json
```

### Alias File Formats

#### Format 1: Simple Map

Map aliases to canonical identities:

```json
{
  "jane@example.com": "jane.doe@example.com",
  "Jane Doe": "jane.doe@example.com",
  "john@example.com": "john.smith@example.com",
  "J. Smith": "john.smith@example.com"
}
```

#### Format 2: Extended Configuration

More control with groups and canonical details:

```json
{
  "map": {
    "jane@old-company.com": "jane.doe@example.com",
    "jdoe@example.com": "jane.doe@example.com"
  },
  "groups": [
    ["john@example.com", "jsmith@example.com", "john.smith@example.com"],
    ["alice@example.com", "alice.dev@example.com"]
  ],
  "canonical": {
    "jane.doe@example.com": {
      "name": "Jane Doe",
      "email": "jane.doe@example.com"
    },
    "john.smith@example.com": {
      "name": "John Smith",
      "email": "john.smith@example.com"
    }
  }
}
```

#### Format 3: Array of Groups

Shorthand for groups:

```json
[
  ["jane@example.com", "jane.doe@example.com", "Jane Doe"],
  ["john@example.com", "john.smith@example.com", "John Smith"],
  ["alice@old.com", "alice@new.com", "alice@example.com"]
]
```

### Regex Patterns

Use regex patterns for flexible matching:

```json
{
  "map": {
    "/^jane\\.doe@.+$/i": "jane.doe@example.com",
    "/^(John Smith|J\\.? Smith)$/": "john.smith@example.com"
  }
}
```

**Pattern format:** Strings starting and ending with `/` are treated as regex patterns.

### Similarity Threshold

Control automatic name merging:

```bash
# Default threshold (0.85)
git-contributor-stats

# Stricter matching (higher threshold)
git-contributor-stats --similarity 0.95

# More permissive (lower threshold)
git-contributor-stats --similarity 0.75
```

**Range:** 0.0 (merge everything) to 1.0 (exact match only)  
**Recommended:** 0.80 - 0.90

## Configuration

### Environment Variables

Currently, the tool uses command-line options and alias files. Environment variables are not used.

### Default Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| Repository | Current directory (`.`) | Can override with `--repo` |
| Output format | `table` | Can change with `--format` |
| Group by | `email` | Can change with `--group-by` |
| Sort by | `changes` | Can change with `--sort-by` |
| Similarity | `0.85` | Can change with `--similarity` |
| Count lines | `true` | Disable with `--no-count-lines` |
| Include merges | `false` | Enable with `--include-merges` |
| Top stats | `true` | Disable with `--no-top-stats` |

## Examples

### Complete Workflow Examples

#### 1. Quarterly Report Generation

```bash
# Generate comprehensive quarterly report with all outputs
git-contributor-stats \
  --since 90.days \
  --out-dir reports/q4-2024 \
  --md reports/q4-2024/report.md \
  --html reports/q4-2024/dashboard.html \
  --csv reports/q4-2024/contributors.csv \
  --charts \
  --chart-format both \
  --no-count-lines
```

#### 2. Team-Specific Analysis

```bash
# Analyze backend team contributions in src/backend/
git-contributor-stats \
  src/backend/ \
  --since 1.year \
  --alias-file config/team-aliases.json \
  --out-dir reports/backend-team \
  --md --html \
  --charts \
  --top-stats commits,net
```

#### 3. Release Analysis

```bash
# Compare two releases
git-contributor-stats \
  --branch v1.0.0..v2.0.0 \
  --json > v1-to-v2-stats.json

# Analyze specific release period
git-contributor-stats \
  --since 2024-01-01 \
  --until 2024-03-31 \
  --out-dir reports/v2.0 \
  --md --html --charts
```

#### 4. Performance-Optimized Analysis

```bash
# Fast analysis for large repos
git-contributor-stats \
  --no-count-lines \
  --since 6.months \
  --top 20 \
  --format table
```

#### 5. Custom Top Stats

```bash
# Only show commits and net contribution
git-contributor-stats \
  --top-stats commits,net \
  --out-dir reports \
  --md reports/simple-report.md
```

#### 6. CI/CD Integration

```bash
# Generate GitHub Actions workflow
git-contributor-stats --generate-workflow

# Run in CI (example)
git-contributor-stats \
  --since 7.days \
  --out-dir artifacts \
  --md artifacts/weekly-report.md \
  --charts \
  --no-count-lines
```

### Programmatic Examples

#### Monitor Repository Health

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

async function checkRepoHealth() {
  const stats = await getContributorStats({
    repo: '.',
    since: '90.days'
  });
  
  const activeDevelopers = stats.topContributors.length;
  const singleOwnerFiles = stats.busFactor.filesSingleOwner.length;
  const totalFiles = Object.keys(
    stats.topContributors.reduce((acc, c) => ({ ...acc, ...c.files }), {})
  ).length;
  
  const busFactorRisk = singleOwnerFiles / totalFiles;
  
  console.log('Repository Health Check:');
  console.log(`Active developers (90d): ${activeDevelopers}`);
  console.log(`Bus factor risk: ${(busFactorRisk * 100).toFixed(1)}%`);
  
  if (busFactorRisk > 0.3) {
    console.warn('⚠️  High bus factor risk - consider knowledge sharing');
  }
  
  if (activeDevelopers < 3) {
    console.warn('⚠️  Low active developer count');
  }
}

import { generateReports } from 'git-contributor-stats/reports';
import { generateCharts } from 'git-contributor-stats/charts';
```

#### Generate Custom Dashboard

```javascript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateReports } from 'git-contributor-stats/reports';
import { generateCharts } from 'git-contributor-stats/charts';

async function generateDashboard() {
  const [weekly, monthly, quarterly] = await Promise.all([
    getContributorStats({ since: '7.days' }),
    getContributorStats({ since: '30.days' }),
    getContributorStats({ since: '90.days' })
  ]);
  
  await generateReports(weekly, {
    outDir: 'dashboard/weekly',
    md: 'dashboard/weekly/report.md',
    html: 'dashboard/weekly/report.html'
  });
  
  await generateReports(monthly, {
    outDir: 'dashboard/monthly',
    md: 'dashboard/monthly/report.md',
    html: 'dashboard/monthly/report.html'
  });
  await generateCharts(monthly, {
    charts: true,
    chartsDir: 'dashboard/monthly/charts'
  });
  
  await generateReports(quarterly, {
    outDir: 'dashboard/quarterly',
    md: 'dashboard/quarterly/report.md',
    html: 'dashboard/quarterly/report.html'
  });
  await generateCharts(quarterly, {
    charts: true,
    chartsDir: 'dashboard/quarterly/charts',
    chartFormat: 'both'
  });
  
  console.log('✓ Multi-period dashboard generated');
}

generateDashboard();
```

## Output Reference

### Table Output

```
Top stats:
- Most commits: John Smith <john@example.com> (234)
- Most additions: Jane Doe <jane@example.com> (15,432)
- Most deletions: Alice Dev <alice@example.com> (8,901)
- Best net contribution: Jane Doe <jane@example.com> (12,345)
- Most changes: Jane Doe <jane@example.com> (24,333)

┌─────┬────────────────┬─────────┬──────────┬──────────┬─────────┐
│Rank │ Contributor    │ Commits │ Additions│ Deletions│ Changes │
├─────┼────────────────┼─────────┼──────────┼──────────┼─────────┤
│  1  │ Jane Doe       │   156   │  15,432  │   3,087  │ 18,519  │
│  2  │ John Smith     │   234   │   8,901  │   4,523  │ 13,424  │
│  3  │ Alice Dev      │   145   │   6,234  │   8,901  │ 15,135  │
└─────┴────────────────┴─────────┴──────────┴──────────┴─────────┘
```

### JSON Output

Comprehensive analysis object with all metrics (see [API Reference](#api-reference)).

### CSV Output

```csv
Rank,Name,Email,Commits,Additions,Deletions,Net,Changes
1,Jane Doe,jane@example.com,156,15432,3087,12345,18519
2,John Smith,john@example.com,234,8901,4523,4378,13424
3,Alice Dev,alice@example.com,145,6234,8901,-2667,15135
```

### Markdown Report

- Summary statistics
- Top stats (configurable)
- Top contributors table with file details
- Bus factor analysis
- Activity patterns (monthly breakdown, heatmap data)

### HTML Dashboard

Interactive HTML report with:
- Styled summary cards
- Sortable contributor table
- Bus factor risk indicators
- Embedded charts (if generated)
- Monthly/weekly activity visualization

## Performance Tips

### Large Repositories

```bash
# Skip LOC counting (significant speedup)
git-contributor-stats --no-count-lines

# Limit time range
git-contributor-stats --since 6.months

# Limit to specific paths
git-contributor-stats src/ --no-count-lines
```

### Reduce Analysis Scope

```bash
# Analyze only recent commits
git-contributor-stats --since 30.days --top 10

# Specific branch only
git-contributor-stats -b main --since 90.days

# Exclude merge commits (default, but explicit)
git-contributor-stats --no-include-merges
```

### Optimize for CI/CD

```bash
# Fast CI run
git-contributor-stats \
  --since 7.days \
  --no-count-lines \
  --format json > stats.json
```

### Benchmarks

Typical performance on a medium-sized repository (10k commits):

| Operation | With `--count-lines` | With `--no-count-lines` |
|-----------|---------------------|------------------------|
| Full analysis | ~15-20s | ~3-5s |
| Last 90 days | ~8-12s | ~2-3s |
| Last 30 days | ~5-8s | ~1-2s |

*Performance varies based on repository size, file count, and system resources.*

## Development

### Setup

```bash
git clone https://github.com/vikkrantxx7/git-contributor-stats.git
cd git-contributor-stats
npm install
```

### Scripts

```bash
# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run biome

# Fix linting issues
npm run biome:fix

# Generate types
npm run build:types

# Development mode (uses source files)
node dist/cli.mjs --help

# Generate sample reports
npm run report
```

### Project Structure

```
git-contributor-stats/
├── src/
│   ├── features/
│   │   ├── stats.ts          # Core statistics (tree-shakeable)
│   │   ├── charts.ts         # Chart generation (tree-shakeable)
│   │   ├── reports.ts        # Report generation (tree-shakeable)
│   │   ├── output.ts         # Console output (tree-shakeable)
│   │   └── workflow.ts       # GitHub Actions workflow (tree-shakeable)
│   ├── cli/
│   │   ├── entry.ts          # CLI entry point
│   │   ├── index.ts          # CLI logic
│   │   └── options.ts        # Command-line options
│   ├── analytics/
│   │   ├── aggregator.ts     # Data aggregation
│   │   ├── aliases.ts        # Identity resolution
│   │   └── analyzer.ts       # Core analysis logic
│   ├── charts/
│   │   ├── renderer.ts       # Chart rendering (PNG)
│   │   └── svg.ts            # SVG generation
│   ├── git/
│   │   ├── parser.ts         # Git log parsing
│   │   └── utils.ts          # Git operations
│   ├── reports/
│   │   ├── csv.ts            # CSV generation
│   │   ├── html.ts           # HTML generation
│   │   └── markdown.ts       # Markdown generation
│   ├── utils/
│   │   ├── dates.ts          # Date parsing
│   │   ├── files.ts          # File operations
│   │   └── formatting.ts     # Output formatting
│   └── api.ts                # TypeScript types
├── dist/                      # Built files
│   ├── features/             # Feature modules (separate entry points)
│   └── chunks/               # Shared code chunks
├── tests/                     # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

- `git-contributor-stats/charts` - Chart generation with Chart.js (~260KB with charts)
- `git-contributor-stats/reports` - Report generation: CSV, Markdown, HTML (~200KB)
- `git-contributor-stats/output` - Console output formatting (table, JSON, CSV)
- `git-contributor-stats/workflow` - GitHub Actions workflow generator (~5KB)
- `git-contributor-stats/cli` - CLI entry point (combines all features)

**Bundle Size Comparison:**

| Import | Bundle Size | Reduction |
|---------|---------|-------------|
| Core stats only | ~80KB | 84% smaller |
| Stats + Reports | ~200KB | 60% smaller |
| Stats + Charts | ~260KB | 48% smaller |
| Full features (CLI) | ~400KB | 20% smaller |

*Compared to the previous monolithic bundle of ~500KB*

*See [Technical Documentation](./docs/technical/TECHNICAL.md) for architecture details, tree-shaking verification, and migration guide*

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- tests/e2e/api.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Documentation

📚 **Complete documentation is available in the [`docs/`](./docs/) directory:**

- **[Quick Start Guide](./docs/QUICK-START.md)** - Get started in 30 seconds with common use cases
- **[Quick Reference](./docs/QUICK-REFERENCE.md)** - Command cheat sheet for quick lookup
- **[Contributing Guide](./docs/contributing/CONTRIBUTING.md)** - How to contribute to this project
- **[Commit Guidelines](./docs/contributing/COMMIT-GUIDELINES.md)** - Conventional commits format
- **[Release Workflow](./docs/contributing/RELEASE.md)** - Version management with changesets
- **[Technical Documentation](./docs/technical/TECHNICAL.md)** - Architecture and internals

📖 **[View Documentation Index](./docs/README.md)**

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing/CONTRIBUTING.md) for details.

**Quick steps:**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linter (`npm test && npm run lint`)
5. Commit following [conventional commits](./docs/contributing/COMMIT-GUIDELINES.md) (`git commit -m 'feat: add amazing feature'`)
6. Add a [changeset](./docs/contributing/RELEASE.md) (`npx changeset`)
7. Push and open a Pull Request

> 📝 This project uses [Conventional Commits](./docs/contributing/COMMIT-GUIDELINES.md) and [Changesets](./docs/contributing/RELEASE.md) for version management.

## GitHub Actions Integration

Generate a workflow file:

```bash
git-contributor-stats --generate-workflow
```

This creates `.github/workflows/git-contributor-stats.yml`:

```yaml
name: Git Contributor Stats

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  stats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install git-contributor-stats
        run: npm install -g git-contributor-stats
      
      - name: Generate reports
        run: |
          git-contributor-stats \
            --since 90.days \
            --out-dir reports \
            --md reports/report.md \
            --html reports/report.html \
            --charts \
            --no-count-lines
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: contributor-stats
          path: reports/
```

## Security

🔐 This project publishes packages with **NPM provenance** enabled, providing cryptographic proof of build authenticity.

For security issues, please see [SECURITY.md](./SECURITY.md) for our security policy and how to report vulnerabilities responsibly.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [npm Package](https://www.npmjs.com/package/git-contributor-stats)
- [GitHub Repository](https://github.com/vikkrantxx7/git-contributor-stats)
- [Issue Tracker](https://github.com/vikkrantxx7/git-contributor-stats/issues)
- [Security Policy](./SECURITY.md)

---

Made with ❤️ for better repository insights
