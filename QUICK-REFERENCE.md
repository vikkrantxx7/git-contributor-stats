# Quick Reference Card - git-contributor-stats

## 🎯 One-Line Commands for Common Tasks

### 1️⃣ Quick Health Check
```bash
git-contributor-stats --since 90.days --json | jq '.busFactor'
```

### 2️⃣ Generate Full Report (Most Popular)
```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

### 3️⃣ Weekly Team Update
```bash
git-contributor-stats --since 7.days --md weekly-report.md --charts
```

### 4️⃣ Release Comparison
```bash
git-contributor-stats --branch v1.0.0..v2.0.0 --json > release-diff.json
```

### 5️⃣ Fast Analysis (Large Repos)
```bash
git-contributor-stats --since 6.months --no-count-lines --top 20
```

### 6️⃣ Specific Directory Analysis
```bash
git-contributor-stats src/backend/ --since 1.year --md backend-team.md
```

### 7️⃣ Activity Patterns
```bash
git-contributor-stats --since 6.months --json | jq '.heatmap'
```

### 8️⃣ Top 10 Contributors This Month
```bash
git-contributor-stats --since 30.days --top 10 --format table
```

---

## 📊 Output Formats Quick Guide

| Format | Option | Best For |
|--------|--------|----------|
| **Table** | `--format table` | Console viewing (default) |
| **JSON** | `--json` | API integration, custom processing |
| **CSV** | `--csv stats.csv` | Excel, Google Sheets |
| **Markdown** | `--md report.md` | GitHub wikis, documentation |
| **HTML** | `--html dashboard.html` | Stakeholder presentations |
| **Charts** | `--charts` | Visual analysis (SVG/PNG) |

---

## 🎨 Common Filtering Patterns

```bash
# Last 90 days
--since 90.days

# Specific date range
--since 2024-01-01 --until 2024-12-31

# Specific branch
--branch main

# Compare branches
--branch main..feature-xyz

# Specific author
--author "jane@example.com"

# Specific paths
src/ lib/ tests/

# Exclude line counting (faster)
--no-count-lines

# Top N contributors
--top 10
```

---

## 🔥 Most Useful Combinations

### Quarterly Business Review
```bash
git-contributor-stats \
  --since 90.days \
  --out-dir reports/Q4-2024 \
  --md --html --csv \
  --charts --chart-format both \
  --no-count-lines
```

### Sprint Retrospective
```bash
git-contributor-stats \
  --since 14.days \
  --md sprint-21-report.md \
  --charts \
  --top-stats commits,net
```

### Team Health Check
```bash
git-contributor-stats \
  --since 90.days \
  --json | jq '{
    active_devs: .topContributors | length,
    total_commits: .totalCommits,
    bus_factor_risk: .busFactor.filesSingleOwner | length
  }'
```

### Release Notes Data
```bash
git-contributor-stats \
  --branch v2.0.0..v3.0.0 \
  --format csv > v3-contributors.csv
```

---

## 💾 Save These Aliases (Optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Weekly stats
alias stats-weekly='git-contributor-stats --since 7.days --md weekly-report.md'

# Monthly dashboard
alias stats-monthly='git-contributor-stats --since 30.days --out-dir reports/monthly --md --html --charts'

# Quick check
alias stats-quick='git-contributor-stats --since 90.days --no-count-lines --top 10'

# Health check
alias stats-health='git-contributor-stats --since 90.days --json | jq "{contributors: .topContributors | length, bus_factor: .busFactor.filesSingleOwner | length}"'
```

---

## 🚀 Programmatic API Quick Start

```javascript
// Simple analysis
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  since: '90.days',
  countLines: false
});

console.log(`Total commits: ${stats.totalCommits}`);
console.log(`Contributors: ${stats.topContributors.length}`);
```

```javascript
// Full dashboard
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateReports } from 'git-contributor-stats/reports';
import { generateCharts } from 'git-contributor-stats/charts';

const stats = await getContributorStats({ since: '90.days' });
await generateReports(stats, { outDir: 'reports', md: true, html: true });
await generateCharts(stats, { charts: true, chartsDir: 'reports/charts' });
```

---

## 📋 Checklist: First Time Setup

- [ ] Install: `npm install -g git-contributor-stats`
- [ ] Test run: `git-contributor-stats --since 30.days`
- [ ] Create aliases (optional): Add identity mapping file
- [ ] Generate first report: `git-contributor-stats --since 90.days --out-dir reports --md --html --charts`
- [ ] Set up automation (optional): `git-contributor-stats --generate-workflow`

---

## 🎯 Decision Tree

```
What do you need?
│
├─ Quick console view → git-contributor-stats --since 90.days
│
├─ Detailed report → git-contributor-stats --since 90.days --out-dir reports --md --html --charts
│
├─ Raw data for analysis → git-contributor-stats --json > data.json
│
├─ Compare releases → git-contributor-stats --branch v1.0..v2.0 --json
│
├─ Team health metrics → git-contributor-stats --since 90.days --json | jq '.busFactor'
│
└─ Automated reporting → git-contributor-stats --generate-workflow
```

---

## ⚡ Performance Tips

| Repo Size | Recommended Options |
|-----------|---------------------|
| Small (<1k commits) | All features enabled |
| Medium (1k-10k) | `--no-count-lines` |
| Large (10k+) | `--no-count-lines --since 6.months` |
| Huge (100k+) | `--no-count-lines --since 90.days --top 20` |

---

**Print this card and keep it handy! 📌**

For detailed use cases, see: [CRITICAL-USE-CASES.md](./CRITICAL-USE-CASES.md)

