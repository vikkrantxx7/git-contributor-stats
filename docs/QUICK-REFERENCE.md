# Quick Reference - git-contributor-stats

> One-page command cheat sheet for daily use

## Installation

```bash
# Global CLI
npm install -g git-contributor-stats

# Local project
npm install git-contributor-stats
```

---

## Most Common Commands

### 1. Quick Analysis (Console)
```bash
git-contributor-stats --since 90.days
```

### 2. Full Dashboard (Most Popular!)
```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

### 3. Fast Analysis (Large Repos)
```bash
git-contributor-stats --no-count-lines --since 6.months --top 20
```

### 4. Weekly Report
```bash
git-contributor-stats --since 7.days --md weekly-report.md
```

### 5. Release Comparison
```bash
git-contributor-stats --branch v1.0.0..v2.0.0 --json > release.json
```

### 6. Health Check
```bash
git-contributor-stats --since 90.days --json | jq '.busFactor'
```

### 7. Specific Directory
```bash
git-contributor-stats src/ --since 1.year --md backend-team.md
```

### 8. Activity Patterns
```bash
git-contributor-stats --since 6.months --charts
```

---

## Output Formats

| Format | Option | Output |
|--------|--------|--------|
| Table | `--format table` | Console (default) |
| JSON | `--json` | Comprehensive JSON |
| CSV | `--csv file.csv` | Spreadsheet-ready |
| Markdown | `--md file.md` | Documentation |
| HTML | `--html file.html` | Dashboard |
| Charts | `--charts` | SVG/PNG visualizations |

---

## Common Options

### Time Filtering
```bash
--since 90.days              # Last quarter
--since 30.days              # Last month
--since 7.days               # Last week
--since 2024-01-01           # From specific date
--until 2024-12-31           # Until specific date
```

### Branch/Range
```bash
--branch main                # Specific branch
--branch main..feature       # Compare branches
--branch v1.0..v2.0          # Compare tags
```

### Author & Path
```bash
--author "jane@example.com"  # Filter by author
src/                         # Specific directory
src/ lib/ tests/             # Multiple paths
```

### Sorting & Limiting
```bash
--sort-by commits            # Sort by commits
--sort-by additions          # Sort by additions
--sort-by net                # Sort by net lines
--top 10                     # Limit to top N
```

### Performance
```bash
--no-count-lines             # Skip LOC counting (5x faster)
```

### Identity
```bash
--alias-file aliases.json    # Merge duplicate identities
--similarity 0.9             # Name merge threshold
```

---

## Output Combinations

### Console + File
```bash
# JSON to stdout AND file reports
git-contributor-stats --json --md report.md --html dashboard.html
```

### All Formats
```bash
# Generate everything
git-contributor-stats \
  --out-dir reports \
  --md reports/report.md \
  --html reports/dashboard.html \
  --csv reports/contributors.csv \
  --charts \
  --chart-format both
```

---

## Programmatic API

### Core Stats
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  since: '90.days',
  countLines: false
});
```

### Generate Reports
```javascript
import { generateReports } from 'git-contributor-stats/reports';

await generateReports(stats, {
  outDir: 'reports',
  md: 'reports/report.md',
  html: 'reports/dashboard.html',
  csv: 'reports/contributors.csv'
});
```

### Generate Charts
```javascript
import { generateCharts } from 'git-contributor-stats/charts';

await generateCharts(stats, {
  charts: true,
  chartsDir: 'reports/charts',
  chartFormat: 'svg'  // or 'png' or 'both'
});
```

---

## Bash Aliases (Optional)

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Quick stats
alias gcs='git-contributor-stats'

# Weekly report
alias gcs-weekly='git-contributor-stats --since 7.days --md weekly-report.md'

# Monthly dashboard
alias gcs-monthly='git-contributor-stats --since 30.days --out-dir reports --md --html --charts'

# Quick health check
alias gcs-health='git-contributor-stats --since 90.days --json | jq "{contributors: .topContributors | length, bus_factor: .busFactor.filesSingleOwner | length}"'

# Fast analysis
alias gcs-fast='git-contributor-stats --no-count-lines --since 90.days --top 20'
```

---

## Performance Tips

| Repo Size | Recommended Command |
|-----------|---------------------|
| Small (<1k commits) | All features enabled |
| Medium (1k-10k) | `--no-count-lines` |
| Large (10k-50k) | `--no-count-lines --since 6.months` |
| Huge (50k+) | `--no-count-lines --since 90.days --top 20` |

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Too slow | Add `--no-count-lines` |
| Too many contributors | Add `--top 20` |
| Duplicate names | Use `--alias-file` |
| Need specific period | Use `--since` and `--until` |
| Large output | Filter with `--top` or paths |

---

## GitHub Actions

Generate workflow:
```bash
git-contributor-stats --generate-workflow
```

Creates `.github/workflows/git-contributor-stats.yml` for automated reports.

---

## More Information

- **Usage examples**: [QUICK-START.md](./QUICK-START.md)
- **Complete docs**: [README.md](./README.md)
- **Architecture**: [TECHNICAL.md](./technical/TECHNICAL.md)

---

**Print this and keep it handy! 📋**

