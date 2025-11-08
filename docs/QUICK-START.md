# Quick Start Guide - git-contributor-stats

> **⚡ From zero to insights in 2 minutes**

## 30-Second Start

```bash
# 1. Install
npm install -g git-contributor-stats

# 2. Run in your repo
cd your-repo
git-contributor-stats --since 90.days --out-dir reports --md --html --charts

# 3. View results
open reports/report.html
```

**You now have:** HTML dashboard, Markdown report, CSV export, and visual charts!

---

## 🎯 5 Critical Use Cases

### 1. 🏥 Repository Health Check

**Goal:** Identify knowledge concentration risks and bus factor

**Command:**
```bash
git-contributor-stats --since 90.days --json | jq '.busFactor'
```

**What you get:**
- Files with single owners (risk indicator)
- Active developer count
- Knowledge distribution analysis

**Programmatic example:**
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({ repo: '.', since: '90.days' });

const singleOwnerFiles = stats.busFactor.filesSingleOwner.length;
const totalFiles = Object.keys(
  stats.topContributors.reduce((acc, c) => ({ ...acc, ...c.files }), {})
).length;

console.log(`Bus factor risk: ${(singleOwnerFiles / totalFiles * 100).toFixed(1)}%`);
if (singleOwnerFiles / totalFiles > 0.3) {
  console.warn('⚠️  HIGH RISK: 30%+ files have single owner');
}
```

---

### 2. 📊 Executive Dashboard & Reports

**Goal:** Generate professional reports for stakeholders

**Command:**
```bash
# Comprehensive quarterly report
git-contributor-stats \
  --since 90.days \
  --out-dir reports/Q4-2024 \
  --md --html --csv \
  --charts \
  --chart-format both \
  --no-count-lines
```

**What you get:**
- ✅ HTML dashboard (interactive, shareable)
- ✅ Markdown report (for wikis/documentation)
- ✅ CSV export (for spreadsheets)
- ✅ Visual charts (SVG/PNG: commits, contributions, heatmaps)

**Programmatic example:**
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateReports } from 'git-contributor-stats/reports';
import { generateCharts } from 'git-contributor-stats/charts';

const stats = await getContributorStats({ since: '90.days', countLines: false });

await generateReports(stats, {
  outDir: 'reports',
  md: 'reports/quarterly.md',
  html: 'reports/dashboard.html',
  csv: 'reports/contributors.csv'
});

await generateCharts(stats, {
  charts: true,
  chartsDir: 'reports/charts',
  chartFormat: 'both'
});

console.log('✅ Reports generated in ./reports/');
```

---

### 3. 🚀 Release Contribution Analysis

**Goal:** Analyze who contributed to specific releases or branches

**Command:**
```bash
# Compare two releases
git-contributor-stats --branch v1.0.0..v2.0.0 --json > release-v2.json

# Analyze specific time period
git-contributor-stats \
  --since 2024-01-01 \
  --until 2024-12-31 \
  --md annual-report.md \
  --charts
```

**What you get:**
- Contributors per release
- Commit counts and line changes
- Perfect for release notes attribution

**Programmatic example:**
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

async function analyzeRelease(startDate, endDate, releaseName) {
  const stats = await getContributorStats({
    since: startDate,
    until: endDate,
    countLines: false
  });
  
  console.log(`\n📦 Release: ${releaseName}`);
  console.log(`👥 Contributors: ${stats.topContributors.length}`);
  console.log(`💻 Total Commits: ${stats.totalCommits}`);
  
  console.log('\n🏆 Top Contributors:');
  stats.topContributors.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}: ${c.commits} commits, +${c.added}/-${c.deleted}`);
  });
}

analyzeRelease('2024-10-01', '2024-12-31', 'v3.0.0');
```

---

### 4. 🎨 Activity Patterns & Heatmap

**Goal:** Visualize when your team is most active

**Command:**
```bash
git-contributor-stats --since 6.months --charts --json > activity.json
```

**What you get:**
- 7×24 activity heatmap (weekday × hour)
- Monthly commit trends
- Peak activity times (optimize meetings!)

**Programmatic example:**
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({ since: '6.months', countLines: false });

// Find peak activity time
const heatmap = stats.heatmap;
let maxCommits = 0, peakDay = 0, peakHour = 0;

heatmap.forEach((day, dayIdx) => {
  day.forEach((commits, hourIdx) => {
    if (commits > maxCommits) {
      maxCommits = commits;
      peakDay = dayIdx;
      peakHour = hourIdx;
    }
  });
});

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
console.log(`Peak activity: ${days[peakDay]} at ${peakHour}:00 (${maxCommits} commits)`);

