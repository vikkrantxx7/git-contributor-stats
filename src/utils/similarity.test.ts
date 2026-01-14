import { calculateSimilarityScore, levenshteinDistance } from './similarity';

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });
  it('should return length of other string for empty input', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });
  it('should calculate correct distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('should handle both empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('should handle single character strings', () => {
    expect(levenshteinDistance('a', 'b')).toBe(1);
    expect(levenshteinDistance('a', 'a')).toBe(0);
  });

  it('should handle insertions', () => {
    expect(levenshteinDistance('abc', 'abcd')).toBe(1);
  });

  it('should handle deletions', () => {
    expect(levenshteinDistance('abcd', 'abc')).toBe(1);
  });

  it('should handle substitutions', () => {
    expect(levenshteinDistance('abc', 'axc')).toBe(1);
  });

  it('should handle multiple operations', () => {
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
  });

  it('should handle completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });

  it('should handle different length strings', () => {
    expect(levenshteinDistance('short', 'verylongstring')).toBe(12);
  });

  it('should handle case sensitivity', () => {
    expect(levenshteinDistance('ABC', 'abc')).toBe(3);
  });
});

describe('calculateSimilarityScore', () => {
  it('should return 1 for identical strings', () => {
    expect(calculateSimilarityScore('abc', 'abc')).toBe(1);
  });
  it('should return 0 for completely different strings', () => {
    expect(calculateSimilarityScore('abc', 'xyz')).toBe(0);
  });
  it('should calculate similarity for similar strings', () => {
    expect(calculateSimilarityScore('alice', 'alicia')).toBeGreaterThan(0.5);
  });

  it('should handle empty strings', () => {
    expect(calculateSimilarityScore('', '')).toBe(1);
  });

  it('should handle one empty string', () => {
    expect(calculateSimilarityScore('', 'abc')).toBe(0);
    expect(calculateSimilarityScore('abc', '')).toBe(0);
  });

  it('should be case-insensitive', () => {
    expect(calculateSimilarityScore('ABC', 'abc')).toBe(1);
    expect(calculateSimilarityScore('Alice', 'alice')).toBe(1);
  });

  it('should calculate correct similarity for Jon/John', () => {
    const score = calculateSimilarityScore('jon', 'john');
    expect(score).toBe(0.75); // 1 - 1/4
  });

  it('should calculate correct similarity for Steven/Stephen', () => {
    const score = calculateSimilarityScore('steven', 'stephen');
    // steven → stephen: substitute v→p, insert h = 2 edits, 7 chars max
    // 1 - 2/7 = 0.7142857142857143
    expect(score).toBeCloseTo(1 - 2 / 7, 5);
  });

  it('should calculate correct similarity for Michael/Mike', () => {
    const score = calculateSimilarityScore('michael', 'mike');
    // michael → mike: substitute c→k, delete h,a,l = 4 edits, 7 chars max
    // 1 - 4/7 = 0.5714285714285714
    expect(score).toBeCloseTo(1 - 4 / 7, 5);
  });

  it('should handle single character difference', () => {
    const score = calculateSimilarityScore('test', 'best');
    expect(score).toBe(0.75); // 1 - 1/4
  });

  it('should handle transpositions', () => {
    const score = calculateSimilarityScore('form', 'from');
    expect(score).toBe(0.5); // 1 - 2/4
  });

  it('should handle strings of different lengths', () => {
    const score = calculateSimilarityScore('cat', 'catch');
    expect(score).toBe(0.6); // 1 - 2/5
  });

  it('should return value between 0 and 1', () => {
    const score1 = calculateSimilarityScore('abc', 'xyz');
    const score2 = calculateSimilarityScore('abc', 'abc');
    const score3 = calculateSimilarityScore('abc', 'abx');

    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score1).toBeLessThanOrEqual(1);
    expect(score2).toBeGreaterThanOrEqual(0);
    expect(score2).toBeLessThanOrEqual(1);
    expect(score3).toBeGreaterThanOrEqual(0);
    expect(score3).toBeLessThanOrEqual(1);
  });

  it('should handle mixed case correctly', () => {
    const score = calculateSimilarityScore('JoHn', 'jOhN');
    expect(score).toBe(1);
  });
});
