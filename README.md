# git-contributor-stats

A fast Node.js CLI to compute contributor and repository statistics from a Git repository: commits, lines added/deleted, top files per contributor, commit frequency, heatmap, bus-factor, and more. Filter by branch, author, timeframe, and pathspecs. Output to table, JSON, CSV, Markdown, HTML, or SVG charts.

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

## Quick start (local)

```bash
npm install

# Show help
node index.js --help

# Top 10 contributors in current repo
node index.js --top 10

# JSON output (comprehensive analysis)
node index.js --json

# Generate Markdown & HTML reports and SVG charts (skip LOC counting for speed)
node index.js --out-dir reports --md reports/report.md --html reports/report.html --no-count-lines --charts --chart-format svg

# Omit the Top stats section in reports & stdout
node index.js --out-dir reports --md reports/report-no-topstats.md --html reports/report-no-topstats.html --no-top-stats
```

If you want a global command name locally:

```bash
npm link
# Then:
git-contributor-stats --help
```

## Programmatic usage (ESM-only)

```js
// Node 18+ ESM
import { main } from 'git-contributor-stats';

await main(process.argv);
```

## Usage

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

### Date inputs

- Absolute: `--since 2024-01-01`
- Relative: `--since 90.days`, `--since 2.weeks`, `--since 3.months`, `--since 1.year`

Relative inputs are approximate (week=7 days, month=30 days, year=365 days).

### Top stats configuration

You can configure which metrics to display in the “Top stats” section (Markdown/HTML and stdout table header).

- Supported metrics: `commits, additions, deletions, net, changes`
- Example: only commits and net

```bash
git-contributor-stats --top-stats commits,net --out-dir reports --md reports/report.md --html reports/report.html
```

To hide the section altogether, use `--no-top-stats`.

### Charts

- Use `--charts` to generate charts, with optional `--charts-dir` and `--chart-format`.
- Formats: `svg` (default) or `png` (requires chartjs-node-canvas at runtime); `both` writes both.
- HTML report renders client-side charts via Chart.js CDN.
- If server-side PNG generation is unavailable, the tool falls back to SVG generation.
- Legacy flags `--svg` and `--svg-dir` remain as compatibility shims; prefer `--charts`, `--charts-dir`, and `--chart-format`.

Examples:

```bash
# Write SVG charts to a custom directory
git-contributor-stats --charts --charts-dir ./charts --chart-format svg

# Write PNG charts (requires Node canvas support via chartjs-node-canvas)
git-contributor-stats --charts --charts-dir ./charts --chart-format png

# Write both SVG and PNG
git-contributor-stats --charts --charts-dir ./charts --chart-format both
```

### Verbose/debug logs

By default, debug logging is suppressed to keep stdout clean (especially for `--json`/`--csv`).

- Enable verbose mode with `-v/--verbose` or set `DEBUG=1` or `VERBOSE=1`.
- Debug messages are written to stderr; warnings/errors always go to stderr.

## Examples

- Top 10 contributors (table):

  ```bash
  git-contributor-stats --top 10
  ```

- Last 90 days on main (table):

  ```bash
  git-contributor-stats -b main --since 90.days
  ```

- Group by author name, sorted by commits:

  ```bash
  git-contributor-stats --group-by name --sort-by commits
  ```

- Comprehensive JSON analysis (includes frequency, heatmap, bus-factor, topStats):

  ```bash
  git-contributor-stats --json
  ```

- Generate CSV, Markdown, HTML, and charts (SVG by default):

  ```bash
  git-contributor-stats --out-dir reports \
    --csv reports/contributors.csv \
    --md reports/report.md \
    --html reports/report.html \
    --charts --chart-format svg --no-count-lines
  ```

- Omit Top stats section in reports & stdout:

  ```bash
  git-contributor-stats --out-dir reports --md reports/report-no-topstats.md --html reports/report-no-topstats.html --no-top-stats
  ```

- Narrow to a folder and a specific author:

  ```bash
  git-contributor-stats packages/app/ --author "Jane Doe" --format json
  ```

- Merge similar contributor names more aggressively:

  ```bash
  git-contributor-stats --similarity 0.9 --json
  ```

## Output

### Table

- Columns: rank, author/email, commits, +additions, -deletions, ±changes
- Optional “Top stats” header with selected metrics (omit with --no-top-stats)
- Footer total and detected date range

### JSON (comprehensive)

Includes:
- meta (repo, branch, generatedAt, since/until)
- totalCommits, totalLines
- contributors (merged by similarity)
- topContributors (with top files per contributor)
- topStats: best contributor by commits, additions, deletions, net, and total changes
- commitFrequency (monthly, weekly)
- heatmap (weekday × hour; 7×24 grid)
- busFactor (filesSingleOwner)

### CSV

- contributors.csv: contributor, commits, added, deleted, net, top files

### Markdown / HTML

- Markdown: summary, optional Top stats section, top contributors, bus factor, monthly frequency, heatmap JSON block
- HTML: summary, optional Top stats section, charts (Chart.js via CDN), and a heatmap table

### SVG charts

- top-commits.svg: bar chart of top contributors by commits
- top-net.svg: bar chart of top contributors by net lines (added - deleted)
- heatmap.svg: weekday × hour heatmap with counts

## GitHub Actions workflow

Generate a starter workflow file:

```bash
git-contributor-stats --generate-workflow
```

This creates `.github/workflows/git-contributor-stats.yml` that runs the CLI on push and uploads the reports as an artifact.

## Performance notes

- For very large repos, prefer: `--since/--until`, pathspecs, and `--no-count-lines`
- Counting total lines reads every tracked file; skip it with `--no-count-lines`

## Development

- Node.js 18+
- Install: `npm install`
- Help: `npm run help`
- Tests (Vitest): `npm test`
- Run smoke script (optional): `npm run smoke`
- Reports (sample): `npm run report`

## License

Private/internal. Use within your organization.

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
