import { formatNumber } from '../utils/formatting.js';
export function aggregateBasic(commits, groupBy) {
    const map = new Map();
    for (const c of commits) {
        const key = groupBy === 'name'
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
                firstCommitDate: c.date ? new Date(c.date) : undefined,
                lastCommitDate: c.date ? new Date(c.date) : undefined
            });
        }
        const agg = map.get(key);
        if (!agg)
            continue;
        agg.name = agg.name || c.authorName || '';
        if (c.authorEmail)
            agg.emails.add(c.authorEmail.toLowerCase());
        agg.commits += 1;
        agg.additions += c.additions || 0;
        agg.deletions += c.deletions || 0;
        if (c.date) {
            const d = new Date(c.date);
            if (!agg.firstCommitDate || d < agg.firstCommitDate)
                agg.firstCommitDate = d;
            if (!agg.lastCommitDate || d > agg.lastCommitDate)
                agg.lastCommitDate = d;
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
export function pickSortMetric(by) {
    switch ((by || '').toLowerCase()) {
        case 'commits':
            return (a, b) => b.commits - a.commits || b.changes - a.changes;
        case 'additions':
        case 'adds':
        case 'lines-added':
            return (a, b) => (b.additions || 0) - (a.additions || 0) || b.commits - a.commits;
        case 'deletions':
        case 'dels':
        case 'lines-deleted':
            return (a, b) => (b.deletions || 0) - (a.deletions || 0) || b.commits - a.commits;
        default:
            return (a, b) => b.changes - a.changes || b.commits - a.commits;
    }
}
export function computeMeta(contributors) {
    let commits = 0, additions = 0, deletions = 0;
    let first, last;
    for (const c of contributors) {
        commits += c.commits || 0;
        additions += c.additions || 0;
        deletions += c.deletions || 0;
        if (c.firstCommitDate) {
            const d = new Date(c.firstCommitDate);
            if (!first || d < first)
                first = d;
        }
        if (c.lastCommitDate) {
            const d = new Date(c.lastCommitDate);
            if (!last || d > last)
                last = d;
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
export function printTable(contributors, meta, groupBy) {
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
    const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ? String(r[i]).length : 0))));
    const headerLine = headers
        .map((h, i) => (i === 1 ? String(h).padEnd(colWidths[i]) : String(h).padStart(colWidths[i])))
        .join('  ');
    const sepLine = colWidths.map((w) => '-'.repeat(w)).join('  ');
    console.log(headerLine);
    console.log(sepLine);
    rows.forEach((r) => {
        const line = r
            .map((cell, i) => i === 1 ? String(cell).padEnd(colWidths[i]) : String(cell).padStart(colWidths[i]))
            .join('  ');
        console.log(line);
    });
    console.log();
    console.log(`Contributors: ${formatNumber(meta.contributors)} | Commits: ${formatNumber(meta.commits)} | Changes: ${formatNumber(meta.additions + meta.deletions)} (+${formatNumber(meta.additions)} / -${formatNumber(meta.deletions)})`);
    if (meta.firstCommitDate || meta.lastCommitDate) {
        console.log(`Range: ${meta.firstCommitDate ? new Date(meta.firstCommitDate).toISOString().slice(0, 10) : '—'} → ${meta.lastCommitDate ? new Date(meta.lastCommitDate).toISOString().slice(0, 10) : '—'}`);
    }
}
export function printCSV(contributors, groupBy) {
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
