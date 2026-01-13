import { buildAliasResolver } from './aliases.ts';

describe('buildAliasResolver', () => {
  it('should return null resolver and empty canonicalDetails when config is undefined', () => {
    const { resolve, canonicalDetails } = buildAliasResolver();
    expect(resolve).toBeNull();
    expect(canonicalDetails.size).toBe(0);
  });

  it('should resolve mapped aliases', () => {
    const config = { map: { alice: 'alicia', bob: 'robert' } };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      expect(resolve('alice', 'Alice')).toBe('alicia');
      expect(resolve('bob', 'Bob')).toBe('robert');
    }
  });

  it('should resolve regex aliases', () => {
    const config = { map: { '/^A.+e$/': 'Alicia' } };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      expect(resolve('alice', 'Alice')).toBe('alicia');
    }
  });

  it('should resolve group aliases', () => {
    const config = { groups: [['alice', 'alicia', 'ali']] };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      expect(resolve('alice', 'Alice')).toBe('alice'); // canonical is 'alice'
      expect(resolve('ali', 'Ali')).toBe('alice');
    }
  });

  it('should resolve canonical details', () => {
    const config = { canonical: { alice: { name: 'Alicia', email: 'ali@example.com' } } };
    const { canonicalDetails } = buildAliasResolver(config);
    expect(canonicalDetails.get('alice')).toEqual({ name: 'Alicia', email: 'ali@example.com' });
  });
});

describe('buildAliasResolver edge cases', () => {
  it('should handle flat map structure', () => {
    const config = { alice: 'alicia', bob: 'robert' };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      expect(resolve('alice', 'Alice')).toBe('alicia');
      expect(resolve('bob', 'Bob')).toBe('robert');
    }
  });

  it('should skip invalid regex patterns', () => {
    const config = { map: { '/invalid[': 'broken' } };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      // Should resolve via string mapping, not regex
      expect(resolve('invalid', 'invalid')).toBe('broken');
    }
  });

  it('should use email as canonical in groups', () => {
    const config = { groups: [['ali', 'alice@example.com', 'alicia']] };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      expect(resolve('ali', 'Ali')).toBe('alice'); // canonical normalized from email
      expect(resolve('alicia', 'Alicia')).toBe('alice');
    }
  });

  it('should handle empty groups', () => {
    const config = { groups: [[]] };
    const { resolve } = buildAliasResolver(config);
    expect(resolve).not.toBeNull();
    if (resolve) {
      expect(resolve('any', 'Any')).toBe('any');
    }
  });

  it('should handle canonical details with missing name/email', () => {
    const config = { canonical: { bob: {} } };
    const { canonicalDetails } = buildAliasResolver(config);
    expect(canonicalDetails.get('bob')).toEqual({ name: undefined, email: undefined });
  });
});
