# Critical Use Cases for git-contributor-stats

## 🎯 Top 5 Must-Try Use Cases for Your Repository

---

## 1. 📊 Repository Health Check (Team Leadership)

**What it does:** Identify knowledge concentration risks and team health metrics

**Why you need it:** Prevent "bus factor" problems - knowing if critical code knowledge is concentrated in too few people

### Quick Command
```bash
git-contributor-stats --since 90.days --json > health-check.json
```

### Programmatic Approach
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
  
  console.log('🏥 Repository Health Check:');
  console.log(`Active developers (90d): ${activeDevelopers}`);
  console.log(`Single-owner files: ${singleOwnerFiles}/${totalFiles}`);
  console.log(`Bus factor risk: ${(busFactorRisk * 100).toFixed(1)}%`);
  
  if (busFactorRisk > 0.3) {
    console.warn('⚠️  HIGH RISK: 30%+ files have single owner - consider knowledge sharing');
  }
  
  if (activeDevelopers < 3) {
    console.warn('⚠️  LOW ACTIVITY: Less than 3 active developers');
  }
}

checkRepoHealth();
```

**Key Insights:**
- ✅ Bus factor analysis
- ✅ Active developer count
- ✅ Knowledge concentration risks
- ✅ Single-owner file identification

---

## 2. 📈 Quarterly/Monthly Team Reports (Management)

**What it does:** Generate comprehensive contribution reports with charts for stakeholders

**Why you need it:** Perfect for sprint reviews, quarterly business reviews, or team retrospectives

### Quick Command
```bash
# Generate complete quarterly report
git-contributor-stats \
  --since 90.days \
  --out-dir reports/Q4-2024 \
  --md reports/Q4-2024/report.md \
  --html reports/Q4-2024/dashboard.html \
  --csv reports/Q4-2024/contributors.csv \
  --charts \
  --chart-format both \
  --no-count-lines
```

### Weekly Dashboard Generator
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';
import { generateReports } from 'git-contributor-stats/reports';
import { generateCharts } from 'git-contributor-stats/charts';

async function generateWeeklyReport() {
  const stats = await getContributorStats({
    since: '7.days',
    countLines: false
  });
  
  const date = new Date().toISOString().split('T')[0];
  const outDir = `reports/weekly-${date}`;
  
  await generateReports(stats, {
    outDir,
    md: `${outDir}/report.md`,
    html: `${outDir}/dashboard.html`,
    csv: `${outDir}/contributors.csv`
  });
  
  await generateCharts(stats, {
    charts: true,
    chartsDir: `${outDir}/charts`,
    chartFormat: 'svg'
  });
  
  console.log(`✅ Weekly report generated: ${outDir}`);
}

generateWeeklyReport();
```

**Output Includes:**
- ✅ HTML dashboard (interactive)
- ✅ Markdown report (for wikis/docs)
- ✅ CSV export (for spreadsheets)
- ✅ Visual charts (commits, contributions, heatmaps)

---

## 3. 🔍 Release Contribution Analysis (Product/Engineering)

**What it does:** Analyze who contributed to specific releases or feature branches

**Why you need it:** Credit contributors, understand release effort, plan future sprints

### Compare Two Releases
```bash
# What changed between v2.0 and v3.0?
git-contributor-stats \
  --branch v2.0.0..v3.0.0 \
  --json > release-v3.0-analysis.json
```

### Analyze Feature Branch
```bash
# Who worked on the new-feature branch?
git-contributor-stats \
  --branch main..new-feature \
  --md feature-contributors.md \
  --charts
```

### Time-Bound Release Analysis
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

async function analyzeRelease(startDate, endDate, releaseName) {
  const stats = await getContributorStats({
    since: startDate,
    until: endDate,
    countLines: false
  });
  
  console.log(`\n📦 Release: ${releaseName}`);
  console.log(`📅 Period: ${startDate} to ${endDate}`);
  console.log(`👥 Contributors: ${stats.topContributors.length}`);
  console.log(`💻 Total Commits: ${stats.totalCommits}`);
  
  console.log('\n🏆 Top Contributors:');
  stats.topContributors.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}: ${c.commits} commits, +${c.added}/-${c.deleted} lines`);
  });
}

// Example: Analyze Q4 2024 release
analyzeRelease('2024-10-01', '2024-12-31', 'v3.0.0');
```

**Perfect For:**
- ✅ Release notes attribution
- ✅ Sprint retrospectives
- ✅ Feature team analysis
- ✅ Branch comparison

---

## 4. 🎨 Activity Heatmap & Pattern Analysis (Team Insights)

**What it does:** Visualize when your team is most active (day of week × hour of day)

**Why you need it:** Optimize meeting times, understand team working patterns, identify timezone coverage

### Generate Activity Analysis
```bash
git-contributor-stats \
  --since 6.months \
  --json > activity-patterns.json
```

### Analyze Working Patterns
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

