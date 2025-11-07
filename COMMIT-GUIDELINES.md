# Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope (optional)

The scope should be the name of the module/feature affected (e.g., `cli`, `analytics`, `charts`, `reports`).

### Subject

The subject contains a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No dot (.) at the end

## Examples

### Simple commit
```bash
git commit -m "feat: add support for custom date ranges"
```

### Commit with scope
```bash
git commit -m "fix(charts): resolve timezone parsing issue"
```

### Commit with body
```bash
git commit -m "feat(cli): add new output format option

Add support for XML output format alongside existing JSON, CSV, and HTML formats.
This allows integration with tools that require XML input."
```

### Breaking change
```bash
git commit -m "feat(api)!: change statistics API response format

BREAKING CHANGE: The statistics API now returns an object with nested properties.
Instead of a flat structure. update your code accordingly."
```

## Validation

Commit messages are automatically validated using commitlint when you run `git commit`.

If your commit message doesn't follow the format, the commit will be rejected with a helpful error message.

## Manual Validation

You can manually validate the last commit message:

```bash
npm run commitlint
```

