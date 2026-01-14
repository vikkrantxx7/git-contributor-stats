import { describe, expect, it } from 'vitest';
import { normalizeContributorName } from './normalization';

function cases(label: string, entries: Array<[string, string | undefined]>) {
  it(label, () => {
    for (const [input, expected] of entries) {
      expect(normalizeContributorName(input as string | undefined)).toBe(expected ?? '');
    }
  });
}

describe('normalizeContributorName', () => {
  cases('basic trimming, lowercasing, and email handling', [
    [' Alice ', 'alice'],
    ['bob@example.com', 'bob'],
    [undefined as unknown as string, ''],
    [null as unknown as string, ''],
    ['', ''],
    ['   \t\n  ', '']
  ]);

  cases('whitespace and punctuation normalization', [
    ['A   B', 'a b'],
    ['John     Doe', 'john doe'],
    ['John\t\nDoe', 'john doe'],
    ["O'Brien, John", 'obrien john']
  ]);

  cases('allowed characters and numbers', [
    ['john.doe_smith-jones', 'john.doe_smith-jones'],
    ['user123', 'user123'],
    ['john', 'john'],
    ['john.doe@company.com', 'john.doe'],
    ['JohnDoe@EXAMPLE.COM', 'johndoe'],
    ['Jöhn Döe', 'jhn de'],
    ['!!!John!!!', 'john'],
    ['!@#$%^&*()', ''],
    ['john.doe_smith', 'john.doe_smith'],
    ['mary-jane', 'mary-jane'],
    ['12345', '12345']
  ]);
});
