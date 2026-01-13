import { describe, expect, it } from 'vitest';
import { buildAliasResolver } from './aliases.ts';

function assertResolve(config: unknown, cases: Array<[string, string, string]>) {
  const { resolve } = buildAliasResolver(config as never);
  expect(resolve).not.toBeNull();
  if (!resolve) return;
  for (const [email, name, expected] of cases) {
    expect(resolve(email, name)).toBe(expected);
  }
}

describe('buildAliasResolver', () => {
  it('should return null resolver and empty canonicalDetails when config is undefined', () => {
    const { resolve, canonicalDetails } = buildAliasResolver();
    expect(resolve).toBeNull();
    expect(canonicalDetails.size).toBe(0);
  });

  it('should resolve mapped aliases', () => {
    assertResolve({ map: { alice: 'alicia', bob: 'robert' } }, [
      ['alice', 'Alice', 'alicia'],
      ['bob', 'Bob', 'robert']
    ]);
  });

  it('should resolve regex aliases', () => {
    assertResolve({ map: { '/^A.+e$/': 'Alicia' } }, [['alice', 'Alice', 'alicia']]);
  });

  it('should resolve group aliases', () => {
    assertResolve({ groups: [['alice', 'alicia', 'ali']] }, [
      ['alice', 'Alice', 'alice'],
      ['ali', 'Ali', 'alice']
    ]);
  });

  it('should resolve canonical details', () => {
    const config = { canonical: { alice: { name: 'Alicia', email: 'ali@example.com' } } };
    const { canonicalDetails } = buildAliasResolver(config);
    expect(canonicalDetails.get('alice')).toEqual({ name: 'Alicia', email: 'ali@example.com' });
  });
});

describe('buildAliasResolver edge cases', () => {
  it('should handle flat map structure', () => {
    assertResolve({ alice: 'alicia', bob: 'robert' }, [
      ['alice', 'Alice', 'alicia'],
      ['bob', 'Bob', 'robert']
    ]);
  });

  it('should skip invalid regex patterns', () => {
    assertResolve({ map: { '/invalid[': 'broken' } }, [['invalid', 'invalid', 'broken']]);
  });

  it('should use email as canonical in groups', () => {
    assertResolve({ groups: [['ali', 'alice@example.com', 'alicia']] }, [
      ['ali', 'Ali', 'alice'],
      ['alicia', 'Alicia', 'alice']
    ]);
  });

  it('should handle empty groups', () => {
    assertResolve({ groups: [[]] }, [['any', 'Any', 'any']]);
  });

  it('should handle canonical details with missing name/email', () => {
    const config = { canonical: { bob: {} } };
    const { canonicalDetails } = buildAliasResolver(config);
    expect(canonicalDetails.get('bob')).toEqual({ name: undefined, email: undefined });
  });
});
