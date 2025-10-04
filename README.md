# git-contributor-stats

A fast Node.js CLI to compute contributor and repository statistics from a Git repository: commits, lines added/deleted, top files per contributor, commit frequency, heatmap, bus-factor, and more. Filter by branch, author, timeframe, and pathspecs. Output to table, JSON, CSV, Markdown, HTML, or SVG/PNG charts.

> Requirements: Node.js 18+ (ESM-only). The library build publishes only ESM (`dist/index.mjs`).

## Features

- Aggregate by email or author name; sort by changes/commits/additions/deletions
- Filters: branch/range, since/until (supports relative like `90.days`), author pattern, pathspecs
- Per-contributor metrics: commits, +additions, -deletions, net, top-changed files
- Top contributor stats: best by commits, additions, deletions, net, and total changes (configurable; omit with `--no-top-stats` for reports and stdout)
- Commit frequency over time: monthly + weekly buckets
- Heatmap of commit activity by weekday × hour (local time)
- Bus-factor analysis: files with a single contributor; ownership distribution
- Total lines of code (across tracked files) — can be skipped for speed
- Export formats: table (default), JSON (`--json`), CSV (`--csv`), Markdown (`--md`), HTML (`--html`)
- Charts: top contributors (commits and net) and heatmap — use `--charts` (with `--charts-dir` and `--chart-format svg|png|both`); legacy `--svg` and `--svg-dir` are still supported
- Convenience: write all reports to a directory via `--out-dir`
- Optional GitHub Actions workflow generator via `--generate-workflow`

## Architecture: Dual Usage (CLI vs Programmatic API)

The project now exposes two clearly separated entry points:

1. Programmatic API: `getContributorStats(options)` exported from the package root (`dist/index.mjs`). Accepts an options object; does **not** read `process.argv` or print to stdout.
2. CLI: `git-contributor-stats` (bin) / `dist/cli.mjs` parses command-line arguments (via Commander), invokes internal logic, and handles formatting, file writing, and charts.

They are independent: passing options as function parameters for code usage vs. parsing CLI flags for terminal usage.

### Files
- `src/index.js` -> bundled to `dist/index.mjs` (library API)
- `src/cli/entry.js` -> bundled to `dist/cli.mjs` (CLI bin)
- Development convenience script: `cli.js` (runs source without building)
- Monolithic legacy `index.js` (root) retained temporarily (deprecated) — prefer the modular CLI/API.

## Quick start (local development)

```bash
npm install

# Show help (development – uses source files)
node cli.js --help

# Top 10 contributors in current repo
node cli.js --top 10

# JSON output (comprehensive analysis)
node cli.js --json

# Generate Markdown & HTML reports and SVG charts (skip LOC counting for speed)
node cli.js --out-dir reports \
  --md reports/report.md \
  --html reports/report.html \
  --no-count-lines --charts --chart-format svg

# Omit the Top stats section in reports & stdout
node cli.js --out-dir reports --md reports/report-no-topstats.md --html reports/report-no-topstats.html --no-top-stats
```

After building (or when installed as a dependency / globally):

```bash
npm run build
node dist/cli.mjs --help
# or
npx git-contributor-stats --help
```

If you want a global command locally:

```bash
npm link
# Then:
git-contributor-stats --help
```

## Programmatic usage (ESM-only)

Import the function and pass options directly (no CLI parsing, no stdout noise unless you print it):

```js
import { getContributorStats } from 'git-contributor-stats';

const stats = await getContributorStats({
  repo: '.',            // path to repo (default '.')
  branch: 'main',        // branch or range (e.g. 'main..feature')
  since: '90.days',      // relative or ISO date
  author: 'alice',       // git author pattern
  paths: ['src/'],       // pathspec(s)
  similarity: 0.85,      // identity merge threshold
  countLines: false,     // skip total LOC for speed
  aliasConfig: {         // optional inline aliasing
    groups: [ ['alice@example.com','Alice Dev'] ],
    canonical: { 'alice@example.com': { name: 'Alice Developer' } }
  }
});

console.log(stats.totalCommits, 'commits');
console.log(stats.topContributors.slice(0, 3));
```

Return shape (high level):
- `meta` { repo, branch, generatedAt, since, until }
- `totalCommits`, `totalLines`
- `contributors` (map), `topContributors` (array)
- `topStats` (summary best-by metrics)
- `commitFrequency` (monthly & weekly), `heatmap` (7×24 grid)
- `busFactor` (single-owner files)
- `basic` (simple aggregated contributor list + meta stats)

## CLI Usage

```
Usage: git-contributor-stats [options] [paths...]

Compute contributor and repository statistics from a Git repository

Options:
  -r, --repo <path>         Path to the Git repository (default: ".")
  -b, --branch <name>       Branch or commit range (e.g., main or main..feature)
  --since <when>            Only include commits more recent than <when> (e.g., '2024-01-01', '30.days')
  --until <when>            Only include commits older than <when>
  -a, --author <pattern>    Limit to commits by author (git-supported string/regex)
  --include-merges          Include merge commits (excluded by default)
  -g, --group-by <field>    Group by: email | name (default: email)
  -s, --sort-by <metric>    Sort by: changes | commits | additions | deletions (default: changes)
  -t, --top <n>             Limit to top N contributors (table/CSV stdout)
  -f, --format <kind>       Output to stdout: table | json | csv (default: table)
  --json                    Print comprehensive JSON analysis to stdout
  --csv <path>              Write CSV contributors summary to file
  --md <path>               Write Markdown report to file
  --html <path>             Write HTML dashboard report to file
  --out-dir <path>          Write selected outputs into the directory (uses default filenames)
  --charts                  Generate charts (defaults to SVG)
  --charts-dir <path>       Directory to write charts (when --charts is set)
  --chart-format <fmt>      Chart output format: svg | png | both (default: svg)
  --svg                     Deprecated: write SVG charts (compat shim for --charts)
  --svg-dir <path>          Deprecated: directory for SVG charts (compat shim)
  --top-stats <list>        Top stats metrics to show (comma-separated): commits, additions, deletions, net, changes
  --no-top-stats            Omit the Top stats section in Markdown/HTML and stdout table output
  --alias-file <path>       Path to alias mapping JSON file for canonical identities
  --similarity <0..1>       Name-merge similarity threshold (default: 0.85)
  --generate-workflow       Create sample GitHub Actions workflow (.github/workflows/...)
  --no-count-lines          Skip counting total lines (faster)
  -v, --verbose             Verbose logging (debug to stderr)
```

