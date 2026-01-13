import { isoWeekKey, parseDateInput } from './dates';

describe('parseDateInput', () => {
  it('should return undefined for empty input', () => {
    expect(parseDateInput()).toBeUndefined();
    expect(parseDateInput('')).toBeUndefined();
  });

  it('should parse relative days', () => {
    const result = parseDateInput('2.days');
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(2); // 2 days ago
    } else {
      throw new Error('parseDateInput did not return a date string');
    }
  });

  it('should parse relative day (singular)', () => {
    const result = parseDateInput('1.day');
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(1); // 1 day ago
    } else {
      throw new Error('parseDateInput did not return a date string');
    }
  });

  it('should parse relative weeks', () => {
    const result = parseDateInput('2.weeks');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(14); // 2 weeks = 14 days
    }
  });

  it('should parse relative week (singular)', () => {
    const result = parseDateInput('1.week');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(7); // 1 week = 7 days
    }
  });

  it('should parse relative months', () => {
    const result = parseDateInput('2.months');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(60); // 2 months = ~60 days
    }
  });

  it('should parse relative month (singular)', () => {
    const result = parseDateInput('1.month');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(30); // 1 month = ~30 days
    }
  });

  it('should parse relative years', () => {
    const result = parseDateInput('1.years');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(365); // 1 year = 365 days
    }
  });

  it('should parse relative year (singular)', () => {
    const result = parseDateInput('1.year');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(365); // 1 year = 365 days
    }
  });

  it('should handle uppercase units', () => {
    const result = parseDateInput('3.DAYS');
    expect(result).toBeDefined();
    if (result) {
      const d = new Date(result);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(3);
    }
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
