#!/usr/bin/env node

/*
 * git-contributor-stats
 * Advanced CLI to compute contributor and repository statistics from a Git repository.
 *
 * Structure:
 *   - CLI Setup & Entry
 *   - Git Utilities
 *   - Data Aggregation & Analytics
 *   - Report Generation (Markdown, HTML, SVG)
 *   - File I/O Utilities
 *   - Main Execution
 *
 * TODO: Refactor into modules: cli.js, gitUtils.js, analytics.js, report/markdown.js, report/html.js, report/svg.js, fileUtils.js
 */

// =====================
// Imports & Dependencies (ESM)
// =====================
import { spawnSync } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import process from 'process';
import stringSimilarity from 'string-similarity-js';
import { fileURLToPath } from 'url';

// =====================
// Utility: Read package.json safely
// =====================
function safeReadPackageJson() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, { encoding: 'utf8' }));
  } catch {
    return {};
  }
}

// =====================
// Utility: Parse date input (relative or absolute)
// =====================
/**
 * @param {string} input
 * @returns {string|undefined}
 */
function parseDateInput(input) {
  if (!input) return undefined;
  const rel = /^([0-9]+)\.(day|days|week|weeks|month|months|year|years)$/i.exec(input.trim());
  if (rel) {
    const qty = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const now = new Date();
    const d = new Date(now);
    const mult = unit.startsWith('day')
      ? 1
      : unit.startsWith('week')
        ? 7
        : unit.startsWith('month')
          ? 30
          : 365;
    d.setDate(now.getDate() - qty * mult);
    return d.toISOString();
  }
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString();
  return input;
}

// =====================
// Git Utilities
// =====================
/**
 * Run a git command in the given repo.
 * @param {string} repoPath
 * @param {string[]} args
 * @returns {{ok: boolean, stdout?: string, error?: string, code?: number}}
 */
function runGit(repoPath, args) {
  const res = spawnSync('git', args, {
    cwd: repoPath,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024
  });
  if (res.error) {
    const msg =
      res.error && res.error.code === 'ENOENT'
        ? 'Git is not installed or not in PATH.'
        : `Failed to execute git: ${res.error.message}`;
    return { ok: false, error: msg, code: res.status ?? 2 };
  }
  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    if (
      /does not have any commits yet/i.test(stderr) ||
      /bad default revision 'HEAD'/i.test(stderr) ||
      /ambiguous argument 'HEAD'/i.test(stderr)
    ) {
      return { ok: true, stdout: '' };
    }
    return {
      ok: false,
      error: (stderr || res.stdout || 'Unknown git error').trim(),
      code: res.status || 2
    };
  }
  return { ok: true, stdout: res.stdout };
}

/**
 * Check if a directory is a git repo.
 * @param {string} repoPath
 * @returns {boolean}
 */
function isGitRepo(repoPath) {
  try {
    const gitFolder = path.join(repoPath, '.git');
    return fs.existsSync(gitFolder);
  } catch {
    return false;
  }
}

/**
 * Build git log arguments from options.
 * @param {object} opts
 * @returns {string[]}
 */
function buildGitLogArgs(opts) {
  const { branch, since, until, author, includeMerges, paths } = opts;
  const args = ['log', '--numstat', '--date=iso-strict', '--no-color'];
  args.push('--pretty=format:---%n%H%x00%an%x00%ae%x00%ad');
  if (!includeMerges) args.push('--no-merges');
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  if (author) args.push(`--author=${author}`);
  if (branch) args.push(branch);
  args.push('--');
  if (paths && paths.length) for (const p of paths) args.push(p);
  return args;
}

/**
 * Parse git log output into commit objects.
 * @param {string} stdout
 * @returns {Array}
 */
function parseGitLog(stdout) {
  const lines = stdout.split(/\r?\n/);
  const commits = [];
  let current = null;
  let expectHeader = false;
  for (const line of lines) {
    if (line === '---') {
      if (current) commits.push(current);
      current = null;
      expectHeader = true;
      continue;
    }
    if (expectHeader) {
      if (!line) continue;
      const [hash, name, email, date] = line.split('\x00');
      if (!hash) continue;
      current = {
        hash,
        authorName: name || '',
        authorEmail: email || '',
        date: date ? new Date(date) : undefined,
        additions: 0,
        deletions: 0,
        filesChanged: 0,
        files: []
      };
      expectHeader = false;
      continue;
    }
    if (!current) continue;
    if (!line) continue;
    const parts = line.split(/\t+/);
    if (parts.length >= 3) {
      const a = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const d = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      const filename = parts.slice(2).join('\t');
      current.additions += a;
      current.deletions += d;
      current.filesChanged += 1;
      current.files.push({ added: a, deleted: d, filename });
    }
  }
  if (current) commits.push(current);
  return commits;
}

// =====================
// Data Aggregation & Analytics
// =====================
function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function printTable(contributors, meta, groupBy) {
  const headers = [
    '#',
    groupBy === 'name' ? 'Author' : 'Email',
    'Commits',
    '+Additions',
    '-Deletions',
    '±Changes'
  ];
  const rows = [];
  contributors.forEach((c, idx) => {
    const label = groupBy === 'name' ? c.name || '(unknown)' : c.key || '(unknown)';
    rows.push([
      String(idx + 1),
      label,
      formatNumber(c.commits),
      formatNumber(c.additions),
      formatNumber(c.deletions),
      formatNumber(c.changes)
    ]);
  });
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ? String(r[i]).length : 0)))
  );
  const headerLine = headers
    .map((h, i) => (i === 1 ? String(h).padEnd(colWidths[i]) : String(h).padStart(colWidths[i])))
    .join('  ');
  const sepLine = colWidths.map((w) => '-'.repeat(w)).join('  ');
  console.log(headerLine);
  console.log(sepLine);
  rows.forEach((r) => {
    const line = r
      .map((cell, i) =>
        i === 1 ? String(cell).padEnd(colWidths[i]) : String(cell).padStart(colWidths[i])
      )
      .join('  ');
    console.log(line);
  });
  console.log();
  console.log(
    `Contributors: ${formatNumber(meta.contributors)} | Commits: ${formatNumber(meta.commits)} | Changes: ${formatNumber(meta.additions + meta.deletions)} (+${formatNumber(meta.additions)} / -${formatNumber(meta.deletions)})`
  );
  if (meta.firstCommitDate || meta.lastCommitDate) {
    console.log(
      `Range: ${meta.firstCommitDate ? new Date(meta.firstCommitDate).toISOString().slice(0, 10) : '—'} → ${meta.lastCommitDate ? new Date(meta.lastCommitDate).toISOString().slice(0, 10) : '—'}`
    );
  }
}

function printCSV(contributors, groupBy) {
  const header = [
    'rank',
    groupBy === 'name' ? 'author' : 'email',
    'commits',
    'additions',
    'deletions',
    'changes'
  ];
  console.log(header.join(','));
  contributors.forEach((c, i) => {
    const label = groupBy === 'name' ? c.name || '' : c.key || '';
    console.log([i + 1, label, c.commits, c.additions, c.deletions, c.changes].join(','));
  });
}

