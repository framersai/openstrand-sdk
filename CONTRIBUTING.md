# Contributing to OpenStrand SDK

Thank you for your interest in contributing to the OpenStrand SDK! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/framersai/openstrand-monorepo.git
   cd openstrand-monorepo/packages/openstrand-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Build the package**
   ```bash
   npm run build
   ```

## Development Workflow

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Add tests for new functionality

4. Ensure all tests pass:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. Build and verify:
   ```bash
   npm run build
   ```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(sdk): add new feature` - New features
- `fix(sdk): fix bug` - Bug fixes
- `docs(sdk): update docs` - Documentation changes
- `test(sdk): add tests` - Test additions/changes
- `refactor(sdk): refactor code` - Code refactoring
- `chore(sdk): update deps` - Maintenance tasks

### Pull Requests

1. Push your branch to your fork
2. Open a pull request against `master`
3. Describe your changes clearly
4. Link any related issues
5. Wait for review and CI checks

## Code Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Provide JSDoc comments for public APIs
- Export types alongside implementations
- Use `interface` for object shapes, `type` for unions/intersections

### Testing

- Write unit tests for all new functionality
- Aim for >50% code coverage
- Use descriptive test names
- Mock external dependencies

### Documentation

- Update README.md for user-facing changes
- Add TSDoc comments for all public APIs
- Include code examples in documentation
- Update CHANGELOG.md

## Project Structure

```
packages/openstrand-sdk/
├── src/
│   ├── client.ts       # Main SDK client
│   ├── types.ts        # Type definitions
│   ├── errors.ts       # Error classes
│   ├── storage.ts      # Offline storage helpers
│   └── storage/        # Storage adapters
├── tests/              # Test files
├── README.md           # Package documentation
├── CHANGELOG.md        # Version history
└── package.json        # Package configuration
```

## Release Process

Releases are automated via semantic-release:

1. Merge PRs to `master`
2. semantic-release analyzes commits
3. Determines version bump (major/minor/patch)
4. Updates CHANGELOG.md
5. Publishes to npm
6. Creates GitHub release

Manual publish (maintainers only):
```bash
npm run build
npm publish --access public
```

## Getting Help

- **Issues**: https://github.com/framersai/openstrand-monorepo/issues
- **Discussions**: https://github.com/framersai/openstrand-monorepo/discussions
- **Email**: team@frame.dev

## Code of Conduct

Be respectful, inclusive, and constructive. See our [Code of Conduct](../../CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

