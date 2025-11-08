# Contributing to git-contributor-stats

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/git-contributor-stats.git
   cd git-contributor-stats
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```

## 📝 Development Workflow

### 1. Make Your Changes

- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 2. Run Tests and Linters

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run type checking
npm run typeCheck

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check test coverage
npm run coverage
```

### 3. Commit Your Changes

This project uses [Conventional Commits](./COMMIT-GUIDELINES.md). Your commit messages must follow this format:

```bash
# Good examples
git commit -m "feat: add support for custom date ranges"
git commit -m "fix(charts): resolve timezone parsing issue"
git commit -m "docs: update API documentation"

# Bad examples
git commit -m "added feature"
git commit -m "Fixed bug"
git commit -m "Updates"
```

**Commit messages are automatically validated** by commitlint. Invalid commits will be rejected.

See [COMMIT-GUIDELINES.md](./COMMIT-GUIDELINES.md) for detailed guidelines.

### 4. Add a Changeset

Every PR that changes functionality must include a changeset:

```bash
npx changeset
```

This will prompt you to:
1. Select the bump type (patch/minor/major)
2. Write a summary of your changes

**Skip changeset only for:**
- Documentation-only changes
- Configuration/tooling changes
- Add `[skip-changeset]` to PR title or `no-changeset` label

See [RELEASE.md](./RELEASE.md) for detailed changeset workflow.

### 5. Push and Create PR

```bash
git push origin feature/amazing-feature
```

Then create a Pull Request on GitHub. The PR template will guide you through the required information.

## 🎯 Contribution Guidelines

### Code Style

- Use TypeScript
- Follow existing patterns
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- Write tests for new features
- Update tests when changing behavior
- Aim for high test coverage
- Test both success and error cases

### Documentation

Update documentation when you:
- Add new features
- Change existing behavior
- Add new CLI options
- Modify the API

Files to update:
- `README.md` - Main documentation
- `docs/QUICK-START.md` - Usage examples
- `docs/QUICK-REFERENCE.md` - Command reference
- `docs/technical/TECHNICAL.md` - Technical details

## 🐛 Reporting Bugs

Found a bug? Please [open an issue](https://github.com/vikkrantxx7/git-contributor-stats/issues/new) with:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node version, OS)
- Relevant error messages/logs

## 💡 Suggesting Features

Have an idea? Please [open an issue](https://github.com/vikkrantxx7/git-contributor-stats/issues/new) with:

- Clear description of the feature
- Use cases and benefits
- Examples of how it would work
- Any relevant references

## 📦 Project Structure

```
git-contributor-stats/
├── src/
│   ├── features/          # Modular feature exports
│   ├── cli/              # CLI implementation
│   ├── analytics/        # Core analytics logic
│   ├── charts/           # Chart generation
│   ├── git/              # Git operations
│   ├── reports/          # Report generation
│   └── utils/            # Utilities
├── tests/
│   ├── e2e/              # End-to-end tests
│   └── utils/            # Test utilities
├── docs/                 # Documentation
├── scripts/              # Build/utility scripts
└── dist/                 # Built files (generated)
```

## 🔄 Release Process

Releases are automated via GitHub Actions. See [RELEASE.md](./RELEASE.md) for details.

**As a contributor, you only need to:**
1. Add a changeset with your changes
2. Maintainers will handle the release

## 📚 Additional Resources

- [Commit Guidelines](./COMMIT-GUIDELINES.md) - Conventional commits format
- [Release Workflow](./RELEASE.md) - Version management with changesets
- [Technical Documentation](../technical/TECHNICAL.md) - Architecture details
- [Quick Start Guide](../QUICK-START.md) - Usage examples
- [Quick Reference](../QUICK-REFERENCE.md) - Command cheat sheet

## ❓ Questions?

- Check the [documentation](../README.md)
- Search [existing issues](https://github.com/vikkrantxx7/git-contributor-stats/issues)
- Open a new issue for discussion

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉

