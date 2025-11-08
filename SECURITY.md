# Security Policy

## 🔐 Supply Chain Security

### NPM Provenance ✅

All published packages include **cryptographic provenance attestations** that prove:
- Package was built by GitHub Actions from verified source code
- Build process was not tampered with
- Package contents match the committed code

**Verify package authenticity:**
```bash
npm view git-contributor-stats --json | jq .provenance
npm audit signatures
```

### Publishing Security

- ✅ **Automated releases** via GitHub Actions
- ✅ **Granular NPM tokens** (scoped to this package, 90-day expiration)
- ✅ **No secrets in repository**
- ✅ **Full audit trail** in GitHub Actions logs

### Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Auto-fix (when possible)
npm audit fix
```

## 🛡️ Security Features

- ✅ **Automated validation:** Pre-commit hooks (lint, typecheck, format)
- ✅ **Conventional commits:** Commitlint enforces message format
- ✅ **Branch protection:** PR reviews required, no direct pushes to main
- ✅ **Release security:** Automated changelog, provenance attestations
- ✅ **Dependency scanning:** Automated security updates via Dependabot

## 🚨 Reporting a Vulnerability

**Please do not open public issues for security vulnerabilities.**

**Report privately:**
- **Email:** vikkrant.xx7@gmail.com
- **Subject:** `[SECURITY] git-contributor-stats vulnerability`
- **Include:** Description, steps to reproduce, potential impact

**Response timeline:**
- Initial response: Within 48 hours
- Fix timeline: Based on severity (1 week for critical, 2 weeks for high)

We follow **coordinated disclosure** - issues are fixed privately before public announcement.

## 🔍 Package Verification

Every published package includes provenance linking to:
- Exact source code commit
- GitHub Actions workflow that built it
- Cryptographic signature

**Verify authenticity:**
```bash
# Check provenance
npm view git-contributor-stats

# Verify signature
npm audit signatures
```

## 🎯 For Contributors

**When contributing:**
- Keep dependencies updated (`npm audit fix`)
- Never commit secrets (use `.env` files)
- Review new dependencies carefully
- Sign commits (recommended)

**When reviewing PRs:**
- Check for exposed secrets
- Review dependency changes
- Verify tests pass
- Validate changeset

## 📋 For Maintainers

**Regular tasks:**
- Rotate NPM token every 90 days
- Review GitHub Actions logs
- Merge Dependabot PRs promptly

**Before releases:**
- Tests passing ✓
- No known vulnerabilities ✓
- Dependencies updated ✓

**If compromised:**
- Revoke tokens immediately
- Publish patched version
- Notify users via GitHub release

## 📚 Resources

- [NPM Provenance Documentation](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
- [OpenSSF Best Practices](https://openssf.org/)

## ✅ Compliance

This project follows:
- **SLSA Level 2** - Build provenance
- **Semantic Versioning** - Clear versioning
- **Conventional Commits** - Traceable changes

---

We appreciate responsible disclosure of security vulnerabilities.

**Last Updated:** November 8, 2025

For questions about security, contact: vikkrant.xx7@gmail.com

