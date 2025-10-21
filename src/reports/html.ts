interface TopFile {
  filename: string;
  changes: number;
}

interface Contributor {
  name: string;
  email: string;
  commits: number;
  added: number;
  deleted: number;
  topFiles: TopFile[];
}

interface BusFactorFile {
  file: string;
  owner: string;
  changes: number;
}

interface BusFactor {
  filesSingleOwner: BusFactorFile[];
}

interface TopStatsEntry {
  name?: string;
  email?: string;
  commits?: number;
  added?: number;
  deleted?: number;
  net?: number;
}

interface TopStats {
  byCommits?: TopStatsEntry;
  byAdditions?: TopStatsEntry;
  byDeletions?: TopStatsEntry;
  byNet?: TopStatsEntry;
  byChanges?: TopStatsEntry;
}

interface AnalysisData {
  contributors: Record<string, unknown>;
  topContributors: Contributor[];
  totalCommits: number;
  totalLines: number;
  busFactor: BusFactor;
  topStats?: TopStats;
  heatmap: number[][];
}

interface ReportOptions {
  includeTopStats?: boolean;
  topStatsMetrics?: string[];
}

export function generateHTMLReport(
  data: AnalysisData,
  repoRoot: string,
  opts: ReportOptions = {}
): string {
  const includeTopStats = opts.includeTopStats !== false;
  const topMetrics = Array.isArray(opts.topStatsMetrics)
    ? opts.topStatsMetrics
    : ['commits', 'additions', 'deletions', 'net', 'changes'];

  const topStatsHTML = includeTopStats ? generateTopStatsHTML(data.topStats, topMetrics) : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Git Contributor Stats - ${repoRoot}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${getCSS()}
  </style>
</head>
<body>
  <header class="header">
    <h1>📊 Git Contributor Stats</h1>
    <p class="repo-path"><strong>Repository:</strong> <code>${repoRoot}</code></p>
    <p class="generated-time">Generated: ${new Date().toLocaleString()}</p>
  </header>

  <main class="main">
    ${generateSummaryHTML(data)}
    ${topStatsHTML}
    ${generateContributorsHTML(data)}
    ${generateChartsHTML()}
    ${generateBusFactorHTML(data)}
    ${generateActivityHTML()}
  </main>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    ${getJavaScript(data)}
  </script>
</body>
</html>`;
}

function getCSS(): string {
  return `
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6; margin: 0; background: #f5f7fa; color: #2d3748;
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 2rem; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0; font-size: 2.5rem; font-weight: 300; }
    .repo-path, .generated-time { opacity: 0.9; margin: 0.5rem 0; }
    .main { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
    .section { 
      background: white; margin: 2rem 0; padding: 2rem; border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
    }
    .section h2 { margin-top: 0; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .stat-card { background: #f7fafc; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #4299e1; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #2d3748; }
    .stat-label { color: #718096; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .contributors-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .contributors-table th, .contributors-table td { 
      padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; 
    }
    .contributors-table th { background: #f7fafc; font-weight: 600; color: #4a5568; }
    .contributors-table tr:hover { background: #f7fafc; }
    .chart-container { max-width: 100%; margin: 2rem 0; }
    .chart-container canvas { max-height: 400px; }
    .heatmap-table { border-collapse: collapse; margin: 1rem auto; }
    .heatmap-table th, .heatmap-table td { 
      width: 30px; height: 25px; text-align: center; font-size: 10px; 
      border: 1px solid #e2e8f0; padding: 2px; 
    }
    .heatmap-table th { background: #f7fafc; font-weight: 600; }
    .top-stats { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
    .top-stats h2 { color: white; border-color: rgba(255,255,255,0.3); }
    .top-stat-item { margin: 0.5rem 0; font-size: 1.1rem; }
    code { background: rgba(0,0,0,0.1); padding: 0.2rem 0.4rem; border-radius: 4px; }
  `;
}

function generateSummaryHTML(data: AnalysisData): string {
  return `
    <section class="section">
      <h2>📈 Repository Summary</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${Object.keys(data.contributors).length.toLocaleString()}</div>
          <div class="stat-label">Contributors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalCommits.toLocaleString()}</div>
          <div class="stat-label">Total Commits</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalLines.toLocaleString()}</div>
          <div class="stat-label">Lines of Code</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.busFactor.filesSingleOwner.length}</div>
          <div class="stat-label">Single-Owner Files</div>
        </div>
      </div>
    </section>
  `;
}

function generateTopStatsHTML(topStats: TopStats | undefined, metrics: string[]): string {
  if (!topStats) return '';

  const want = new Set(metrics);
  const items: string[] = [];

  if (want.has('commits') && topStats.byCommits) {
    items.push(
      `<div class="top-stat-item">🏆 <strong>Most Commits:</strong> ${topStats.byCommits.name} (${topStats.byCommits.commits})</div>`
    );
  }
  if (want.has('additions') && topStats.byAdditions) {
    items.push(
      `<div class="top-stat-item">➕ <strong>Most Additions:</strong> ${topStats.byAdditions.name} (${topStats.byAdditions.added?.toLocaleString()})</div>`
    );
  }
  if (want.has('deletions') && topStats.byDeletions) {
    items.push(
      `<div class="top-stat-item">➖ <strong>Most Deletions:</strong> ${topStats.byDeletions.name} (${topStats.byDeletions.deleted?.toLocaleString()})</div>`
    );
  }
  if (want.has('net') && topStats.byNet) {
    items.push(
      `<div class="top-stat-item">📊 <strong>Best Net Contribution:</strong> ${topStats.byNet.name} (${topStats.byNet.net?.toLocaleString()})</div>`
    );
  }

  return `
    <section class="section top-stats">
      <h2>🎯 Top Statistics</h2>
      ${items.join('')}
    </section>
  `;
}

function generateContributorsHTML(data: AnalysisData): string {
  const rows = data.topContributors
    .slice(0, 25)
    .map((c, idx) => {
      const net = (c.added || 0) - (c.deleted || 0);
      return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${c.name}</strong><br><code>${c.email}</code></td>
        <td>${(c.commits || 0).toLocaleString()}</td>
        <td style="color: #38a169">${(c.added || 0).toLocaleString()}</td>
        <td style="color: #e53e3e">${(c.deleted || 0).toLocaleString()}</td>
        <td style="color: ${net >= 0 ? '#38a169' : '#e53e3e'}">${net.toLocaleString()}</td>
      </tr>
    `;
    })
    .join('');

  return `
    <section class="section">
      <h2>👥 Top Contributors</h2>
      <table class="contributors-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Contributor</th>
            <th>Commits</th>
            <th>Added</th>
            <th>Deleted</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function generateChartsHTML(): string {
  return `
    <section class="section">
      <h2>📊 Contribution Charts</h2>
      <div class="chart-container">
        <h3>Commits by Contributor</h3>
        <canvas id="commitsChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Net Lines by Contributor</h3>
        <canvas id="netChart"></canvas>
      </div>
    </section>
  `;
}

function generateBusFactorHTML(data: AnalysisData): string {
  const files = data.busFactor.filesSingleOwner
    .slice(0, 10)
    .map(
      (f) =>
        `<tr><td><code>${f.file}</code></td><td>${f.owner}</td><td>${f.changes.toLocaleString()}</td></tr>`
    )
    .join('');

  return `
    <section class="section">
      <h2>⚠️ Bus Factor Analysis</h2>
      <p>Files with only one contributor (high risk):</p>
      <table class="contributors-table">
        <thead><tr><th>File</th><th>Owner</th><th>Changes</th></tr></thead>
        <tbody>${files}</tbody>
      </table>
    </section>
  `;
}

function generateActivityHTML(): string {
  return `
    <section class="section">
      <h2>🕒 Activity Heatmap</h2>
      <p>Commit activity by day of week and hour:</p>
      <table class="heatmap-table" id="heatmap"></table>
    </section>
  `;
}

function getJavaScript(data: AnalysisData): string {
  return `
    const topContributors = ${JSON.stringify(data.topContributors.slice(0, 15))};
    const heatmap = ${JSON.stringify(data.heatmap)};
    
    // Commits chart
    new Chart(document.getElementById('commitsChart'), {
      type: 'bar',
      data: {
        labels: topContributors.map(c => c.name),
        datasets: [{
          label: 'Commits',
          data: topContributors.map(c => c.commits),
          backgroundColor: '#4299e1'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    
    // Net lines chart
    new Chart(document.getElementById('netChart'), {
      type: 'bar',
      data: {
        labels: topContributors.map(c => c.name),
        datasets: [{
          label: 'Net Lines',
          data: topContributors.map(c => (c.added || 0) - (c.deleted || 0)),
          backgroundColor: '#48bb78'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    
    // Heatmap
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const max = Math.max(...heatmap.flat());
    let html = '<tr><th></th>' + Array.from({length:24}, (_, i) => '<th>' + i + '</th>').join('') + '</tr>';
    
    for (let day = 0; day < 7; day++) {
      html += '<tr><th>' + days[day] + '</th>';
      for (let hour = 0; hour < 24; hour++) {
        const val = heatmap[day][hour] || 0;
        const intensity = max ? (val / max) * 0.8 : 0;
        const color = 'rgba(66, 153, 225, ' + intensity + ')';
        html += '<td style="background:' + color + '">' + (val || '') + '</td>';
      }
      html += '</tr>';
    }
    document.getElementById('heatmap').innerHTML = html;
  `;
}

