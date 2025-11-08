# Technical Documentation - git-contributor-stats

> Architecture, modular design, and development guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Modular Design](#modular-design)
- [Development Guide](#development-guide)

---

## Architecture Overview

This project uses a **feature-based module structure** with subpath exports for optimal bundle sizes. Import only what you need.

### Subpath Exports

The package uses subpath exports for tree-shaking:

```json
{
  "exports": {
    "./stats": "./dist/features/stats.mjs",
    "./charts": "./dist/features/charts.mjs",
    "./reports": "./dist/features/reports.mjs",
    "./output": "./dist/features/output.mjs",
    "./workflow": "./dist/features/workflow.mjs",
    "./cli": "./dist/cli.mjs"
  }
}
```

**Import only what you need** - Each feature is independently importable.

### Usage Examples

**Minimal Import (Stats Only):**
```typescript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({ repo: '.' });
console.log(`Total commits: ${stats.totalCommits}`);
```

**With Charts:**
```typescript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateCharts } from 'git-contributor-stats/charts';

const stats = await getContributorStats({ repo: '.' });
await generateCharts(stats, { charts: true, chartFormat: 'svg' });
```

**With Reports:**
```typescript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateReports } from 'git-contributor-stats/reports';

const stats = await getContributorStats({ repo: '.' });
await generateReports(stats, { outDir: './reports', html: true });
```

## Modular Design

### Project Structure



```
src/
├── features/              # Feature modules (tree-shakeable entry points)
│   ├── stats.ts          # Core statistics
│   ├── charts.ts         # Chart generation
│   ├── reports.ts        # Report generation
│   ├── output.ts         # Console output
│   └── workflow.ts       # GitHub Actions workflow
├── cli/                   # CLI implementation
│   ├── entry.ts          # CLI entry point
│   ├── index.ts          # CLI logic
│   └── options.ts        # Command-line options
├── analytics/             # Core analysis logic
│   ├── aggregator.ts     # Data aggregation
│   ├── aliases.ts        # Identity resolution
│   └── analyzer.ts       # Analysis algorithms
├── charts/                # Chart rendering
│   ├── renderer.ts       # PNG rendering (Chart.js)
│   └── svg.ts            # SVG generation
├── git/                   # Git operations
│   ├── parser.ts         # Git log parsing
│   └── utils.ts          # Git commands
├── reports/               # Report generators
│   ├── csv.ts            # CSV generation
│   ├── html.ts           # HTML generation
│   └── markdown.ts       # Markdown generation
└── utils/                 # Shared utilities
    ├── dates.ts          # Date parsing
    ├── files.ts          # File operations
    ├── formatting.ts     # Output formatting
    ├── normalization.ts  # Data normalization
    └── similarity.ts     # String similarity
```

### Design Principles

1. **Feature Isolation** - Each feature is independently usable
2. **Shared Chunks** - Common code automatically split
3. **Lazy Loading** - Import features only when needed
4. **Zero Circular Dependencies** - Clean dependency graph
5. **ESM-First** - Modern JavaScript modules

---


#### ✅ DO

```typescript
// Import specific features
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateCharts } from 'git-contributor-stats/charts';

// Lazy-load when needed
if (needCharts) {
  const { generateCharts } = await import('git-contributor-stats/charts');
  await generateCharts(stats, options);
}
```

#### ❌ DON'T

```typescript
// Don't try to import from package root (no barrel export)
import { getContributorStats } from 'git-contributor-stats'; // ERROR!

// Don't import everything if you only need one feature
import * as GitStats from 'git-contributor-stats/stats'; // Less optimal
```


---

## Development Guide

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

# Build types only
npm run build:types

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm run coverage

# Run linter
npm run biome

# Fix linting issues
npm run biome:fix

# Format code
npm run format

# Fix formatting
npm run format:fix

# Type check
npm run typeCheck

# Generate sample reports
npm run report
```

### Build Output

```bash
npm run build
```

Generates:
```
dist/
├── features/             # Feature modules
│   ├── stats.mjs
│   ├── charts.mjs
│   ├── reports.mjs
│   ├── output.mjs
│   └── workflow.mjs
├── chunks/               # Shared code chunks
│   ├── analytics-*.mjs
│   ├── git-*.mjs
│   └── utils-*.mjs
├── cli.mjs              # CLI entry point
└── *.d.ts               # TypeScript declarations
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/e2e/api.test.ts

# Watch mode
npm test:watch

# Coverage report
npm run coverage
open coverage/index.html
```

### Code Quality

```bash
# Lint check
npm run biome

# Format check
npm run format

# Type check
npm run typeCheck

# Run all checks
npm run lint
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linter: `npm test && npm run lint`
5. Commit following [conventional commits](../contributing/COMMIT-GUIDELINES.md): `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

> 📝 **Important:** This project uses [Conventional Commits](../contributing/COMMIT-GUIDELINES.md). Your commit messages will be automatically validated by commitlint.

### Release Process

This project uses [Changesets](../contributing/RELEASE.md) for automated version management and changelog generation.

**Automated (Recommended):**
1. Add changeset: `npx changeset`
2. Merge to main
3. GitHub Action creates "Version Packages" PR
4. Merge the PR → auto-publishes to npm

**Manual:**
```bash
# 1. Bump version and update changelog
npm run version

# 2. Commit (using conventional commits)
git add .
git commit -m "chore(release): version packages"

# 3. Build and publish
npm run release

# 4. Push changes and tags
git push && git push --tags
```

See [RELEASE.md](../contributing/RELEASE.md) for detailed guide.

---


**Questions or suggestions?** Open an issue on [GitHub](https://github.com/vikkrantxx7/git-contributor-stats/issues)!

