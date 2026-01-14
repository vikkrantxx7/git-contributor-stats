import { isoWeekKey, parseDateInput } from './dates';

function expectRelativeDays(input: string, expectedDays: number) {
  const result = parseDateInput(input);
  expect(result).toBeDefined();
  if (!result) throw new Error('parseDateInput did not return a date string');

  const d = new Date(result);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  expect(diff).toBe(expectedDays);
}

describe('parseDateInput', () => {
  it('should return undefined for empty input', () => {
    expect(parseDateInput()).toBeUndefined();
    expect(parseDateInput('')).toBeUndefined();
  });

  const relativeCases = [
    ['relative days', '2.days', 2],
    ['relative day (singular)', '1.day', 1],
    ['relative weeks', '2.weeks', 14],
    ['relative week (singular)', '1.week', 7],
    ['relative months', '2.months', 60],
    ['relative month (singular)', '1.month', 30],
    ['relative years', '1.years', 365],
    ['relative year (singular)', '1.year', 365],
    ['uppercase units', '3.DAYS', 3]
  ] as const;

  it.each(relativeCases)('should parse %s', (_title, input, expectedDays) => {
    expectRelativeDays(input, expectedDays);
  });

  it('should handle mixed case units', () => {
    const result = parseDateInput('2.Weeks');
    expect(result).toBeDefined();
  });

  it('should handle whitespace in relative date input', () => {
    const result = parseDateInput('  5.days  ');
    expect(result).toBeDefined();
  });

  it('should parse absolute date', () => {
    expect(parseDateInput('2025-11-01')).toBe('2025-11-01T00:00:00.000Z');
  });

  it('should return input for invalid date', () => {
    expect(parseDateInput('not-a-date')).toBe('not-a-date');
  });

  it('should handle ISO date strings', () => {
    const result = parseDateInput('2025-11-11T12:00:00Z');
    expect(result).toBe('2025-11-11T12:00:00.000Z');
  });

  it('should return input string if date parsing fails', () => {
    const result = parseDateInput('totally-invalid');
    expect(result).toBe('totally-invalid');
  });
});

describe('isoWeekKey', () => {
  it('should return correct ISO week for a date', () => {
    expect(isoWeekKey(new Date('2025-11-11'))).toMatch(/^2025-W\d{2}$/);
  });

  it('should handle first week of year', () => {
    const result = isoWeekKey(new Date('2025-01-05'));
    expect(result).toMatch(/^2025-W0[1-2]$/);
  });

  it('should handle last week of year', () => {
    const result = isoWeekKey(new Date('2025-12-28'));
    expect(result).toMatch(/^2025-W5[0-3]$/);
  });

  it('should handle different days of week', () => {
    const monday = isoWeekKey(new Date('2025-11-10')); // Monday
    const sunday = isoWeekKey(new Date('2025-11-16')); // Sunday
    expect(monday).toMatch(/^2025-W\d{2}$/);
    expect(sunday).toMatch(/^2025-W\d{2}$/);
  });

  it('should pad week numbers correctly', () => {
    const result = isoWeekKey(new Date('2025-01-05'));
    expect(result).toContain('-W0'); // Week should be padded
  });
});
