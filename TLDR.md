# 🎯 TL;DR - Why Use git-contributor-stats?

## The Problem
You have questions about your Git repository:
- Who are my most active contributors? 👥
- Are we at risk if someone leaves? ⚠️
- What happened in the last release? 📦
- When is my team most productive? ⏰
- How do I create reports for stakeholders? 📊

## The Solution
One command. Five powerful use cases.

---

## 5 Critical Use Cases (Try These First!)

### 1. 🏥 Repository Health Check
**One-liner:**
```bash
git-contributor-stats --since 90.days --json | jq '.busFactor'
```

**What you get:**
- List of files with single owners (bus factor risk)
- Active developer count
- Knowledge concentration analysis

**Why:** Identify if your team has knowledge silos before it's too late.

---

### 2. 📊 Executive Dashboard
**One-liner:**
```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

**What you get:**
- HTML dashboard (beautiful, shareable)
- Markdown report (for wikis)
- CSV export (for spreadsheets)
- Visual charts (commits, contributions, activity heatmap)

**Why:** Impress stakeholders with professional reports in seconds.

---

### 3. 🚀 Release Analysis
**One-liner:**
```bash
git-contributor-stats --branch v1.0.0..v2.0.0 --json > release-analysis.json
```

**What you get:**
- Contributors per release
- Commit counts and line changes
- Team effort distribution

**Why:** Perfect for release notes, sprint reviews, and giving credit where it's due.

---

### 4. 🎨 Team Activity Patterns
**One-liner:**
```bash
git-contributor-stats --since 6.months --charts
```

**What you get:**
- 7×24 activity heatmap (day × hour)
- Monthly commit trends
- Peak activity times

**Why:** Optimize meeting times, understand timezone coverage, spot burnout patterns.

---

### 5. 👥 Clean Contributor Data
**One-liner:**
```bash
git-contributor-stats --alias-file team-aliases.json --md report.md
```

**What you get:**
- Merged identities (work email + personal email = 1 person)
- Accurate contributor counts
- Clean, professional reports

**Why:** Stop counting "john@work.com" and "john@gmail.com" as two people.

---

## 🎬 Try It Now (30 seconds)

```bash
# 1. Install
npm install -g git-contributor-stats

# 2. Go to any Git repo
cd your-repo

# 3. Generate your first report
git-contributor-stats --since 90.days --out-dir reports --md --html --charts

# 4. Open the HTML dashboard
open reports/report.html
```

**That's it!** You now have:
- ✅ Professional HTML dashboard
- ✅ Markdown report for your wiki
- ✅ CSV for data analysis
- ✅ Visual charts (SVG/PNG)

---

## 📈 Real-World Impact

| Before | After |
|--------|-------|
| Manual git log parsing (2 hours) | One command (30 seconds) |
| Excel spreadsheet gymnastics | Professional HTML dashboard |
| Guessing team health | Data-driven insights |
| Missing contributors in release notes | Complete attribution |
| No visibility into work patterns | Clear activity analysis |

---

## 🔥 Most Popular Commands

### For Developers
```bash
git-contributor-stats --since 30.days --format table
```

### For Team Leads
```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

### For Product Managers
```bash
git-contributor-stats --branch v1.0..v2.0 --md release-contributors.md
```

### For Engineering Managers
```bash
git-contributor-stats --since 6.months --json > team-health.json
```

---

## 💡 Pro Tips

1. **Start with 90 days**: `--since 90.days` gives you a good quarterly view
2. **Use `--no-count-lines`**: 5x faster on large repos
3. **Filter by path**: Analyze specific teams: `git-contributor-stats src/backend/`
4. **Automate it**: Use `--generate-workflow` for weekly reports
5. **Clean your data**: Create an alias file for accurate results

---

## 🎯 Pick Your Path

### Path 1: Quick Exploration (2 minutes)
```bash
git-contributor-stats --since 90.days
```

### Path 2: Full Analysis (5 minutes)
```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

### Path 3: Deep Dive (10 minutes)
```bash
# Create alias file
# Review CRITICAL-USE-CASES.md
# Generate custom reports
# Set up automation
```

---

## 📚 Next Steps

1. ✅ Install: `npm install -g git-contributor-stats`
2. ✅ Try the basic command
3. ✅ Read [CRITICAL-USE-CASES.md](./CRITICAL-USE-CASES.md) for detailed examples
4. ✅ Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for command cheat sheet
5. ✅ Read full [README.md](./README.md) for all options

---

## ❓ FAQ

**Q: Do I need to install anything?**
A: Just Node.js 18+ and this package.

**Q: Will it modify my repository?**
A: No! It only reads Git history. 100% safe.

**Q: How long does it take?**
A: Small repos: <1 second. Large repos: <30 seconds (use `--no-count-lines` for speed).

**Q: Can I use this in CI/CD?**
A: Yes! Use `--generate-workflow` to create a GitHub Actions workflow.

**Q: Does it work with all Git hosting?**
A: Yes! Works with GitHub, GitLab, Bitbucket, or any Git repository.

**Q: Is it free?**
A: 100% free and open source (MIT license).

---

## 🌟 The Bottom Line

**You have a Git repo.**
**You need insights.**
**One command does it all.**

```bash
git-contributor-stats --since 90.days --out-dir reports --md --html --charts
```

**Try it now. You'll wonder how you lived without it.**

---

**Ready to dive deeper?**
- 📖 [Full Documentation](./README.md)
- 🎯 [Critical Use Cases](./CRITICAL-USE-CASES.md)
- ⚡ [Quick Reference](./QUICK-REFERENCE.md)
- 🔧 [API Documentation](./README.md#programmatic-api)