### Options (summary)

- Repository / filtering: `--repo`, `--branch`, `--since`, `--until`, `--author`, `--include-merges`
- Grouping / sorting: `--group-by`, `--sort-by`, `--top`
- Formats: `--format table|json|csv`, `--json`, `--csv`, `--md`, `--html`, `--out-dir`
- Charts: `--charts`, `--charts-dir`, `--chart-format svg|png|both` (legacy `--svg`, `--svg-dir`)
- Analysis: `--similarity`, `--alias-file`
- Performance: `--no-count-lines`
- Report customization: `--no-top-stats`, `--top-stats`
- Misc: `--generate-workflow`, `--verbose`, `--help`, `--version`

(See `git-contributor-stats --help` for detailed descriptions and examples.)

### Date inputs

- Absolute: `--since 2024-01-01`
- Relative: `--since 90.days`, `--since 2.weeks`, `--since 3.months`, `--since 1.year`

Relative inputs are approximate (week=7 days, month=30 days, year=365 days).

### Top stats configuration

Configure which metrics appear in “Top stats” (Markdown/HTML & stdout table preamble):

```bash
git-contributor-stats --top-stats commits,net --out-dir reports --md reports/report.md --html reports/report.html
```

Hide entirely:

```bash
git-contributor-stats --no-top-stats
```

### Charts

Examples:

```bash
# Write SVG charts to custom directory
git-contributor-stats --charts --charts-dir ./charts --chart-format svg

# Write PNG charts
git-contributor-stats --charts --charts-dir ./charts --chart-format png

# Write both SVG and PNG
git-contributor-stats --charts --charts-dir ./charts --chart-format both
```

### Verbose/debug logs

Enable with `--verbose` (stderr). Useful for inspecting git commands & alias file usage.

## Output Formats (Brief)

- Table (stdout) + optional Top stats section.
- JSON comprehensive object (see Programmatic usage).
- CSV contributor summary.
- Markdown / HTML reports (with optional charts, heatmap, bus factor section, top stats).
- SVG/PNG charts (top commits / net, heatmap).

## GitHub Actions workflow

```bash
git-contributor-stats --generate-workflow
```

Creates `.github/workflows/git-contributor-stats.yml` with a sample artifact upload.

## Performance Notes

- Use `--since`, `--until`, pathspecs to narrow scope on large repos.
- Disable line counting with `--no-count-lines` for speed.
- Identity merging similarity can affect performance slightly; default 0.85 is a good balance.

## Roadmap / Ideas

- Additional report themes / JSON schema versioning
- Optional CJS wrapper for broader ecosystem compatibility
- Incremental caching of git log scans

## Development

```bash
npm install
npm run help      # same as: node cli.js --help
npm test          # vitest E2E suite
npm run build     # produces dist/index.mjs + dist/cli.mjs
npm run report    # sample report generation
```

## License

MIT (see LICENSE). Legacy monolithic `index.js` retained temporarily for transition; prefer the modular API/CLI going forward.

## Alias mapping (author identity consolidation)

You can map multiple emails/names to a single canonical identity using a JSON file.

- Default path: `.git-contributor-stats-aliases.json` at the repo root (auto-detected)
- Custom path: pass `--alias-file path/to/aliases.json`

Supported shapes:

1) Simple map (alias -> canonical)

```json
{
  "jane@example.com": "jane.doe@example.com",
  "Jane Doe": "jane.doe@example.com",
  "john@example.com": "john.smith@example.com"
}
```

2) Map/groups/canonical (extended)

```json
{
  "map": {
    "jane@example.com": "jane.doe@example.com",
    "/^doe\\.jane@.+$/i": "jane.doe@example.com"
  },
  "groups": [
    ["john@example.com", "jsmith@example.com", "john.smith@example.com"],
    ["/^(John Smith|J Smith)$/", "john.smith@example.com"]
  ],
  "canonical": {
    "jane.doe@example.com": { "name": "Jane Doe", "email": "jane.doe@example.com" },
    "john.smith@example.com": { "name": "John Smith", "email": "john.smith@example.com" }
  }
}
```

3) Array of groups (shorthand)

```json
[
  ["alias1@example.com", "Alias One", "canonical1@example.com"],
  ["/^(A Two|Two A)$/", "two@example.com", "canonical2@example.com"]
]
```

Notes:
- Strings like "/pattern/flags" are treated as regex patterns and matched against author name or email.
- The canonical identity is taken from the group’s chosen canonical entry (prefers an email-like entry when present).
- You can optionally provide `canonical` details to control displayed name/email in reports/charts.

Usage examples:

```bash
# Use default file at repo root (if present)
node index.js --json

# Use a custom path
node index.js --alias-file ./config/aliases.json --out-dir reports --md reports/report.md --html reports/report.html
```
