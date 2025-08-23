# Git Hooks Setup

This project uses Git hooks to enforce code quality standards automatically.

## 🪝 Hooks Configured

### Pre-commit Hook
- **Purpose**: Runs before every commit
- **Actions**:
  - Runs ESLint on staged JavaScript files
  - Automatically fixes auto-fixable issues
  - Prevents commit if linting fails

### Pre-push Hook
- **Purpose**: Runs before pushing to remote
- **Actions**:
  - Runs full validation (linting + tests)
  - Ensures code quality before deployment
  - Prevents push if validation fails

### Commit-msg Hook
- **Purpose**: Validates commit message format
- **Requirements**:
  - Must be at least 10 characters long
  - Must start with a capital letter
  - Cannot be empty

## 🛠️ Setup

The hooks are automatically installed when you run:
```bash
npm install
```

## 📋 Usage

### Normal Development Flow
```bash
# Make changes
git add .
git commit -m "Your commit message"  # Pre-commit hook runs
git push origin main                  # Pre-push hook runs
```

### If Hooks Fail
1. **Linting Errors**: Fix the issues and commit again
2. **Test Failures**: Fix failing tests and push again
3. **Commit Message**: Use a proper commit message format

### Bypassing Hooks (Emergency Only)
```bash
# Skip pre-commit hook
git commit -m "Emergency fix" --no-verify

# Skip pre-push hook
git push origin main --no-verify
```

## 🔧 Configuration

### Lint-staged Configuration
```json
{
  "lint-staged": {
    "*.js": [
      "eslint --fix"
    ]
  }
}
```

### Hook Files
- `.husky/pre-commit` - Pre-commit checks
- `.husky/pre-push` - Pre-push validation
- `.husky/commit-msg` - Commit message validation

## 🎯 Benefits

1. **Automatic Code Quality**: No more forgetting to run linting
2. **Consistent Standards**: All commits follow the same quality rules
3. **CI/CD Safety**: Prevents broken code from reaching production
4. **Team Collaboration**: Everyone follows the same standards

## 🚨 Troubleshooting

### Hook Not Running
```bash
# Reinstall hooks
npm run prepare
```

### Permission Issues
```bash
# Make hooks executable
chmod +x .husky/*
```

### Linting Issues
```bash
# Run linting manually
npm run lint
npm run lint:fix
``` 