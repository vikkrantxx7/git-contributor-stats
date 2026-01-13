import { normalizeContributorName } from './normalization';

describe('normalizeContributorName', () => {
  it('should lowercase and trim names', () => {
    expect(normalizeContributorName(' Alice ')).toBe('alice');
  });
  it('should remove email domain', () => {
    expect(normalizeContributorName('bob@example.com')).toBe('bob');
  });
  it('should remove non-alphanumeric characters', () => {
    expect(normalizeContributorName('A!l@i#c$e%')).toBe('al');
  });
  it('should collapse whitespace', () => {
    expect(normalizeContributorName('A   B')).toBe('a b');
  });
  it('should handle empty input', () => {
    expect(normalizeContributorName()).toBe('');
  });

  it('should handle null input', () => {
    expect(normalizeContributorName(null as unknown as string)).toBe('');
  });

  it('should handle undefined input', () => {
    expect(normalizeContributorName(undefined)).toBe('');
  });

  it('should preserve allowed special characters (dots, underscores, hyphens)', () => {
    expect(normalizeContributorName('john.doe_smith-jones')).toBe('john.doe_smith-jones');
  });

  it('should handle names with numbers', () => {
    expect(normalizeContributorName('user123')).toBe('user123');
  });

  it('should handle multiple spaces', () => {
    expect(normalizeContributorName('John     Doe')).toBe('john doe');
  });

  it('should handle tabs and newlines', () => {
    expect(normalizeContributorName('John\t\nDoe')).toBe('john doe');
  });

  it('should handle email-like strings without @', () => {
    expect(normalizeContributorName('john')).toBe('john');
  });

  it('should remove everything after @ including domain', () => {
    expect(normalizeContributorName('john.doe@company.com')).toBe('john.doe');
  });

  it('should handle mixed case email', () => {
    expect(normalizeContributorName('JohnDoe@EXAMPLE.COM')).toBe('johndoe');
  });

  it('should handle special unicode characters', () => {
    expect(normalizeContributorName('Jöhn Döe')).toBe('jhn de');
  });

  it('should handle leading and trailing special characters', () => {
    expect(normalizeContributorName('!!!John!!!')).toBe('john');
  });

  it('should handle names with only special characters', () => {
    expect(normalizeContributorName('!@#$%^&*()')).toBe('');
  });

  it('should handle names with dots and underscores', () => {
    expect(normalizeContributorName('john.doe_smith')).toBe('john.doe_smith');
  });

  it('should handle names with hyphens', () => {
    expect(normalizeContributorName('mary-jane')).toBe('mary-jane');
  });

  it('should handle complex real-world names', () => {
    expect(normalizeContributorName("O'Brien, John")).toBe('obrien john');
  });

  it('should handle numeric strings', () => {
    expect(normalizeContributorName('12345')).toBe('12345');
  });

  it('should handle empty string input', () => {
    expect(normalizeContributorName('')).toBe('');
  });

  it('should handle whitespace-only input', () => {
    expect(normalizeContributorName('   \t\n  ')).toBe('');
  });
});
