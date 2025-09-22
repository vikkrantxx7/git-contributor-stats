#!/usr/bin/env bash
set -euo pipefail

# Split a large refactor into logical commits following Conventional Commits.
# Usage:
#   scripts/split-refactor.sh            # commit current working changes in logical chunks
#   scripts/split-refactor.sh --soft-reset-last  # soft-reset the last commit, then split it
#
# Notes:
# - This script is idempotent per step: it only commits when there are staged changes.
# - It skips a commit if the matching files aren't present or nothing changed.
# - It assumes you are on the intended branch (e.g., main) and have backups/remote.

root_dir="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$root_dir"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not inside a Git repository" >&2
  exit 1
fi

if [[ "${1:-}" == "--soft-reset-last" ]]; then
  echo "> Soft-resetting last commit into index and working tree ..."
  git reset --soft HEAD~1 || true
  git restore --staged . || true
fi

commit_if_staged() {
  local msg=$1
  if ! git diff --cached --quiet; then
    git commit -m "$msg"
  else
    echo "(skip) no staged changes for: $msg"
  fi
}

# 1) Repository scaffolding and hygiene
{
  git add .gitignore .npmrc .nvmrc LICENSE README.md 2>/dev/null || true
  # If package.json contains only scaffold-related changes, you may stage hunks manually:
  # git add -p package.json
  commit_if_staged "chore(scaffold): add repo config, metadata and docs (Node 18+, ESM-only)"
}

# 2) Build system — ESM-only + Vite + packaging
{
  git add vite.config.mjs 2>/dev/null || true
  # Stage build-related changes in package.json (exports/files/scripts/build/engines/devDeps)
  git add package.json 2>/dev/null || true
  commit_if_staged "build(vite)!: add ESM-only library build targeting Node 18 and update packaging\n\n- output dist/index.mjs (ESM-only), target node18\n- update exports to ESM-only and publishing metadata\n- BREAKING CHANGE: package is now ESM-only and requires Node 18+"
}

# 3) Utilities module
{
  git add src/utils/dates.js src/utils/files.js src/utils/formatting.js 2>/dev/null || true
  commit_if_staged "feat(utils): add dates, files, and formatting utilities"
}

# 4) Git helpers module
{
  git add src/git/utils.js src/git/parser.js 2>/dev/null || true
  commit_if_staged "feat(git): add git command runner and log parser"
}

# 5) Analytics engine
{
  git add src/analytics/aggregator.js src/analytics/analyzer.js src/analytics/aliases.js 2>/dev/null || true
  commit_if_staged "feat(analytics): add aggregator, analyzer, and alias resolution"
}

# 6) Charts — SVG + renderer (no top-level await, lazy-load libs)
{
  git add src/charts/svg.js src/charts/renderer.js 2>/dev/null || true
  commit_if_staged "feat(charts): add SVG chart generation and renderer (lazy-load ChartJS libs)"
}

# 7) Reports
{
  git add src/reports/markdown.js src/reports/html.js src/reports/csv.js 2>/dev/null || true
  commit_if_staged "feat(reports): add Markdown, HTML, and CSV generators"
}

# 8) CLI — modular entry
{
  git add src/cli/index.js src/cli/options.js cli.js 2>/dev/null || true
  commit_if_staged "feat(cli): add modular CLI entry and options wiring"
}

# 9) Runtime refactor — top-level CLI
{
  git add index.js 2>/dev/null || true
  commit_if_staged "refactor(cli): wire top-level CLI to modular internals; lazy-load chart libs; keep SVG fallbacks"
}

# 10) Smoke tests — overhaul
{
  git add scripts/smoke.js 2>/dev/null || true
  commit_if_staged "test(smoke): overhaul suite (16 tests) covering CLI outputs, filters, reports, and charts"
}

# 11) Ignore generated artifacts (ensure final state)
{
  git add .gitignore 2>/dev/null || true
  commit_if_staged "chore(gitignore): ignore reports*/ charts/ test-charts/ tmp*/ and logs"
}

# 12) Targeted fixes (await/dynamic import removal)
{
  git add src/analytics/aliases.js src/charts/renderer.js 2>/dev/null || true
  commit_if_staged "fix: remove invalid await/dynamic import; use static stringSimilarity and no TLA in charts"
}

# Show result
echo
echo "> Commit history (last 12):"
(git --no-pager log --oneline -n 12 || true)

