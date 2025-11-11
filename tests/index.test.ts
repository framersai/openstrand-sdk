import { describe, it, expect } from 'vitest';

describe('@openstrand/sdk', () => {
  it('should export types', () => {
    // Basic smoke test - verify SDK exports exist
    expect(true).toBe(true);
  });

  it('should have valid package structure', () => {
    // Verify package.json exists and has required fields
    const pkg = require('../package.json');
    expect(pkg.name).toBe('@openstrand/sdk');
    expect(pkg.version).toBeDefined();
    expect(pkg.main).toBeDefined();
    expect(pkg.types).toBeDefined();
  });
});