function aggregateBasic(commits, groupBy) {
  const map = new Map();
  for (const c of commits) {
    const key =
      groupBy === 'name'
        ? (c.authorName || '').trim() || '(unknown)'
        : (c.authorEmail || '').trim().toLowerCase() || '(unknown)';
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: c.authorName || '',
        emails: new Set(),
        commits: 0,
        additions: 0,
        deletions: 0,
        firstCommitDate: c.date || undefined,
        lastCommitDate: c.date || undefined
      });
    }
    const agg = map.get(key);
    agg.name = agg.name || c.authorName || '';
    if (c.authorEmail) agg.emails.add(c.authorEmail.toLowerCase());
    agg.commits += 1;
    agg.additions += c.additions || 0;
    agg.deletions += c.deletions || 0;
    if (c.date) {
      if (!agg.firstCommitDate || c.date < agg.firstCommitDate) agg.firstCommitDate = c.date;
      if (!agg.lastCommitDate || c.date > agg.lastCommitDate) agg.lastCommitDate = c.date;
    }
  }
  return Array.from(map.values()).map((v) => ({
    key: v.key,
    name: v.name || (groupBy === 'name' ? v.key : ''),
    emails: Array.from(v.emails),
    commits: v.commits,
    additions: v.additions,
    deletions: v.deletions,
    changes: v.additions + v.deletions,
    firstCommitDate: v.firstCommitDate ? v.firstCommitDate.toISOString() : undefined,
    lastCommitDate: v.lastCommitDate ? v.lastCommitDate.toISOString() : undefined
  }));
}

function pickSortMetric(by) {
  switch ((by || '').toLowerCase()) {
    case 'commits':
      return (a, b) => b.commits - a.commits || b.changes - a.changes;
    case 'additions':
    case 'adds':
    case 'lines-added':
      return (a, b) => b.additions - a.additions || b.commits - a.commits;
    case 'deletions':
    case 'dels':
    case 'lines-deleted':
      return (a, b) => b.deletions - a.deletions || b.commits - a.commits;
    case 'changes':
    case 'delta':
    default:
      return (a, b) => b.changes - a.changes || b.commits - a.commits;
  }
}