async function analyzeWorkingPatterns() {
  const stats = await getContributorStats({
    since: '6.months',
    countLines: false
  });
  
  // Heatmap is 7×24 grid (weekday × hour)
  const heatmap = stats.heatmap;
  
  // Find peak activity hours
  let maxCommits = 0;
  let peakDay = 0;
  let peakHour = 0;
  
  heatmap.forEach((day, dayIdx) => {
    day.forEach((commits, hourIdx) => {
      if (commits > maxCommits) {
        maxCommits = commits;
        peakDay = dayIdx;
        peakHour = hourIdx;
      }
    });
  });
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  console.log('📊 Team Activity Patterns (Last 6 Months)');
  console.log(`Peak activity: ${days[peakDay]} at ${peakHour}:00 (${maxCommits} commits)`);
  
  // Monthly trends
  console.log('\n📈 Monthly Commit Trends:');
  Object.entries(stats.commitFrequency.monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, commits]) => {
      console.log(`  ${month}: ${'█'.repeat(commits / 10)} ${commits} commits`);
    });
}

analyzeWorkingPatterns();
```

**Insights You Get:**
- ✅ Peak activity times (best for meetings)
- ✅ Monthly/weekly trends
- ✅ Timezone distribution
- ✅ Work-life balance indicators

---

## 5. 👤 Identity Management & Team Consolidation (Clean Data)

**What it does:** Merge multiple emails/names per person into single identity

**Why you need it:** Get accurate contributor counts when people use different emails (work/personal, old company domains)

### Auto-Detect Similar Names
```bash
# Use default similarity (0.85)
git-contributor-stats --out-dir reports --md --html

# Stricter matching
git-contributor-stats --similarity 0.95 --json
```

### Use Alias Configuration File
```bash
# Create .git-contributor-stats-aliases.json
git-contributor-stats --alias-file team-aliases.json --md report.md
```

### Alias File Format
```json
{
  "map": {
    "john@old-company.com": "john.smith@current.com",
    "jsmith@gmail.com": "john.smith@current.com"
  },
  "groups": [
    ["alice@work.com", "alice@personal.com", "Alice Developer"],
    ["bob@company.com", "bob.smith@gmail.com"]
  ],
  "canonical": {
    "john.smith@current.com": {
      "name": "John Smith",
      "email": "john.smith@current.com"
    },
    "alice@work.com": {
      "name": "Alice Developer",
      "email": "alice@work.com"
    }
  }
}
```

### Programmatic Identity Management
```javascript
import { getContributorStats } from 'git-contributor-stats/stats';

const stats = await getContributorStats({
  repo: '.',
  aliasConfig: {
    groups: [
      ['jane@old-email.com', 'jane@new-email.com', 'Jane Doe'],
      ['john@work.com', 'john@personal.com']
    ],
    canonical: {
      'jane@new-email.com': {
        name: 'Jane Doe',
        email: 'jane@new-email.com'
      }
    }
  },
  similarity: 0.9
});
```

**Benefits:**
- ✅ Accurate contributor counts
- ✅ Clean reports (no duplicates)
- ✅ Proper credit attribution
- ✅ Historical consistency

---

## 🚀 Bonus: CI/CD Integration (Automation)

**What it does:** Automatically generate reports on every push or weekly schedule

**Why you need it:** Keep stakeholders informed without manual work

### Generate GitHub Actions Workflow
```bash
git-contributor-stats --generate-workflow
```

### Custom CI/CD Script
```bash
#!/bin/bash
# .github/workflows/weekly-stats.yml or scripts/generate-stats.sh

git-contributor-stats \
  --since 7.days \
  --out-dir artifacts/stats \
  --md artifacts/stats/weekly-report.md \
  --html artifacts/stats/dashboard.html \
  --charts \
  --no-count-lines

# Upload to S3, share via Slack, etc.
echo "✅ Stats generated at artifacts/stats/"
```

---

## 🎯 Quick Decision Matrix

| Your Goal | Use Case | Command |
|-----------|----------|---------|
| **Check team health** | #1 - Health Check | `git-contributor-stats --since 90.days --json` |
| **Create stakeholder report** | #2 - Quarterly Reports | `git-contributor-stats --since 90.days --out-dir reports --md --html --charts` |
| **Analyze a release** | #3 - Release Analysis | `git-contributor-stats --branch v1.0..v2.0 --json` |
| **Understand team patterns** | #4 - Activity Heatmap | `git-contributor-stats --since 6.months --charts` |
| **Clean up duplicate contributors** | #5 - Identity Management | `git-contributor-stats --alias-file aliases.json` |
| **Automate reporting** | Bonus - CI/CD | `git-contributor-stats --generate-workflow` |

---

## 💡 Pro Tips

1. **Start Simple:** Begin with `git-contributor-stats --since 30.days` to see what you get
2. **Use `--no-count-lines`:** For large repos, skip line counting for 5x faster results
3. **Filter by Path:** Analyze specific directories: `git-contributor-stats src/backend/`
4. **JSON Output:** Save raw data for custom analysis: `--json > stats.json`
5. **Schedule Reports:** Set up weekly/monthly automated reports via GitHub Actions

---

## 📦 Installation Reminder

```bash
# Global CLI
npm install -g git-contributor-stats

# Library for scripts
npm install git-contributor-stats
```

---

## 🎬 Get Started Now

Pick the use case that matches your need and run the command in your repository!

**Most Popular Starting Point:**
```bash
cd your-repo
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

This generates a complete analysis with all visualizations in the `reports/` directory.

