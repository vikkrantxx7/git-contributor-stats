/**
 * Advanced analytics and similarity matching
 */
import { normalizeName, similarityScore } from './aliases.js';
import { isoWeekKey } from '../utils/dates.js';

/**
 * Merge similar contributors based on threshold
 * @param {object} contribMap - Map of contributors
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {object} Merged contributors map
 */
export function mergeSimilarContributors(contribMap, threshold) {
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

/**
 * Perform comprehensive analysis of commits
 * @param {Array} commits - Array of commit objects
 * @param {number} similarityThreshold - Similarity threshold for merging
 * @param {Function} aliasResolver - Alias resolution function
 * @param {Map} canonicalDetails - Canonical contributor details
 * @returns {object} Analysis results
 */
export function analyze(commits, similarityThreshold, aliasResolver, canonicalDetails) {
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
      contrib.files[fname].changes += (f.added + f.deleted);
      contrib.files[fname].added += f.added;
      contrib.files[fname].deleted += f.deleted;

      if (!fileToContribs[fname]) fileToContribs[fname] = new Set();
      fileToContribs[fname].add(normalized);
    }
  }

  const merged = mergeSimilarContributors(contribMap, similarityThreshold);

  const topContributors = Object.values(merged).map(c => {
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
      changes: (c.added + c.deleted),
      files: c.files,
      topFiles: filesArr
    };
  }).sort((a, b) => b.commits - a.commits);

  const filesSingleOwner = [];
  for (const [file, ownersSet] of Object.entries(fileToContribs)) {
    const owners = Array.from(ownersSet);
    if (owners.length === 1) {
      const owner = owners[0];
      const m = merged[owner] || contribMap[owner] || { name: owner };
      const changes = (merged[owner] && merged[owner].files && merged[owner].files[file])
        ? merged[owner].files[file].changes : 0;
      filesSingleOwner.push({ file, owner: m.name || owner, changes });
    }
  }
  filesSingleOwner.sort((a, b) => b.changes - a.changes);

  // Calculate top stats across metrics
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
    byChanges: topBy('changes'),
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