// Monthly trends
console.log('\n📈 Monthly Trends:');
Object.entries(stats.commitFrequency.monthly)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([month, commits]) => {
    console.log(`  ${month}: ${commits} commits`);
  });
```

---

### 5. 👥 Identity Management

**Goal:** Merge duplicate contributor names (work email + personal email)

**Command:**
```bash
git-contributor-stats --alias-file team-aliases.json --md report.md
```

**Alias file format:**
```json
{
  "groups": [
    ["jane@work.com", "jane@personal.com", "Jane Doe"],
    ["john@oldcompany.com", "john@newcompany.com"]
  ],
  "canonical": {
    "jane@work.com": {
      "name": "Jane Doe",
      "email": "jane@work.com"
    }
  }
}
```

**Programmatic example:**
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  aliasConfig: {
    groups: [
      ['jane@old.com', 'jane@new.com', 'Jane Doe'],
      ['john@work.com', 'john@gmail.com']
    ],
    canonical: {
      'jane@new.com': { name: 'Jane Doe', email: 'jane@new.com' }
    }
  },
  similarity: 0.9
});
```

---

## ⚡ Most Popular Commands

### Quick Console View
```bash
git-contributor-stats --since 90.days
```

### Complete Dashboard (Most Popular!)
```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

### Fast Analysis (Large Repos)
```bash
git-contributor-stats --no-count-lines --since 6.months --top 20
```

### Weekly Team Report
```bash
git-contributor-stats --since 7.days --md weekly-report.md
```

### Release Comparison
```bash
git-contributor-stats --branch v1.0..v2.0 --json > release.json
```

### Specific Directory
```bash
git-contributor-stats src/backend/ --since 1.year --md backend-team.md
```

---

## 📊 Output Formats

| Format | Option | Best For |
|--------|--------|----------|
| **Table** | `--format table` (default) | Console viewing |
| **JSON** | `--json` | API integration, scripting |
| **CSV** | `--csv file.csv` | Excel, Google Sheets |
| **Markdown** | `--md file.md` | GitHub wikis, documentation |
| **HTML** | `--html file.html` | Presentations, dashboards |
| **Charts** | `--charts` | Visual analysis (SVG/PNG) |

---

## 🎨 Common Patterns

### Time-Based Filtering
```bash
--since 90.days           # Last quarter
--since 30.days           # Last month
--since 7.days            # Last week
--since 2024-01-01        # From specific date
--until 2024-12-31        # Until specific date
```

### Branch/Range Filtering
```bash
--branch main             # Specific branch
--branch main..feature    # Compare branches
--branch v1.0..v2.0       # Compare tags
```

### Path Filtering
```bash
src/                      # Specific directory
src/ lib/ tests/          # Multiple paths
```

### Performance Options
```bash
--no-count-lines          # 5x faster on large repos
--top 10                  # Limit to top N contributors
```

---

## 🚀 GitHub Actions Integration

Generate a workflow file:
```bash
git-contributor-stats --generate-workflow
```

This creates `.github/workflows/git-contributor-stats.yml` for automatic weekly reports.

---

## 💡 Pro Tips

1. **Start with 90 days** - `--since 90.days` gives good quarterly view
2. **Use `--no-count-lines`** - Much faster on large repos
3. **Filter by path** - Analyze specific teams: `git-contributor-stats src/backend/`
4. **Save JSON for custom analysis** - `--json > data.json`
5. **Create alias file** - Merge duplicate contributor identities
6. **Schedule reports** - Use `--generate-workflow` for automation

---

## 🎯 Next Steps

1. ✅ Read full documentation: [README.md](./README.md)
2. ✅ Check command reference: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
3. ✅ Learn about architecture: [TECHNICAL.md](./technical/TECHNICAL.md)
4. ✅ Try the commands above on your repo!

---

## ❓ FAQ

**Q: Will it modify my repository?**  
A: No! Read-only operations only. 100% safe.

**Q: How long does it take?**  
A: Small repos: <1s. Large repos: <30s (use `--no-count-lines` for speed).

**Q: Works with all Git hosting?**  
A: Yes! GitHub, GitLab, Bitbucket, or any Git repository.

**Q: Can I use this in CI/CD?**  
A: Yes! Use `--generate-workflow` to create GitHub Actions workflow.

**Q: Is it free?**  
A: 100% free and open source (MIT license).

---

**Ready to explore?** Pick a use case above and run it in your repository!

