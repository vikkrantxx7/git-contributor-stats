/**
 * Alias resolution and name normalization utilities
 */

/**
 * Normalize contributor name for similarity matching
 * @param {string} name
 * @returns {string} Normalized name
 */
export function normalizeName(name) {
  return String(name || '')
    .replace(/@.*$/, '')
    .replace(/^svc[_-]/i, '')
    .replace(/[^a-zA-Z0-9\s._-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a
 * @param {string} b
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Calculate similarity score between two strings
 * @param {string} a
 * @param {string} b
 * @returns {number} Similarity score (0-1)
 */
export function similarityScore(a, b) {
  try {
    // string-similarity-js only exports stringSimilarity function
    const { stringSimilarity } = await import('string-similarity-js');
    return stringSimilarity(a, b);
  } catch (_) {
    // Fallback to Levenshtein-based similarity
    const maxLen = Math.max(a.length, b.length) || 1;
    const dist = levenshteinDistance(a, b);
    return 1 - (dist / maxLen);
  }
}

/**
 * Build alias resolver from configuration
 * @param {object} config - Alias configuration
 * @returns {object} Resolver functions and canonical details
 */
export function buildAliasResolver(config) {
  if (!config) return { resolve: null, canonicalDetails: new Map() };

  let mapEntries = [];
  let groups = [];
  const canonicalDetails = new Map();

  // Support multiple configuration formats
  if (Array.isArray(config)) {
    groups = config;
  } else if (config && typeof config === 'object') {
    if (Array.isArray(config.groups)) groups = config.groups;
    if (config.map && typeof config.map === 'object') mapEntries = Object.entries(config.map);

    // Handle flat map format
    const flatMapCandidates = Object.keys(config).filter(k => k !== 'groups' && k !== 'map' && k !== 'canonical');
    if (mapEntries.length === 0 && flatMapCandidates.length) {
      mapEntries = Object.entries(config).filter(([k]) => k !== 'groups' && k !== 'canonical');
    }

    // Extract canonical details
    if (config.canonical && typeof config.canonical === 'object') {
      for (const [canonKey, info] of Object.entries(config.canonical)) {
        const normKey = normalizeName(canonKey);
        canonicalDetails.set(normKey, {
          name: info && info.name || undefined,
          email: info && info.email || undefined
        });
      }
    }
  }

  const aliasMap = new Map(); // normalized alias -> canonical normalized
  const regexList = []; // { regex, canonical }

  // Process map entries
  for (const [alias, canonical] of mapEntries) {
    if (typeof alias === 'string' && alias.startsWith('/') && alias.lastIndexOf('/') > 0) {
      // Handle regex patterns
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

  // Process groups
  for (const g of groups) {
    if (!Array.isArray(g) || g.length === 0) continue;
    const canonicalCandidate = g.find(s => typeof s === 'string' && s.includes('@')) || g[0];
    const canonicalNorm = normalizeName(String(canonicalCandidate));

    for (const item of g) {
      if (typeof item !== 'string') continue;
      if (item.startsWith('/') && item.lastIndexOf('/') > 0) {
        // Handle regex in groups
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
