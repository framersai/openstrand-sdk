# Changelog

All notable changes to `@framers/openstrand-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of OpenStrand SDK
- Type-safe client for OpenStrand backend APIs
- Support for authentication (JWT and API keys)
- CRUD operations for strands, collections, weaves
- Search and visualization APIs
- Import/export functionality
- Offline storage helpers with sql-storage-adapter
- Automatic edition detection (Community vs Teams)
- Comprehensive TypeScript types
- Full TSDoc documentation

### Features
- Works in Node.js, browsers, and serverless runtimes
- Automatic retry logic with exponential backoff
- Custom headers and request interceptors
- Debug mode for development
- Tree-shakeable exports

## [0.1.0] - 2025-11-11

### Added
- Initial public release
- Core SDK functionality
- TypeScript types
- Error handling classes
- Basic documentation

[Unreleased]: https://github.com/framersai/openstrand-monorepo/compare/sdk-v0.1.0...HEAD
[0.1.0]: https://github.com/framersai/openstrand-monorepo/releases/tag/sdk-v0.1.0

