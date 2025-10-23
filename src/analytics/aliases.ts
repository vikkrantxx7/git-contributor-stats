import { stringSimilarity } from 'string-similarity-js';

export function normalizeName(name?: string) {
  return String(name || '')
    .replace(/@.*$/, '')
    .replace(/^svc[_-]/i, '')
    .replaceAll(/[^a-zA-Z0-9\s._-]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function levenshteinDistance(a: string, b: string) {
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
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

export function similarityScore(a: string, b: string) {
  try {
    return stringSimilarity(a, b);
  } catch (_error) {
    // Fallback to Levenshtein distance if string-similarity-js fails
    const maxLen = Math.max(a.length, b.length) || 1;
    const dist = levenshteinDistance(a, b);
    return 1 - dist / maxLen;
  }
}

export type AliasGroup = string | RegExp | string[];

export interface AliasCanonicalInfo {
  name?: string;
  email?: string;
}

export interface AliasConfigObject {
  groups?: AliasGroup[];
  map?: Record<string, string>;
  canonical?: Record<string, AliasCanonicalInfo>;
  [key: string]:
    | string
    | AliasGroup[]
    | Record<string, string>
    | Record<string, AliasCanonicalInfo>
    | undefined;
}

export type AliasConfig = AliasGroup[] | AliasConfigObject | undefined;

interface ParsedConfig {
  mapEntries: Array<[string, string]>;
  groups: Array<string | RegExp | Array<string>>;
  canonicalDetails: Map<string, { name?: string; email?: string }>;
}

function extractMapEntries(config: AliasConfigObject): Array<[string, string]> {
  if (config.map && typeof config.map === 'object') {
    return Object.entries(config.map);
  }

  // Check for flat map structure
  const flatMapCandidates = Object.keys(config).filter(
    (k) => k !== 'groups' && k !== 'map' && k !== 'canonical'
  );

  if (flatMapCandidates.length === 0) {
    return [];
  }

  return Object.entries(config)
    .filter(([k, v]) => k !== 'groups' && k !== 'canonical' && typeof v === 'string')
    .map(([k, v]) => [k, v as string] as [string, string]);
}

function extractCanonicalDetails(
  config: AliasConfigObject
): Map<string, { name?: string; email?: string }> {
  const canonicalDetails = new Map<string, { name?: string; email?: string }>();

  if (!config.canonical || typeof config.canonical !== 'object') {
    return canonicalDetails;
  }

  for (const [canonKey, info] of Object.entries(config.canonical)) {
    const normKey = normalizeName(canonKey);
    const infoObj = info;
    canonicalDetails.set(normKey, {
      name: (infoObj && typeof infoObj.name === 'string' ? infoObj.name : undefined) || undefined,
      email: (infoObj && typeof infoObj.email === 'string' ? infoObj.email : undefined) || undefined
    });
  }

  return canonicalDetails;
}

function parseAliasConfig(config: AliasConfig): ParsedConfig {
  const emptyResult: ParsedConfig = {
    mapEntries: [],
    groups: [],
    canonicalDetails: new Map<string, { name?: string; email?: string }>()
  };

  if (!config) {
    return emptyResult;
  }

  if (Array.isArray(config)) {
    return {
      ...emptyResult,
      groups: config as Array<string | RegExp | string[]>
    };
  }

  if (typeof config === 'object') {
    const groups = Array.isArray(config.groups) ? config.groups : [];
    const mapEntries = extractMapEntries(config);
    const canonicalDetails = extractCanonicalDetails(config);

    return { mapEntries, groups, canonicalDetails };
  }

  return emptyResult;
}

function parseRegexPattern(pattern: string): RegExp | null {
  if (!pattern.startsWith('/') || pattern.lastIndexOf('/') <= 0) {
    return null;
  }

  const lastSlash = pattern.lastIndexOf('/');
  const regexPattern = pattern.slice(1, lastSlash);
  const flags = pattern.slice(lastSlash + 1);

  try {
    return new RegExp(regexPattern, flags);
  } catch (_error) {
    // Skip invalid regex patterns
    return null;
  }
}

function processMapEntries(
  mapEntries: Array<[string, string]>,
  aliasMap: Map<string, string>,
  regexList: Array<{ regex: RegExp; canonical: string }>
): void {
  for (const [alias, canonical] of mapEntries) {
    const regex = typeof alias === 'string' ? parseRegexPattern(alias) : null;

    if (regex) {
      regexList.push({ regex, canonical: normalizeName(canonical) });
    } else {
      aliasMap.set(normalizeName(alias), normalizeName(canonical));
    }
  }
}

function processGroups(
  groups: Array<string | RegExp | Array<string>>,
  aliasMap: Map<string, string>,
  regexList: Array<{ regex: RegExp; canonical: string }>
): void {
  for (const g of groups) {
    if (!Array.isArray(g) || g.length === 0) continue;

    const canonicalCandidate = g.find((s) => typeof s === 'string' && s.includes('@')) || g[0];
    const canonicalNorm = normalizeName(String(canonicalCandidate));

    for (const item of g) {
      if (typeof item !== 'string') continue;

      const regex = parseRegexPattern(item);
      if (regex) {
        regexList.push({ regex, canonical: canonicalNorm });
      } else {
        aliasMap.set(normalizeName(item), canonicalNorm);
      }
    }
  }
}

function createResolveFunction(
  aliasMap: Map<string, string>,
  regexList: Array<{ regex: RegExp; canonical: string }>
) {
  return function resolve(baseNorm: string, name?: string, email?: string): string {
    const mapped = aliasMap.get(baseNorm);
    if (mapped) return mapped;

    const rawName = name || '';
    const rawEmail = email || '';

    for (const { regex, canonical } of regexList) {
      try {
        if (regex.test(rawName) || regex.test(rawEmail)) {
          return canonical;
        }
      } catch (_error) {
        // Skip regex test failures and continue to next pattern
      }
    }

    return baseNorm;
  };
}

export function buildAliasResolver(config?: AliasConfig) {
  if (!config) {
    return {
      resolve: null as null | ((n: string, name?: string, email?: string) => string),
      canonicalDetails: new Map<string, { name?: string; email?: string }>()
    };
  }

  const { mapEntries, groups, canonicalDetails } = parseAliasConfig(config);
  const aliasMap = new Map<string, string>();
  const regexList: Array<{ regex: RegExp; canonical: string }> = [];

  processMapEntries(mapEntries, aliasMap, regexList);
  processGroups(groups, aliasMap, regexList);

  const resolve = createResolveFunction(aliasMap, regexList);

  return { resolve, canonicalDetails };
}
