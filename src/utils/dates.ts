// Date parsing utilities for git-contributor-stats

export function parseDateInput(input: string): string | undefined {
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
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return input;
}

export function isoWeekKey(date: Date): string {
  const d = new Date(date);
  const target = new Date(d.valueOf());
  const dayNumber = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round(diff / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