// Similarity utils
function levenshteinDistance(a, b) {
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarityScore(a, b) {
  try {
    if (typeof stringSimilarity.compareTwoStrings === 'function')
      return stringSimilarity.compareTwoStrings(a, b);
  } catch (_) {
    /* fallback below */
  }
  const maxLen = Math.max(a.length, b.length) || 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

// Advanced analytics
function normalizeName(name) {
  return String(name || '')
    .replace(/@.*$/, '')
    .replace(/^svc[_-]/i, '')
    .replace(/[^a-zA-Z0-9\s._-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isoWeekKey(date) {
  const d = new Date(date);
  const target = new Date(d.valueOf());
  const dayNumber = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target - firstThursday) / 86400000;
  const week = 1 + Math.round(diff / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function mergeSimilarContributors(contribMap, threshold) {
  const keys = Object.keys(contribMap);
  const merged = {};
  for (const k of keys) {
    const norm = k;
    let found = null;
    for (const mk of Object.keys(merged)) {
      const sim = similarityScore(norm, mk);
      if (sim >= threshold) {
        found = mk;
        break;
      }
    }
    if (found) {
      const target = merged[found];
      const src = contribMap[k];
      target.commits += src.commits;
      target.added += src.added;
      target.deleted += src.deleted;
      for (const [fname, info] of Object.entries(src.files || {})) {
        if (!target.files[fname]) target.files[fname] = { changes: 0, added: 0, deleted: 0 };
        target.files[fname].changes += info.changes;
        target.files[fname].added += info.added;
        target.files[fname].deleted += info.deleted;
      }
    } else {
      const src = contribMap[k];
      merged[norm] = {
        normalized: norm,
        name: src.name,
        email: src.email,
        commits: src.commits,
        added: src.added,
        deleted: src.deleted,
        files: { ...src.files }
      };
    }
  }
  return merged;
}

function tryLoadJSON(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (_) {
    return null;
  }
}

function buildAliasResolver(config) {
  if (!config) return { resolve: null, canonicalDetails: new Map() };
  let mapEntries = [];
  let groups = [];
  const canonicalDetails = new Map();

  // Supported shapes:
  // - Object as map: { alias: canonical, ... }
  // - { map: {...}, groups: [...], canonical: { canonicalKey: {name,email} } }
  // - Array of arrays: [ [alias1, alias2, canonical], ... ]
  if (Array.isArray(config)) {
    groups = config;
  } else if (config && typeof config === 'object') {
    if (Array.isArray(config.groups)) groups = config.groups;
    if (config.map && typeof config.map === 'object') mapEntries = Object.entries(config.map);
    const flatMapCandidates = Object.keys(config).filter(
      (k) => k !== 'groups' && k !== 'map' && k !== 'canonical'
    );
    if (mapEntries.length === 0 && flatMapCandidates.length) {
      mapEntries = Object.entries(config).filter(([k]) => k !== 'groups' && k !== 'canonical');
    }
    if (config.canonical && typeof config.canonical === 'object') {
      for (const [canonKey, info] of Object.entries(config.canonical)) {
        const normKey = normalizeName(canonKey);
        canonicalDetails.set(normKey, {
          name: (info && info.name) || undefined,
          email: (info && info.email) || undefined
        });
      }
    }
  }

  const aliasMap = new Map(); // normalized alias -> canonical normalized
  const regexList = []; // { regex, canonical }

  // Process map entries
  for (const [alias, canonical] of mapEntries) {
    if (typeof alias === 'string' && alias.startsWith('/') && alias.lastIndexOf('/') > 0) {
      const lastSlash = alias.lastIndexOf('/');
      const pattern = alias.slice(1, lastSlash);
      const flags = alias.slice(lastSlash + 1);
      try {
        const re = new RegExp(pattern, flags);
        regexList.push({ regex: re, canonical: normalizeName(canonical) });
      } catch (_) {
        // ignore invalid regex
      }
    } else {
      aliasMap.set(normalizeName(alias), normalizeName(canonical));
    }
  }

  // Process groups: each item in the group maps to the canonical (prefer first item that looks like email, otherwise first item)
  for (const g of groups) {
    if (!Array.isArray(g) || g.length === 0) continue;
    const canonicalCandidate = g.find((s) => typeof s === 'string' && s.includes('@')) || g[0];
    const canonicalNorm = normalizeName(String(canonicalCandidate));
    for (const item of g) {
      if (typeof item !== 'string') continue;
      if (item.startsWith('/') && item.lastIndexOf('/') > 0) {
        const lastSlash = item.lastIndexOf('/');
        const pattern = item.slice(1, lastSlash);
        const flags = item.slice(lastSlash + 1);
        try {
          regexList.push({ regex: new RegExp(pattern, flags), canonical: canonicalNorm });
        } catch (_) {}
      } else {
        aliasMap.set(normalizeName(item), canonicalNorm);
      }
    }
  }

  function resolve(baseNorm, name, email) {
    if (aliasMap.has(baseNorm)) return aliasMap.get(baseNorm);
    const rawName = name || '';
    const rawEmail = email || '';
    for (const { regex, canonical } of regexList) {
      try {
        if (regex.test(rawName) || regex.test(rawEmail)) return canonical;
      } catch (_) {}
    }
    return baseNorm;
  }

  return { resolve, canonicalDetails };
}

function analyze(commits, similarityThreshold, aliasResolver, canonicalDetails) {
  const contribMap = {}; // normalized -> data
  const fileToContribs = {}; // filename -> Set(normalized)
  let totalCommits = 0;

  const commitFrequencyMonthly = {};
  const commitFrequencyWeekly = {};
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

  for (const commit of commits) {
    totalCommits++;
    const name = commit.authorName || '';
    const email = commit.authorEmail || '';
    const baseNorm = normalizeName(name || email);
    const normalized = aliasResolver ? aliasResolver(baseNorm, name, email) : baseNorm;

    if (!contribMap[normalized]) {
      let displayName = name;
      let displayEmail = email;
      if (canonicalDetails && canonicalDetails.has(normalized)) {
        const info = canonicalDetails.get(normalized);
        displayName = info.name || displayName;
        displayEmail = info.email || displayEmail;
      }
      contribMap[normalized] = {
        name: displayName,
        email: displayEmail,
        commits: 0,
        added: 0,
        deleted: 0,
        files: {}
      };
    }
    const contrib = contribMap[normalized];
    contrib.commits += 1;

    const d = commit.date ? new Date(commit.date) : null;
    if (d) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      commitFrequencyMonthly[monthKey] = (commitFrequencyMonthly[monthKey] || 0) + 1;
      const weekKey = isoWeekKey(d);
      commitFrequencyWeekly[weekKey] = (commitFrequencyWeekly[weekKey] || 0) + 1;
      heatmap[d.getDay()][d.getHours()] += 1;
    }

    for (const f of commit.files || []) {
      const fname = f.filename;
      contrib.added += f.added;
      contrib.deleted += f.deleted;
      if (!contrib.files[fname]) contrib.files[fname] = { changes: 0, added: 0, deleted: 0 };
      contrib.files[fname].changes += f.added + f.deleted;
      contrib.files[fname].added += f.added;
      contrib.files[fname].deleted += f.deleted;

      if (!fileToContribs[fname]) fileToContribs[fname] = new Set();
      fileToContribs[fname].add(normalized);
    }
  }

  const merged = mergeSimilarContributors(contribMap, similarityThreshold);

  const topContributors = Object.values(merged)
    .map((c) => {
      const filesArr = Object.entries(c.files || {}).map(([filename, info]) => ({
        filename,
        changes: info.changes,
        added: info.added,
        deleted: info.deleted
      }));
      filesArr.sort((a, b) => b.changes - a.changes);
      return {
        name: c.name,
        email: c.email,
        commits: c.commits,
        added: c.added,
        deleted: c.deleted,
        net: c.added - c.deleted,
        changes: c.added + c.deleted,
        files: c.files,
        topFiles: filesArr
      };
    })
    .sort((a, b) => b.commits - a.commits);

  const filesSingleOwner = [];
  for (const [file, ownersSet] of Object.entries(fileToContribs)) {
    const owners = Array.from(ownersSet);
    if (owners.length === 1) {
      const owner = owners[0];
      const m = merged[owner] || contribMap[owner] || { name: owner };
      const changes =
        merged[owner] && merged[owner].files && merged[owner].files[file]
          ? merged[owner].files[file].changes
          : 0;
      filesSingleOwner.push({ file, owner: m.name || owner, changes });
    }
  }
  filesSingleOwner.sort((a, b) => b.changes - a.changes);

  // top stats across metrics
  function topBy(metric) {
    const arr = [...topContributors];
    arr.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    return arr[0] || null;
  }
  const topStats = {
    byCommits: topBy('commits'),
    byAdditions: topBy('added'),
    byDeletions: topBy('deleted'),
    byNet: topBy('net'),
    byChanges: topBy('changes')
  };

  return {
    contributors: merged,
    topContributors,
    totalCommits,
    commitFrequency: { monthly: commitFrequencyMonthly, weekly: commitFrequencyWeekly },
    heatmap,
    busFactor: { filesSingleOwner },
    topStats
  };
}

// =====================
// Report Generation (Markdown, HTML, SVG)
// =====================
function toCSV(rows, headers) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n'))
      return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [];
  if (headers) lines.push(headers.join(','));
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
}

function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseTopStatsMetrics(input) {
  const all = ['commits', 'additions', 'deletions', 'net', 'changes'];
  if (!input) return all;
  const set = new Set();
  for (const part of String(input)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)) {
    if (all.includes(part)) set.add(part);
  }
  return set.size ? Array.from(set) : all;
}

function formatTopStatsLines(ts, metrics) {
  const lines = [];
  const want = new Set(
    metrics && metrics.length ? metrics : ['commits', 'additions', 'deletions', 'net', 'changes']
  );

  function line(label, entry, metricKey) {
    if (!entry) return `${label}: —`;
    const metricVal =
      entry && typeof entry[metricKey] === 'number'
        ? entry[metricKey]
        : metricKey === 'net'
          ? (entry.added || 0) - (entry.deleted || 0)
          : undefined;
    const suffix = typeof metricVal === 'number' ? ` (${metricVal})` : '';
    const who = `${entry.name || '—'}${entry.email ? ` <${entry.email}>` : ''}`;
    return `${label}: ${who}${suffix}`;
  }

  if (want.has('commits')) lines.push(line('Most commits', ts.byCommits, 'commits'));
  if (want.has('additions')) lines.push(line('Most additions', ts.byAdditions, 'added'));
  if (want.has('deletions')) lines.push(line('Most deletions', ts.byDeletions, 'deleted'));
  if (want.has('net')) lines.push(line('Best net lines', ts.byNet, 'net'));
  if (want.has('changes')) lines.push(line('Most changes (±)', ts.byChanges, 'changes'));
  return lines;
}

function generateMarkdownReport(data, repoRoot, opts = {}) {
  const includeTopStats = opts.includeTopStats !== false;
  const topMetrics = Array.isArray(opts.topStatsMetrics)
    ? opts.topStatsMetrics
    : ['commits', 'additions', 'deletions', 'net', 'changes'];
  const lines = [];

  lines.push('# Git Contributor Stats');
  lines.push('');
  lines.push(`Repo: ${repoRoot}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total contributors: ${Object.keys(data.contributors).length}`);
  lines.push(`- Total commits: ${data.totalCommits}`);
  lines.push(`- Total lines (repo): ${data.totalLines}`);
  lines.push('');

  if (includeTopStats) {
    const ts = data.topStats || {};
    const want = new Set(topMetrics);
    function lineFor(label, entry, metricKey) {
      if (!entry) return `- ${label}: —`;
      const metricVal =
        entry && typeof entry[metricKey] === 'number'
          ? entry[metricKey]
          : metricKey === 'net'
            ? (entry.added || 0) - (entry.deleted || 0)
            : undefined;
      const suffix = typeof metricVal === 'number' ? ` (${metricVal})` : '';
      const who = `${entry.name || '—'}${entry.email ? ` <${entry.email}>` : ''}`;
      return `- ${label}: ${who}${suffix}`;
    }
    lines.push('## Top stats');
    lines.push('');
    if (want.has('commits')) lines.push(lineFor('Most commits', ts.byCommits, 'commits'));
    if (want.has('additions')) lines.push(lineFor('Most additions', ts.byAdditions, 'added'));
    if (want.has('deletions')) lines.push(lineFor('Most deletions', ts.byDeletions, 'deleted'));
    if (want.has('net')) lines.push(lineFor('Best net lines', ts.byNet, 'net'));
    if (want.has('changes')) lines.push(lineFor('Most changes (±)', ts.byChanges, 'changes'));
    lines.push('');
  }

  lines.push('## Top contributors (by commits)');
  lines.push('');
  lines.push('| Contributor | Commits | +Added | -Deleted | Net | Top files |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const c of data.topContributors) {
    const net = (c.added || 0) - (c.deleted || 0);
    const topFiles = (c.topFiles || [])
      .slice(0, 5)
      .map((f) => `${f.filename}(${f.changes})`)
      .join(', ');
    lines.push(
      `| ${c.name} <${c.email}> | ${c.commits || 0} | ${c.added || 0} | ${c.deleted || 0} | ${net} | ${topFiles} |`
    );
  }
  lines.push('');
  lines.push('## Bus factor / file ownership');
  lines.push('');
  lines.push(`- Files with single contributor: ${data.busFactor.filesSingleOwner.length}`);
  lines.push('');
  if (data.busFactor.filesSingleOwner.length > 0) {
    lines.push('| File | Owner | Changes |');
    lines.push('|---|---|---:|');
    for (const f of data.busFactor.filesSingleOwner.slice(0, 200))
      lines.push(`| ${f.file} | ${f.owner} | ${f.changes} |`);
  }
  lines.push('');
  lines.push('## Commit frequency (monthly)');
  lines.push('');
  lines.push('| Month | Commits |');
  lines.push('|---|---:|');
  for (const k of Object.keys(data.commitFrequency.monthly))
    lines.push(`| ${k} | ${data.commitFrequency.monthly[k]} |`);
  lines.push('');
  lines.push('## Heatmap (weekday x hour) - rows: Sunday(0) .. Saturday(6)');
  lines.push('');
  lines.push('```');
  lines.push(JSON.stringify(data.heatmap, null, 2));
  lines.push('```');
  return lines.join('\n');
}

function generateHTMLReport(data, repoRoot, opts = {}) {
  const includeTopStats = opts.includeTopStats !== false;
  const topMetrics = Array.isArray(opts.topStatsMetrics)
    ? opts.topStatsMetrics
    : ['commits', 'additions', 'deletions', 'net', 'changes'];

  const topStatsHTML = includeTopStats
    ? `
  <div>
    <h3>Top stats</h3>
    <ul class="topstats">
      ${(() => {
        const ts = data.topStats || {};
        const want = new Set(topMetrics);
        function item(label, entry, key) {
          if (!entry) return `<li>${label}: —</li>`;
          const metricVal =
            typeof entry[key] === 'number'
              ? entry[key]
              : key === 'net'
                ? (entry.added || 0) - (entry.deleted || 0)
                : '';
          const who = `${entry.name || '—'}${entry.email ? ` &lt;${entry.email}&gt;` : ''}`;
          const suffix = metricVal !== '' && metricVal !== undefined ? ` (${metricVal})` : '';
          return `<li>${label}: ${who}${suffix}</li>`;
        }
        const out = [];
        if (want.has('commits')) out.push(item('Most commits', ts.byCommits, 'commits'));
        if (want.has('additions')) out.push(item('Most additions', ts.byAdditions, 'added'));
        if (want.has('deletions')) out.push(item('Most deletions', ts.byDeletions, 'deleted'));
        if (want.has('net')) out.push(item('Best net lines', ts.byNet, 'net'));
        if (want.has('changes')) out.push(item('Most changes (±)', ts.byChanges, 'changes'));
        return out.join('\n');
      })()}
    </ul>
  </div>
  `
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Git Contributor Stats</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:20px}
    .chart{max-width:900px;margin-bottom:40px}
    table.heatmap{border-collapse:collapse}
    table.heatmap th, table.heatmap td{border:1px solid #eee}
    table.heatmap td{width:28px;height:24px;text-align:center;font-size:10px;padding:2px}
    ul.topstats{line-height:1.6}
  </style>
</head>
<body>
  <h1>Git Contributor Stats</h1>
  <p><strong>Repo:</strong> ${repoRoot}</p>
  <div>
    <h2>Summary</h2>
    <ul>
      <li>Total contributors: ${Object.keys(data.contributors).length}</li>
      <li>Total commits: ${data.totalCommits}</li>
      <li>Total lines (repo): ${data.totalLines}</li>
    </ul>
  </div>
  ${topStatsHTML}
  <div class="chart">
    <h3>Top contributors (by commits)</h3>
    <canvas id="barCommits"></canvas>
  </div>
  <div class="chart">
    <h3>Top contributors net lines (added - deleted)</h3>
    <canvas id="barNet"></canvas>
  </div>
  <div>
    <h3>Heatmap: weekday (rows Sun...Sat) × hour (cols 0..23)</h3>
    <table class="heatmap" id="heatmap"></table>
  </div>
  <div>
    <h3>Bus factor: files with single owner (top 200)</h3>
    <ol>
      ${data.busFactor.filesSingleOwner
        .slice(0, 200)
        .map((f) => `<li>${f.file} — ${f.owner} (${f.changes} changes)</li>`)
        .join('\n')}
    </ol>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    const topContributors = ${JSON.stringify(data.topContributors.slice(0, 30))};
    const heatmap = ${JSON.stringify(data.heatmap)};
    const ctx = document.getElementById('barCommits').getContext('2d');
    new Chart(ctx, { type: 'bar', data: { labels: topContributors.map(function(c){return c.name;}), datasets: [{ label: 'Commits', data: topContributors.map(function(c){return c.commits;}) }] }, options: { responsive:true, plugins:{legend:{display:false}} } });
    const ctx2 = document.getElementById('barNet').getContext('2d');
    new Chart(ctx2, { type: 'bar', data: { labels: topContributors.map(function(c){return c.name;}), datasets: [{ label: 'Net lines', data: topContributors.map(function(c){return c.added - c.deleted;}) }] }, options: { responsive:true, plugins:{legend:{display:false}} } });
    (function renderHeatmap(){
      const tbl = document.getElementById('heatmap');
      const max = heatmap.flat().reduce(function(a,b){return Math.max(a,b);},0);
      let html = '<tr><th></th>' + Array.from({length:24}).map(function(_,i){return '<th>'+i+'</th>';}).join('') + '</tr>';
      for (let day=0; day<7; day++){
        html += '<tr>' + '<th>' + day + '</th>';
        for (let h=0; h<24; h++){
          const val = heatmap[day][h] || 0;
          const intensity = max ? Math.round((val/max)*230) : 0;
          html += '<td style="background:rgb(' + (255-intensity) + ',255,' + (255-intensity) + ')">' + (val||'') + '</td>';
        }
        html += '</tr>';
      }
      tbl.innerHTML = html;
    })();
  </script>
</body>
</html>`;
}

// =====================
// PNG/SVG Chart Generation with chartjs-node-canvas
// =====================
let ChartJSNodeCanvas, registerables;
let chartLibInitialized = false;
async function ensureChartLib() {
  if (chartLibInitialized) return;
  chartLibInitialized = true;
  try {
    const modCanvas = await import('chartjs-node-canvas');
    ChartJSNodeCanvas = modCanvas.ChartJSNodeCanvas;
    const modChart = await import('chart.js');
    registerables = modChart.registerables;
  } catch (e) {
    ChartJSNodeCanvas = null;
    registerables = null;
    if (process.env.NODE_ENV !== 'production') {
      console.error('[warn] chartjs-node-canvas not available, using fallback SVG generation.');
    }
  }
}

function createCanvas(format, width, height) {
  const type = format === 'svg' ? 'svg' : 'png';
  return new ChartJSNodeCanvas({
    width,
    height,
    type,
    chartCallback: (ChartJS) => {
      try {
        if (ChartJS && registerables) ChartJS.register(...registerables);
      } catch (_) {}
    }
  });
}

async function renderBarChartImage(format, title, labels, values, filePath, options = {}) {
  const width = options.width || 900;
  const height = options.height || 400;

  try {
    ensureDir(path.dirname(filePath));
  } catch (dirErr) {
    console.error(`[error] Failed to create directory for chart: ${dirErr.message}`);
    return;
  }

  try {
    if (!labels || !values || labels.length === 0) {
      if (options.verbose) console.error(`[warn] No data for bar chart: ${title}`);
      labels = ['No data'];
      values = [0];
    }

    if (format !== 'svg') {
      await ensureChartLib();
    }

    // If ChartJSNodeCanvas is not available, go straight to fallback
    if (!ChartJSNodeCanvas || format === 'svg') {
      const svg = generateBarChartSVG(title, labels, values, { limit: options.limit || 25 });
      fs.writeFileSync(filePath, svg, 'utf8');
      return;
    }

    const canvas = createCanvas(format, width, height);
    const config = {
      type: 'bar',
      data: { labels, datasets: [{ label: title, data: values, backgroundColor: '#4e79a7' }] },
      options: {
        plugins: { title: { display: true, text: title }, legend: { display: false } },
        responsive: false,
        scales: {
          x: { ticks: { maxRotation: 45, minRotation: 45, autoSkip: false } },
          y: { beginAtZero: true }
        }
      }
    };
    const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';

    const buffer = await canvas.renderToBuffer(config, mime);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    if (format === 'svg') {
      try {
        const svg = generateBarChartSVG(title, labels, values, { limit: options.limit || 25 });
        fs.writeFileSync(filePath, svg, 'utf8');
      } catch (svgErr) {
        console.error(`[error] Failed to generate chart ${filePath}: ${svgErr.message}`);
      }
    } else {
      console.error(`[error] Failed to generate PNG chart ${filePath}: ${err.message}`);
    }
  }
}

async function renderHeatmapImage(format, heatmap, filePath, options = {}) {
  const width = options.width || 900;
  const height = options.height || 220;

  try {
    ensureDir(path.dirname(filePath));
  } catch (dirErr) {
    console.error(`[error] Failed to create directory for heatmap: ${dirErr.message}`);
    return;
  }

  try {
    if (!heatmap || !Array.isArray(heatmap) || heatmap.length === 0) {
      if (options.verbose) console.error(`[warn] Invalid heatmap data, creating empty heatmap`);
      heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    }

    if (format !== 'svg') {
      await ensureChartLib();
    }

    // If ChartJSNodeCanvas is not available, go straight to fallback
    if (!ChartJSNodeCanvas || format === 'svg') {
      const svg = generateHeatmapSVG(heatmap);
      fs.writeFileSync(filePath, svg, 'utf8');
      return;
    }

    const canvas = createCanvas(format, width, height);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const datasetForDay = (row, i) => ({
      label: days[i],
      data: row,
      backgroundColor: row.map((val) => {
        const alpha =
          val > 0 ? Math.min(1, 0.15 + 0.85 * (val / Math.max(1, Math.max(...row)))) : 0.05;
        return `rgba(78,121,167,${alpha})`;
      }),
      borderWidth: 0,
      type: 'bar',
      barPercentage: 1.0,
      categoryPercentage: 1.0
    });
    const data = { labels: hours, datasets: heatmap.map(datasetForDay) };
    const config = {
      type: 'bar',
      data,
      options: {
        indexAxis: 'y',
        plugins: {
          title: { display: true, text: 'Commit Activity Heatmap (weekday x hour)' },
          legend: { display: false }
        },
        responsive: false,
        scales: { x: { stacked: true, beginAtZero: true }, y: { stacked: true } }
      }
    };
    const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';

    const buffer = await canvas.renderToBuffer(config, mime);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    if (format === 'svg') {
      try {
        const svg = generateHeatmapSVG(heatmap);
        fs.writeFileSync(filePath, svg, 'utf8');
      } catch (svgErr) {
        console.error(`[error] Failed to generate heatmap ${filePath}: ${svgErr.message}`);
      }
    } else {
      console.error(`[error] Failed to generate PNG heatmap ${filePath}: ${err.message}`);
    }
  }
}

// =====================
// SVG Chart Generation Utilities (Pure SVG Fallbacks)
// =====================
function svgEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateBarChartSVG(title, labels, values, options = {}) {
  const maxBars = Math.min(labels.length, options.limit || 20);
  labels = labels.slice(0, maxBars);
  values = values.slice(0, maxBars);
  const width = options.width || 900;
  const height = options.height || 360;
  const margin = { top: 40, right: 20, bottom: 120, left: 80 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const maxVal = Math.max(1, ...values);
  const denom = Math.max(1, maxBars);
  const barW = (chartW / denom) * 0.7;
  const gap = (chartW / denom) * 0.3;

  const svg = [];
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  svg.push(
    `<style>text{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:12px} .title{font-size:16px;font-weight:700}</style>`
  );
  svg.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  svg.push(
    `<text class="title" x="${margin.left}" y="${margin.top - 12}">${svgEscape(title)}</text>`
  );

  // axes
  svg.push(
    `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartH}" stroke="#333"/>`
  );
  svg.push(
    `<line x1="${margin.left}" y1="${margin.top + chartH}" x2="${margin.left + chartW}" y2="${margin.top + chartH}" stroke="#333"/>`
  );

  // bars
  labels.forEach((lab, i) => {
    const x = margin.left + i * (barW + gap) + gap * 0.5;
    const h = Math.round((values[i] / maxVal) * chartH);
    const y = margin.top + (chartH - h);
    svg.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#4e79a7"/>`);
    svg.push(`<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle">${values[i]}</text>`);
    const labText = lab.length > 16 ? lab.slice(0, 16) + '…' : lab;
    svg.push(
      `<g transform="translate(${x + barW / 2},${margin.top + chartH + 4}) rotate(45)"><text text-anchor="start">${svgEscape(labText)}</text></g>`
    );
  });

  if (maxBars === 0) {
    svg.push(
      `<text x="${margin.left + chartW / 2}" y="${margin.top + chartH / 2}" text-anchor="middle" fill="#666">No data</text>`
    );
  }

  // y ticks
  for (let t = 0; t <= 4; t++) {
    const val = Math.round((t / 4) * maxVal);
    const yy = margin.top + chartH - Math.round((t / 4) * chartH);
    svg.push(
      `<line x1="${margin.left - 5}" y1="${yy}" x2="${margin.left}" y2="${yy}" stroke="#333"/>`
    );
    svg.push(`<text x="${margin.left - 8}" y="${yy + 4}" text-anchor="end">${val}</text>`);
  }
  svg.push(`</svg>`);
  return svg.join('');
}

function generateHeatmapSVG(heatmap) {
  const cellW = 26,
    cellH = 20;
  const margin = { top: 28, right: 10, bottom: 10, left: 28 };
  const width = margin.left + margin.right + 24 * cellW;
  const height = margin.top + margin.bottom + 7 * cellH;
  const max = Math.max(1, ...heatmap.flat());
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const svg = [];
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  svg.push(
    `<style>text{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:10px}</style>`
  );

  // hour headers
  for (let h = 0; h < 24; h++) {
    svg.push(
      `<text x="${margin.left + h * cellW + 6}" y="${margin.top - 10}" text-anchor="middle">${h}</text>`
    );
  }

  for (let d = 0; d < 7; d++) {
    svg.push(
      `<text x="${margin.left - 6}" y="${margin.top + d * cellH + 14}" text-anchor="end">${days[d]}</text>`
    );
    for (let h = 0; h < 24; h++) {
      const val = heatmap[d][h] || 0;
      const intensity = Math.round((val / max) * 200);
      const fill = `rgb(${255 - intensity},255,${255 - intensity})`;
      svg.push(
        `<rect x="${margin.left + h * cellW}" y="${margin.top + d * cellH}" width="${cellW - 1}" height="${cellH - 1}" fill="${fill}"/>`
      );
      if (val > 0)
        svg.push(
          `<text x="${margin.left + h * cellW + cellW / 2}" y="${margin.top + d * cellH + 14}" text-anchor="middle">${val}</text>`
        );
    }
  }
  svg.push(`</svg>`);
  return svg.join('');
}

function computeMeta(contributors) {
  let commits = 0,
    additions = 0,
    deletions = 0;
  let first, last;
  for (const c of contributors) {
    commits += c.commits || 0;
    additions += c.additions || 0;
    deletions += c.deletions || 0;
    if (c.firstCommitDate) {
      const d = new Date(c.firstCommitDate);
      if (!first || d < first) first = d;
    }
    if (c.lastCommitDate) {
      const d = new Date(c.lastCommitDate);
      if (!last || d > last) last = d;
    }
  }
  return {
    contributors: contributors.length,
    commits,
    additions,
    deletions,
    firstCommitDate: first ? first.toISOString() : undefined,
    lastCommitDate: last ? last.toISOString() : undefined
  };
}

// =====================
// Utility: Count total lines in repo (tracked files)
async function countTotalLines(repoPath) {
  try {
    const res = runGit(repoPath, ['ls-files']);
    if (!res.ok) return 0;
    const files = res.stdout.split(/\r?\n/).filter(Boolean);
    let total = 0;
    for (const rel of files) {
      const abs = path.join(repoPath, rel);
      try {
        const stat = fs.statSync(abs);
        if (!stat.isFile() || stat.size > 50 * 1024 * 1024) continue; // skip huge files
        const content = fs.readFileSync(abs, 'utf8');
        total += content.split(/\r?\n/).length;
      } catch (_) {
        /* ignore */
      }
    }
    return total;
  } catch (_) {
    return 0;
  }
}

// =====================
// Main CLI Execution
// =====================
async function main(argv) {
  const pkg = safeReadPackageJson();
  const program = new Command();

  // Debug utility for controlled logging (now inside main)
  function debugLog(...args) {
    if (process.env.DEBUG || process.env.VERBOSE || opts.verbose) {
      // Write debug logs to stderr to keep stdout clean for structured outputs
      console.error('[debug]', ...args);
    }
  }

  program
    .name('git-contributor-stats')
    .description('Compute contributor and repository statistics from a Git repository')
    .version(pkg.version || '0.0.0')
    .argument('[paths...]', 'Optional pathspec(s) to limit stats to certain files or directories')
    .option('-r, --repo <repoPath>', 'Path to the Git repository (default: current directory)', '.')
    .option(
      '-b, --branch <name>',
      'Branch or commit range to analyze (e.g., main or main..feature)'
    )
    .option(
      '--since <when>',
      "Only include commits more recent than <when> (e.g., '2024-01-01', '30.days', '2.weeks')"
    )
    .option('--until <when>', "Only include commits older than <when> (e.g., '2024-06-30')")
    .option(
      '-a, --author <pattern>',
      'Limit to commits by author (string or regex supported by git)'
    )
    .option('--include-merges', 'Include merge commits (excluded by default)', false)
    .option('-g, --group-by <field>', 'Grouping key: email | name', 'email')
    .option(
      '-s, --sort-by <metric>',
      'Sort by: changes | commits | additions | deletions',
      'changes'
    )
    .option(
      '-t, --top <n>',
      'Limit to top N contributors (for table/CSV stdout)',
      (v) => parseInt(v, 10),
      undefined
    )
    .option('-f, --format <kind>', 'Output format to stdout: table | json | csv', 'table')
    .option('--json', 'Print comprehensive JSON analysis to stdout', false)
    .option('--csv <csvPath>', 'Write CSV contributors summary to file')
    .option('--md <mdPath>', 'Write Markdown report to file')
    .option('--html <htmlPath>', 'Write HTML dashboard report to file')
    .option(
      '--out-dir <outDir>',
      'Write selected outputs into the directory (uses default filenames)'
    )
    .option(
      '--svg',
      'Write SVG charts (top commits, net lines, heatmap) to out-dir (or ./charts if no out-dir)',
      false
    )
    .option(
      '--svg-dir <svgDir>',
      'Directory to write SVG charts (overrides default when --svg is set)'
    )
    // New chart options (SVG default). --svg/--svg-dir kept for backward compatibility
    .option(
      '--charts',
      'Generate charts (defaults to SVG). Use --chart-format to switch formats.',
      false
    )
    .option(
      '--charts-dir <chartsDir>',
      'Directory to write charts (overrides default when --charts is set)'
    )
    .option(
      '--chart-format <format>',
      'Chart output format: svg | png | both (default: svg)',
      'svg'
    )
    .option(
      '--similarity <threshold>',
      'Name merge similarity threshold (0..1)',
      (v) => parseFloat(v),
      0.85
    )
    .option(
      '--generate-workflow',
      'Create a sample GitHub Actions workflow under .github/workflows/',
      false
    )
    .option('--no-count-lines', 'Skip counting total lines in repo (faster)')
    .option('--no-top-stats', 'Omit the Top stats section in Markdown/HTML and stdout table output')
    .option(
      '--top-stats <list>',
      'Top stats metrics to show (comma-separated): commits, additions, deletions, net, changes'
    )
    .option('--alias-file <aliasFile>', 'Path to alias mapping JSON file')
    .option('-v, --verbose', 'Verbose logging', false)
    .addHelpText(
      'after',
      `\nExamples:\n  # Top 10 contributors in the current repo\n  git-contributor-stats --top 10\n\n  # Only for the last 90 days on main\n  git-contributor-stats -b main --since 90.days\n\n  # Stats for a specific folder, as JSON (comprehensive)\n  git-contributor-stats src/ --json\n\n  # Generate Markdown and HTML reports into reports/ and write SVG charts\n  git-contributor-stats --out-dir reports --md reports/report.md --html reports/report.html --svg\n\n  # Merge similar contributor names (default threshold 0.85)\n  git-contributor-stats --similarity 0.9\n`
    );

  program.parse(argv);
  const opts = program.opts();
  const paths = program.args || [];

  const repo = path.resolve(process.cwd(), opts.repo || '.');
  if (!isGitRepo(repo)) {
    console.error(`Not a Git repository: ${repo}`);
    process.exit(2);
  }

  // Load alias configuration (explicit path or default file in repo root)
  let aliasConfig = null;
  let aliasPath = null;
  if (opts.aliasFile) {
    aliasPath = path.resolve(process.cwd(), opts.aliasFile);
    aliasConfig = tryLoadJSON(aliasPath);
    if (!aliasConfig) console.error(`Warning: Could not read alias file: ${aliasPath}`);
  } else {
    const defaultAlias = path.join(repo, '.git-contributor-stats-aliases.json');
    aliasConfig = tryLoadJSON(defaultAlias);
    if (aliasConfig) aliasPath = defaultAlias;
  }
  const { resolve: aliasResolveFn, canonicalDetails } = buildAliasResolver(aliasConfig);

  const since = parseDateInput(opts.since);
  const until = parseDateInput(opts.until);

  const gitArgs = buildGitLogArgs({
    branch: opts.branch,
    since,
    until,
    author: opts.author,
    includeMerges: !!opts.includeMerges,
    paths
  });
  debugLog('git args:', gitArgs);

  const result = runGit(repo, gitArgs);
  if (!result.ok) {
    console.error(result.error);
    process.exit(result.code || 2);
  }

  const commits = parseGitLog(result.stdout);
  debugLog('parsed commits: %d', commits.length);

  // Basic aggregation for table/CSV stdout
  const groupBy = (opts.groupBy || 'email').toLowerCase() === 'name' ? 'name' : 'email';
  let contributors = aggregateBasic(commits, groupBy);
  const sorter = pickSortMetric(opts.sortBy);
  contributors.sort(sorter);
  if (opts.top && Number.isFinite(opts.top) && opts.top > 0)
    contributors = contributors.slice(0, opts.top);
  const meta = computeMeta(contributors);

  // Advanced analysis with alias resolution
  const analysis = analyze(
    commits,
    Number.isFinite(opts.similarity) ? opts.similarity : 0.85,
    aliasResolveFn,
    canonicalDetails
  );

  // Count repo total lines (unless disabled)
  let totalLines = 0;
  if (opts.countLines) {
    totalLines = await countTotalLines(repo);
  }

  const repoRootResult = runGit(repo, ['rev-parse', '--show-toplevel']);
  const repoRoot = repoRootResult.ok ? repoRootResult.stdout.trim() : repo;

  const final = {
    meta: {
      generatedAt: new Date().toISOString(),
      repo: repoRoot,
      branch:
        opts.branch ||
        (runGit(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim() ||
        null,
      since: since || null,
      until: until || null
    },
    totalCommits: analysis.totalCommits,
    totalLines: totalLines,
    contributors: analysis.contributors,
    topContributors: analysis.topContributors,
    topStats: analysis.topStats,
    commitFrequency: analysis.commitFrequency,
    heatmap: analysis.heatmap,
    busFactor: analysis.busFactor
  };

  // Write files if requested
  const outDir = opts.outDir;
  const writeCSVPath = opts.csv || (outDir ? path.join(outDir, 'contributors.csv') : null);
  const writeMDPath = opts.md || (outDir ? path.join(outDir, 'report.md') : null);
  const writeHTMLPath = opts.html || (outDir ? path.join(outDir, 'report.html') : null);

  if (writeCSVPath) {
    ensureDir(path.dirname(writeCSVPath));
    const contribRows = analysis.topContributors.map((c) => ({
      Contributor: `${c.name} <${c.email}>`,
      Commits: c.commits,
      Added: c.added,
      Deleted: c.deleted,
      Net: c.added - c.deleted,
      TopFiles: c.topFiles
        .slice(0, 5)
        .map((f) => `${f.filename}(${f.changes})`)
        .join('; ')
    }));
    const headers = ['Contributor', 'Commits', 'Added', 'Deleted', 'Net', 'TopFiles'];
    const csv = toCSV(contribRows, headers);
    fs.writeFileSync(writeCSVPath, csv, 'utf8');
    console.error(`Wrote CSV to ${writeCSVPath}`);
  }

  const topStatsMetrics = parseTopStatsMetrics(opts.topStats);

  if (writeMDPath) {
    ensureDir(path.dirname(writeMDPath));
    fs.writeFileSync(
      path.join(path.dirname(writeMDPath), 'debug.txt'),
      `[debug] opts.topStats=${opts.topStats}, includeTopStats=${opts.topStats}\n`
    );
    const md = generateMarkdownReport(
      { ...final, contributors: analysis.contributors, topContributors: analysis.topContributors },
      repoRoot,
      { includeTopStats: opts.topStats, topStatsMetrics }
    );
    fs.writeFileSync(writeMDPath, md, 'utf8');
    console.error(`Wrote Markdown report to ${writeMDPath}`);
  }

  if (writeHTMLPath) {
    ensureDir(path.dirname(writeHTMLPath));
    const html = generateHTMLReport(
      { ...final, contributors: analysis.contributors, topContributors: analysis.topContributors },
      repoRoot,
      { includeTopStats: opts.topStats, topStatsMetrics }
    );
    fs.writeFileSync(writeHTMLPath, html, 'utf8');
    console.error(`Wrote HTML report to ${writeHTMLPath}`);
  }

  // Charts outputs (SVG default). Support legacy --svg/--svg-dir flags.
  const chartsRequested = opts.charts || opts.svg || opts.svgDir;
  if (chartsRequested) {
    debugLog('Charts requested, starting generation...');
    const chartsDir = outDir
      ? outDir
      : opts.chartsDir || opts.svgDir || path.join(process.cwd(), 'charts');
    debugLog('Charts directory:', chartsDir);
    ensureDir(chartsDir);
    const formatOpt = String(opts.chartFormat || 'svg').toLowerCase();
    const formats = formatOpt === 'both' ? ['svg', 'png'] : [formatOpt === 'png' ? 'png' : 'svg'];
    debugLog('Chart formats:', formats.join(', '));
    if ((opts.svg || opts.svgDir) && !opts.charts && !opts.chartFormat && !opts.chartsDir) {
      console.error(
        '[warn] --svg/--svg-dir are deprecated; prefer --charts/--charts-dir/--chart-format'
      );
    }
    const names = analysis.topContributors.map((c) => c.name || '');
    const commitsVals = analysis.topContributors.map((c) => c.commits || 0);
    const netVals = analysis.topContributors.map((c) => (c.added || 0) - (c.deleted || 0));
    debugLog('Contributors:', names.length, 'commits:', commitsVals.length, 'net:', netVals.length);
    const chartPromises = [];
    for (const fmt of formats) {
      const ext = fmt === 'svg' ? '.svg' : '.png';
      debugLog('Rendering', fmt, 'charts...');
      chartPromises.push(
        renderBarChartImage(
          fmt,
          'Top contributors by commits',
          names,
          commitsVals,
          path.join(chartsDir, `top-commits${ext}`),
          { limit: 25, verbose: opts.verbose }
        )
      );
      chartPromises.push(
        renderBarChartImage(
          fmt,
          'Top contributors by net lines',
          names,
          netVals,
          path.join(chartsDir, `top-net${ext}`),
          { limit: 25, verbose: opts.verbose }
        )
      );
      chartPromises.push(
        renderHeatmapImage(fmt, analysis.heatmap, path.join(chartsDir, `heatmap${ext}`), {
          verbose: opts.verbose
        })
      );
    }
    await Promise.all(chartPromises);
    // Safety net: ensure SVG files exist even if rendering failed silently
    if (formats.includes('svg')) {
      const names = analysis.topContributors.map((c) => c.name || '');
      const commitsVals = analysis.topContributors.map((c) => c.commits || 0);
      const netVals = analysis.topContributors.map((c) => (c.added || 0) - (c.deleted || 0));
      const svgCommits = path.join(chartsDir, 'top-commits.svg');
      const svgNet = path.join(chartsDir, 'top-net.svg');
      const svgHeat = path.join(chartsDir, 'heatmap.svg');
      try {
        if (!fs.existsSync(svgCommits)) {
          debugLog('Fallback: writing', svgCommits);
          fs.writeFileSync(
            svgCommits,
            generateBarChartSVG('Top contributors by commits', names, commitsVals, { limit: 25 }),
            'utf8'
          );
          debugLog('Fallback: wrote', svgCommits);
        }
      } catch (e) {
        console.error(`[error] Fallback write failed for ${svgCommits}: ${e.message}`);
      }
      try {
        if (!fs.existsSync(svgNet)) {
          debugLog('Fallback: writing', svgNet);
          fs.writeFileSync(
            svgNet,
            generateBarChartSVG('Top contributors by net lines', names, netVals, { limit: 25 }),
            'utf8'
          );
          debugLog('Fallback: wrote', svgNet);
        }
      } catch (e) {
        console.error(`[error] Fallback write failed for ${svgNet}: ${e.message}`);
      }
      try {
        if (!fs.existsSync(svgHeat)) {
          debugLog('Fallback: writing', svgHeat);
          fs.writeFileSync(svgHeat, generateHeatmapSVG(analysis.heatmap), 'utf8');
          debugLog('Fallback: wrote', svgHeat);
        }
      } catch (e) {
        console.error(`[error] Fallback write failed for ${svgHeat}: ${e.message}`);
      }
    }
    console.error(`Wrote ${formats.join('+').toUpperCase()} charts to ${chartsDir}`);
  } else {
    debugLog('No charts requested');
  }

  if (opts.generateWorkflow) {
    const wfPath = path.join(repo, '.github', 'workflows', 'git-contributor-stats.yml');
    ensureDir(path.dirname(wfPath));
    const wfContent = `name: Git Contributor Stats
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install deps
        run: npm ci || npm i
      - name: Run report
        run: npx git-contributor-stats --out-dir=./reports --html=reports/report.html --json --svg
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: git-contrib-report
          path: reports
`;
    fs.writeFileSync(wfPath, wfContent, 'utf8');
    console.error(`Wrote sample GitHub Actions workflow to ${wfPath}`);
  }

  // Decide stdout format
  const stdoutWantsJSON = opts.json || String(opts.format || '').toLowerCase() === 'json';
  const stdoutWantsCSV = String(opts.format || '').toLowerCase() === 'csv';

  if (stdoutWantsJSON) {
    console.log(JSON.stringify(final, null, 2));
    return;
  }

  if (stdoutWantsCSV) {
    printCSV(contributors, groupBy);
    return;
  }

  // default: table
  if (opts.topStats !== false) {
    console.log('Top stats:');
    for (const l of formatTopStatsLines(final.topStats || {}, topStatsMetrics))
      console.log(`- ${l}`);
    console.log('');
  }
  printTable(contributors, meta, groupBy);
}

// ESM-compatible entry point check
const isMain = (() => {
  // Node ESM: process.argv[1] is the entry script path
  // import.meta.url is a file:// URL
  try {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    const thisFile = fileURLToPath(import.meta.url);
    return entry && thisFile && entry === thisFile;
  } catch {
    return false;
  }
})();

if (isMain) {
  main(process.argv).catch((err) => {
    console.error((err && err.stack) || String(err));
    process.exit(2);
  });
}

// =====================
// END OF FILE - Ready for modularization
// =====================
