# GitHub Actions Setup

This guide explains how to configure GitHub for automated releases with NPM provenance.

## 🔐 NPM Publishing with Provenance (Recommended - 2024+)

NPM now supports **trusted publishing** using OIDC authentication, which provides:
- ✅ **No token storage** - More secure
- ✅ **Automatic provenance** - Supply chain transparency  
- ✅ **Attestations** - Verifiable build artifacts
- ✅ **Protection** against supply chain attacks

### Option A: Granular Access Token (Current Method)

**⚠️ Important:** As of 2024, NPM requires **granular access tokens** (legacy automation tokens are deprecated).

#### Steps:

1. **Log in to npmjs.com:**
   - Go to https://www.npmjs.com
   - Sign in to your account

2. **Generate Granular Access Token:**
   - Click your profile → `Access Tokens`
   - Click `Generate New Token` → **`Granular Access Token`**
   - Token name: `GitHub Actions - git-contributor-stats`
   - Expiration: 90 days (or custom)
   - Packages and scopes:
     - Select: **Read and write**
     - Package: `git-contributor-stats` (or your package name)
   - IP allowlist: Leave empty (GitHub Actions IPs change)
   - Click `Generate Token`
   - **Copy the token immediately** (you won't see it again!)

3. **Add to GitHub Secrets:**
   - Go to your repository on GitHub
   - Navigate to `Settings` → `Secrets and variables` → `Actions`
   - Click `New repository secret`
   - Name: `NPM_TOKEN`
   - Value: Paste your granular token
   - Click `Add secret`

### Option B: Trusted Publishing with OIDC (Future - Experimental)

NPM is rolling out **trusted publishing** using OpenID Connect (OIDC). This eliminates the need for tokens entirely.

**Status:** Currently in beta for npm. When available:
- No token management needed
- Automatic provenance attestation
- More secure (no credentials stored)

**Setup:** (When available on npmjs.com)
1. Go to package settings on npmjs.com
2. Enable "Trusted Publishing"
3. Configure GitHub Actions as trusted publisher
4. Remove NPM_TOKEN from secrets

### 2. GITHUB_TOKEN (Automatically provided)

The `GITHUB_TOKEN` is automatically provided by GitHub Actions. No setup needed!

It's used to:
- Create and update Pull Requests
- Create GitHub releases
- Add comments and labels

## Workflow Permissions

The workflows need specific permissions to function:

### Repository Settings

1. Go to `Settings` → `Actions` → `General`
2. Scroll to "Workflow permissions"
3. Select **"Read and write permissions"**
4. Check **"Allow GitHub Actions to create and approve pull requests"**
5. Click `Save`

## Verifying Setup

### Test the Release Workflow

1. Create a new branch:
   ```bash
   git checkout -b test/release-setup
   ```

2. Add a changeset:
   ```bash
   npx changeset
   # Select patch
   # Summary: "test release automation setup"
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify release automation"
   git push origin test/release-setup
   ```

4. Create a PR and verify:
   - ✅ Changeset check workflow should pass
   - ✅ After merging, release workflow should create "Version Packages" PR

5. Merge the "Version Packages" PR:
   - ✅ Package should be published to npm
   - ✅ GitHub release should be created
   - ✅ CHANGELOG.md should be updated

## 📦 NPM Provenance & Supply Chain Security

### What is Provenance?

NPM provenance provides **cryptographic proof** that your package was built by GitHub Actions from your source code.

**Enabled by default in this workflow!** ✅

### Benefits

1. **Supply Chain Transparency**
   - Users can verify package authenticity
   - Links package to exact source code commit
   - Shows which GitHub Actions workflow built it

2. **Protection Against Attacks**
   - Prevents package tampering
   - Detects compromised build processes
   - Mitigates supply chain attacks

3. **Trust Badge**
   - Package page shows verified provenance
   - Builds user confidence
   - Industry best practice

### How It Works

1. **Automatic:** Workflow sets `NPM_CONFIG_PROVENANCE: true`
2. **GitHub signs:** Build artifacts are cryptographically signed
3. **NPM verifies:** Signature verified during publish
4. **Users see:** Provenance badge on npmjs.com

### Verifying Provenance

Users can verify your package:

```bash
# View provenance information
npm view git-contributor-stats --json | jq .provenance

# Verify package integrity
npm audit signatures
```

### What's Published

- ✅ Source repository URL
- ✅ Commit SHA that triggered build
- ✅ GitHub Actions workflow file
- ✅ Runner environment details
- ✅ Cryptographic signature

## Troubleshooting

### "Error: npm publish failed"

**Cause:** NPM_TOKEN is missing, expired, or invalid

**Fix:**
1. Verify NPM_TOKEN is set in GitHub Secrets
2. Check token hasn't expired (granular tokens expire)
3. Ensure token has **Read and write** permissions for the package
4. Verify package name matches the token scope
5. Regenerate token if needed (old automation tokens don't work)

### "Error: 403 Forbidden" or "E403"

**Cause:** Token doesn't have permission for this package

**Fix:**
1. Ensure you're using a **granular access token** (not legacy)
2. Token must have **Read and write** scope
3. Package name in token must match `package.json` name
4. Verify you're a maintainer of the package on npmjs.com

### "Error: Resource not accessible by integration"

**Cause:** Insufficient workflow permissions

**Fix:**
1. Enable "Read and write permissions" in repository settings
2. Enable "Allow GitHub Actions to create and approve pull requests"

### "No changeset found" error in PR

**Cause:** PR doesn't have a changeset file

**Fix:**
- Run `npx changeset` and commit the file, OR
- Add `[skip-changeset]` to PR title if no version bump needed, OR
- Add `no-changeset` label to PR

### Release workflow doesn't trigger

**Cause:** Workflow file might have syntax errors

**Fix:**
1. Check `.github/workflows/release.yml` for YAML syntax errors
2. Verify the workflow is enabled in GitHub Actions tab
3. Check that pushes to `main` branch trigger the workflow

## Security Best Practices

### NPM Token Security
1. **Use granular access tokens** (required as of 2024)
2. **Scope to specific package** - Don't use tokens with access to all packages
3. **Set expiration** - 90 days recommended (force periodic rotation)
4. **Never commit tokens** to the repository
5. **Rotate tokens before expiry** - Set calendar reminder
6. **Revoke unused tokens** - Clean up old tokens regularly

### Repository Security
7. **Enable provenance** - Adds supply chain transparency (enabled in workflow)
8. **Use branch protection** on `main` to require PR reviews
9. **Require signed commits** (optional but recommended)
10. **Enable Dependabot** for security updates

### Monitoring
11. **Watch token usage** - Check npmjs.com for token activity
12. **Monitor package downloads** - Detect unusual patterns
13. **Review GitHub Actions logs** - Check for failed auth attempts

## Branch Protection (Recommended)

Protect your `main` branch to ensure quality:

1. Go to `Settings` → `Branches`
2. Add rule for `main` branch
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
     - Select: `Check for Changeset`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Tokens Documentation](https://docs.npmjs.com/about-access-tokens)
- [Changesets GitHub Action](https://github.com/changesets/action)

