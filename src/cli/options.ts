import { Command } from 'commander';

export interface PackageJson {
  version?: string;
  [key: string]: unknown;
}

export function setupCLI(pkg: PackageJson): Command {
  const program = new Command();

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
    .option('-t, --top <n>', 'Limit to top N contributors (for table/CSV stdout)', (v: string) =>
      Number.parseInt(v, 10)
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
      (v: string) => Number.parseFloat(v),
      0.85
    )
    .option('--alias-file <aliasFile>', 'Path to alias mapping JSON file')
    .option('--no-count-lines', 'Skip counting total lines in repo (faster)')
    .option('--no-top-stats', 'Omit the Top stats section in Markdown/HTML and stdout table output')
    .option(
      '--top-stats <list>',
      'Top stats metrics to show (comma-separated): commits, additions, deletions, net, changes'
    )
    .option(
      '--generate-workflow',
      'Create a sample GitHub Actions workflow under .github/workflows/',
      false
    )
    .option('-v, --verbose', 'Verbose logging', false)
    .addHelpText(
      'after',
      `\nExamples:\n  # Top 10 contributors in the current repo\n  git-contributor-stats --top 10\n\n  # Only for the last 90 days on main\n  git-contributor-stats -b main --since 90.days\n\n  # Stats for a specific folder, as JSON (comprehensive)\n  git-contributor-stats src/ --json\n\n  # Generate Markdown and HTML reports into reports/ and write SVG charts\n  git-contributor-stats --out-dir reports --md reports/report.md --html reports/report.html --svg\n\n  # Merge similar contributor names (default threshold 0.85)\n  git-contributor-stats --similarity 0.9\n`
    );

  return program;
}
