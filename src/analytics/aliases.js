import { stringSimilarity } from 'string-similarity-js';
export function normalizeName(name) {
    return String(name || '')
        .replace(/@.*$/, '')
        .replace(/^svc[_-]/i, '')
        .replace(/[^a-zA-Z0-9\s._-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}
function levenshteinDistance(a, b) {
    const m = a.length, n = b.length;
    if (m === 0)
        return n;
    if (n === 0)
        return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}
export function similarityScore(a, b) {
    try {
        return stringSimilarity(a, b);
    }
    catch (_) {
        const maxLen = Math.max(a.length, b.length) || 1;
        const dist = levenshteinDistance(a, b);
        return 1 - dist / maxLen;
    }
}
export function buildAliasResolver(config) {
    if (!config)
        return {
            resolve: null,
            canonicalDetails: new Map()
        };
    let mapEntries = [];
    let groups = [];
    const canonicalDetails = new Map();
    if (Array.isArray(config)) {
        groups = config;
    }
    else if (config && typeof config === 'object') {
        if (Array.isArray(config.groups))
            groups = config.groups;
        if (config.map && typeof config.map === 'object')
            mapEntries = Object.entries(config.map);
        const flatMapCandidates = Object.keys(config).filter((k) => k !== 'groups' && k !== 'map' && k !== 'canonical');
        if (mapEntries.length === 0 && flatMapCandidates.length) {
            // Object.entries returns [string, unknown] pairs; coerce values to string when appropriate
            mapEntries = Object.entries(config)
                .filter(([k]) => k !== 'groups' && k !== 'canonical')
                .map(([k, v]) => [k, typeof v === 'string' ? v : String(v)]);
        }
        if (config.canonical && typeof config.canonical === 'object') {
            for (const [canonKey, info] of Object.entries(config.canonical)) {
                const normKey = normalizeName(canonKey);
                const infoObj = info;
                canonicalDetails.set(normKey, {
                    name: (infoObj && typeof infoObj.name === 'string' ? infoObj.name : undefined) ||
                        undefined,
                    email: (infoObj && typeof infoObj.email === 'string'
                        ? infoObj.email
                        : undefined) || undefined
                });
            }
        }
    }
    const aliasMap = new Map();
    const regexList = [];
    for (const [alias, canonical] of mapEntries) {
        if (typeof alias === 'string' && alias.startsWith('/') && alias.lastIndexOf('/') > 0) {
            const lastSlash = alias.lastIndexOf('/');
            const pattern = alias.slice(1, lastSlash);
            const flags = alias.slice(lastSlash + 1);
            try {
                const re = new RegExp(pattern, flags);
                regexList.push({ regex: re, canonical: normalizeName(canonical) });
            }
            catch (_) {
                // ignore
            }
        }
        else {
            aliasMap.set(normalizeName(alias), normalizeName(canonical));
        }
    }
    for (const g of groups) {
        if (!Array.isArray(g) || g.length === 0)
            continue;
        const gs = g;
        const canonicalCandidate = gs.find((s) => typeof s === 'string' && s.includes('@')) || gs[0];
        const canonicalNorm = normalizeName(String(canonicalCandidate));
        for (const item of gs) {
            if (typeof item !== 'string')
                continue;
            if (item.startsWith('/') && item.lastIndexOf('/') > 0) {
                const lastSlash = item.lastIndexOf('/');
                const pattern = item.slice(1, lastSlash);
                const flags = item.slice(lastSlash + 1);
                try {
                    regexList.push({ regex: new RegExp(pattern, flags), canonical: canonicalNorm });
                }
                catch (_) { }
            }
            else {
                aliasMap.set(normalizeName(item), canonicalNorm);
            }
        }
    }
    function resolve(baseNorm, name, email) {
        const mapped = aliasMap.get(baseNorm);
        if (mapped)
            return mapped;
        const rawName = name || '';
        const rawEmail = email || '';
        for (const { regex, canonical } of regexList) {
            try {
                if (regex.test(rawName) || regex.test(rawEmail))
                    return canonical;
            }
            catch (_) { }
        }
        return baseNorm;
    }
    return { resolve, canonicalDetails };
}
