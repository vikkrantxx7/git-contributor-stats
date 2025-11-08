# Changesets & Release Workflow

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation, combined with conventional commits for clear commit history.

> 🔐 **Security:** This project publishes with **NPM provenance** enabled, providing cryptographic proof of build authenticity and supply chain transparency. See [GitHub Setup Guide](../../.github/SETUP.md) for details.

## 🚀 Quick Start

### Adding a Changeset (for new changes)

When you make changes that should be included in the next release:

```bash
npx changeset
```

This will:
1. Ask you to select the bump type (patch/minor/major)
2. Prompt you to write a summary of the changes
3. Create a `.changeset/*.md` file with your changes

### For Pull Requests

Every PR should include a changeset **unless**:
- It's docs-only changes (add `[skip-changeset]` to PR title or `no-changeset` label)
- It's internal tooling/config changes

## 📋 Workflow Overview

### 1. Development Phase

```bash
# Make your changes
git checkout -b feat/awesome-feature

# Commit using conventional commits
git commit -m "feat: add awesome feature"

# Add a changeset
npx changeset
# Select: minor (for a new feature)
# Summary: "add awesome feature with X, Y, Z capabilities"

# Push to GitHub
git push origin feat/awesome-feature
```

### 2. Automated Release Process

When you merge to `main`:

1. **GitHub Action runs** (`.github/workflows/release.yml`)
2. **Creates/Updates a "Version Packages" PR** that:
   - Bumps version in `package.json`
   - Generates/updates `CHANGELOG.md`
   - Consumes all changeset files
3. **When you merge the Version Packages PR**:
   - Publishes to npm automatically
   - Creates a GitHub release
   - Tags the release

### 3. Manual Release (Local)

If you prefer manual releases:

```bash
# 1. Bump version and update changelog
npm run version

# 2. Commit the version bump
git add .
git commit -m "chore(release): version packages"

# 3. Build and publish
npm run release

# 4. Push changes and tags
git push && git push --tags
```

## 🎯 Changeset Types

### Patch (0.0.X) - Bug fixes
```bash
npx changeset
# Select: patch
# Example: "fix: resolve timezone parsing issue"
```

**Use for:**
- Bug fixes
- Small improvements
- Documentation fixes
- Dependency updates (non-breaking)

### Minor (0.X.0) - New features
```bash
npx changeset
# Select: minor
# Example: "feat: add support for custom date ranges"
```

**Use for:**
- New features
- New options/flags
- Backward-compatible API additions
- New export modules

### Major (X.0.0) - Breaking changes
```bash
npx changeset
# Select: major
# Example: "feat!: change statistics API response format"
```

**Use for:**
- Breaking API changes
- Removed features
- Major refactors that change behavior
- Node version requirement changes

## 📝 Changeset Examples

### Example 1: Bug Fix
```bash
npx changeset
```
```
What kind of change is this? patch
Summary: fix timezone parsing in date utilities
```

Creates `.changeset/cool-pandas-dance.md`:
```markdown
---
"git-contributor-stats": patch
---

fix timezone parsing in date utilities
```

### Example 2: New Feature
```bash
npx changeset
```
```
What kind of change is this? minor
Summary: add XML output format support
```

Creates `.changeset/happy-turtles-fly.md`:
```markdown
---
"git-contributor-stats": minor
---

add XML output format support

- new `--xml` flag for CLI
- new `generateXmlReport()` API function
- XML schema validation
```

### Example 3: Breaking Change
```bash
npx changeset
```
```
What kind of change is this? major
Summary: change statistics API to return structured object
```

Creates `.changeset/angry-dogs-jump.md`:
```markdown
---
"git-contributor-stats": major
---

change statistics API to return structured object

BREAKING CHANGE: The `getStats()` function now returns an object with nested
properties instead of a flat structure. Update your code:
```
Before:
```js
const { totalCommits, totalLines } = await getStats();
```

After:
```js
const { commits: { total }, lines: { total } } = await getStats();
```

## 🔄 Handling Old Commits

If you need to create releases for old commits that don't have changesets:

### Option 1: Manual Changeset Files

Create changeset files manually based on commit history:

```bash
# Look at recent commits
git log --oneline --since="2024-01-01"

# Create changeset for a bug fix commit
cat > .changeset/fix-old-bug.md << EOF
---
"git-contributor-stats": patch
---

fix: resolve memory leak in chart generation (from commit abc123)
EOF

# Create changeset for a feature commit
cat > .changeset/add-old-feature.md << EOF
---
"git-contributor-stats": minor
---

feat: add CSV export functionality (from commit def456)
EOF
```

### Option 2: Batch Multiple Changes

Create a single changeset summarizing multiple old changes:

```bash
cat > .changeset/retroactive-changes.md << EOF
---
"git-contributor-stats": minor
---

retroactive changelog for v1.5.0 - v2.0.0

Features:
- add modular exports for tree-shaking
- add charts feature module
- add reports feature module

Fixes:
- fix memory leak in chart generation
- fix timezone handling in date utilities

Breaking Changes:
- refactor to ESM-only (drop CommonJS support)
EOF
```

### Option 3: Manual CHANGELOG Entry

For very old changes, manually edit `CHANGELOG.md`:

```markdown
## 2.0.0 - 2024-11-08

### Major Changes

- Refactored to ESM-only, dropped CommonJS support
- Modular exports with tree-shaking support

### Minor Changes

- Added chart generation features
- Added report generation features

### Patch Changes

- Fixed memory leak in chart generation
- Fixed timezone handling
```

Then bump the version manually:

```bash
# Update package.json version
npm version 2.0.0 --no-git-tag-version

# Commit
git add .
git commit -m "chore(release): v2.0.0"
```

## 🤖 GitHub Workflows

### Release Workflow (`.github/workflows/release.yml`)

Triggers on every push to `main`:
- Checks for changesets
- Creates/updates "Version Packages" PR
- Publishes to npm when Version PR is merged

### Changeset Check (`.github/workflows/changeset-check.yml`)

Runs on every PR:
- Validates that a changeset exists
- Can be skipped with `no-changeset` label or `[skip-changeset]` in title

## 📦 Available Scripts

```bash
# Add a new changeset
npm run changeset

# Check changeset status
npm run changeset:status

# Bump version and generate changelog (local)
npm run version

# Publish to npm (local)
npm run release
```

## 🎓 Best Practices

1. **One changeset per PR** (unless related changes)
2. **Write clear summaries** - they become your changelog
3. **Use conventional commit format** in changeset summaries
4. **Include breaking changes** in the description when using major
5. **Don't commit changeset files for docs-only changes**
6. **Batch multiple fixes** into one release if needed

## 🔗 Resources

- [Changesets Documentation](https://github.com/changesets/changesets/tree/main/docs)
- [Conventional Commits](./COMMIT-GUIDELINES.md)
- [Semantic Versioning](https://semver.org/)

## ❓ FAQ

**Q: Do I need a changeset for every commit?**
A: No, only for changes that should appear in the changelog (features, fixes, breaking changes).

**Q: Can I combine multiple changesets?**
A: Yes! Multiple changesets are automatically combined when running `changeset version`.

**Q: What if I forget to add a changeset?**
A: The PR check will fail. You can add it later before merging.

**Q: Can I edit a changeset after creating it?**
A: Yes! Changeset files are just markdown files in `.changeset/`. Edit them directly.

**Q: How do I skip the changeset check?**
A: Add `[skip-changeset]` to PR title or add `no-changeset` label.

