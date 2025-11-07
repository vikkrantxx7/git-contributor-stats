import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'build', // Build system or dependencies
        'ci', // CI configuration changes
        'chore', // Other changes that don't modify src or test files
        'revert' // Reverts a previous commit
      ]
    ],
    'subject-case': [0] // Disable case checking for flexibility
  }
};

export default config;
