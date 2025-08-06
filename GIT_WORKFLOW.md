# Git Workflow Guide

This document outlines the Git workflow and development practices for the AI Prompting Guide Extension.

## Branching Strategy

We follow a **GitHub Flow** model with production-ready releases:

### Branch Types

- `main` - Production-ready code, protected branch
- `develop` - Development integration branch
- `feature/*` - Feature development branches
- `hotfix/*` - Critical production fixes
- `release/*` - Release preparation branches

### Branch Protection Rules

The `main` branch is protected with the following rules:
- Requires pull request reviews
- Requires status checks to pass
- Requires branches to be up to date
- Restricts pushes to administrators
- Requires signed commits (recommended)

## Development Workflow

### 1. Feature Development

```bash
# Start from main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push -u origin feature/your-feature-name
```

### 2. Commit Messages

We follow **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `build:` - Build system changes
- `ci:` - CI configuration changes
- `chore:` - Other changes that don't modify src or test files

#### Examples:
```bash
git commit -m "feat(popup): add dark mode toggle"
git commit -m "fix(content): resolve XSS vulnerability in input sanitization"
git commit -m "docs: update installation instructions"
git commit -m "chore(deps): update eslint to v9.0.0"
```

### 3. Pull Request Process

1. **Create PR** using the provided template
2. **Fill out all sections** including testing checklist
3. **Request reviews** from appropriate team members
4. **Address feedback** and update the PR
5. **Ensure all checks pass** (tests, security, linting)
6. **Merge** when approved and ready

### 4. Code Review Guidelines

#### For Authors:
- Keep PRs small and focused
- Write clear commit messages
- Fill out the PR template completely
- Test your changes thoroughly
- Respond promptly to feedback

#### For Reviewers:
- Review within 24 hours when possible
- Test critical changes locally
- Check security implications
- Verify Chrome extension compatibility
- Provide constructive feedback

## Quality Gates

### Pre-commit Hooks

Automated checks run before each commit:
- Code formatting (Prettier)
- Linting (ESLint)
- Security scanning
- Manifest validation
- Permission analysis

### Continuous Integration

All PRs and pushes trigger:
- **Unit Tests** - Fast, isolated tests
- **Integration Tests** - API and component integration
- **Security Tests** - XSS prevention, input validation
- **Performance Tests** - Memory usage, DOM impact
- **E2E Tests** - Full extension functionality
- **Browser Compatibility** - Chrome extension APIs
- **Code Quality Analysis** - Complexity, duplication

### Release Process

Releases are automated using semantic versioning:

1. **Commit** with conventional commit messages
2. **Semantic Release** analyzes commits and determines version
3. **Automated Testing** runs full test suite
4. **Package Creation** builds extension ZIP
5. **Security Validation** final security checks
6. **GitHub Release** created with artifacts
7. **Chrome Web Store Preparation** checklist generated

## Security Practices

### Commit Signing

Enable GPG commit signing for security:

```bash
# Configure GPG key
git config --global user.signingkey YOUR_GPG_KEY_ID
git config --global commit.gpgsign true

# Sign individual commits
git commit -S -m "feat: your commit message"
```

### Secrets Management

- **Never commit** API keys, passwords, or sensitive data
- Use `.gitignore` to exclude sensitive files
- **Pre-commit hooks** scan for secrets
- Store secrets in GitHub repository secrets

### Dependency Security

- **Dependabot** automatically updates dependencies
- **npm audit** runs on every build
- **Security patches** are auto-merged when tests pass
- **Vulnerability scanning** in CI/CD pipeline

## Chrome Extension Specific Practices

### Manifest Validation

Every commit validates:
- Manifest JSON structure
- Required fields presence
- Icon file existence
- Permission necessity
- CSP compliance

### Extension Testing

- **Unit tests** for individual functions
- **Integration tests** for Chrome APIs
- **Security tests** for XSS prevention
- **Performance tests** for memory usage
- **E2E tests** for user workflows

### Version Management

- **Semantic versioning** in manifest.json
- **Automated version bumping** on release
- **Changelog generation** from commit messages
- **Package integrity** verification with checksums

## Emergency Procedures

### Hotfix Process

For critical production issues:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# Make minimal fix
git add .
git commit -m "fix: critical security vulnerability"

# Push and create PR with priority label
git push -u origin hotfix/critical-fix
```

### Rollback Procedure

If a release causes issues:

1. **Identify** the problematic release
2. **Create hotfix** or revert commits
3. **Emergency release** with patch version
4. **Update Chrome Web Store** immediately

## Best Practices

### Development

- **Small, focused commits** with clear messages
- **Test thoroughly** before pushing
- **Keep dependencies updated** regularly
- **Document significant changes**

### Security

- **Scan for vulnerabilities** regularly
- **Validate all inputs** in extension code
- **Use CSP** to prevent XSS attacks
- **Minimize permissions** requested

### Performance

- **Profile memory usage** for content scripts
- **Optimize asset sizes** for faster loading
- **Monitor bundle size** growth
- **Test on slow networks**

## Tools and Commands

### Useful Git Commands

```bash
# View commit history with graph
git log --oneline --graph --all

# Interactive rebase to clean up commits
git rebase -i HEAD~3

# Check what will be committed
git diff --cached

# Stash work in progress
git stash push -m "work in progress on feature X"

# Apply stash
git stash pop
```

### Package Scripts

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:security
npm run test:e2e

# Lint and fix code
npm run lint:fix

# Validate extension
node scripts/validate-manifest.js
node scripts/check-permissions.js
```

### Pre-commit Setup

Install pre-commit hooks:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## Troubleshooting

### Common Issues

**Commit rejected by pre-commit hooks:**
- Run `npm run lint:fix` to fix formatting
- Check security scan output for issues
- Validate manifest with provided scripts

**CI tests failing:**
- Check test output in GitHub Actions
- Run tests locally: `npm test`
- Verify Chrome extension compatibility

**Merge conflicts:**
- Use `git merge-tool` or VS Code merge editor
- Test thoroughly after resolving conflicts
- Consider rebasing for cleaner history

### Getting Help

- Check existing issues and discussions
- Review CI logs for detailed error messages
- Ask team members for code review feedback
- Consult Chrome Extension documentation

---

This workflow ensures high-quality, secure releases while maintaining development velocity and code quality standards.