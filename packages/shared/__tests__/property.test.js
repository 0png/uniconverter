/**
 * Property Tests for Monorepo Structure
 * 
 * These tests verify the structural properties of the monorepo:
 * - Property 1: Workspace Protocol Compliance
 * - Property 2: Shared Package Isolation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

/**
 * Property 1: Workspace Protocol Compliance
 * All internal dependencies must use workspace:* protocol
 * Validates: Requirements 1.5, 3.1, 3.2, 3.3, 4.4, 5.4
 */
describe('Property 1: Workspace Protocol Compliance', () => {
  const internalPackages = [
    '@uniconvert/shared',
    '@uniconvert/converters',
    '@uniconvert/renderer',
    '@uniconvert/electron-app'
  ];

  const packagePaths = [
    'packages/shared/package.json',
    'packages/converters/package.json',
    'packages/renderer/package.json',
    'packages/electron-app/package.json'
  ];

  it('all internal dependencies use workspace:* protocol', () => {
    const violations = [];

    for (const pkgPath of packagePaths) {
      const fullPath = join(rootDir, pkgPath);
      if (!existsSync(fullPath)) continue;

      const pkg = JSON.parse(readFileSync(fullPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [depName, depVersion] of Object.entries(deps)) {
        if (internalPackages.includes(depName)) {
          if (!depVersion.startsWith('workspace:')) {
            violations.push({
              package: pkg.name,
              dependency: depName,
              version: depVersion,
              expected: 'workspace:*'
            });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('property: any internal dependency reference uses workspace protocol', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...packagePaths),
        (pkgPath) => {
          const fullPath = join(rootDir, pkgPath);
          if (!existsSync(fullPath)) return true;

          const pkg = JSON.parse(readFileSync(fullPath, 'utf-8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          for (const [depName, depVersion] of Object.entries(deps)) {
            if (internalPackages.includes(depName)) {
              if (!depVersion.startsWith('workspace:')) {
                return false;
              }
            }
          }
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * Property 2: Shared Package Isolation
 * The shared package must not depend on any other internal packages
 * Validates: Requirements 3.4
 */
describe('Property 2: Shared Package Isolation', () => {
  const internalPackages = [
    '@uniconvert/converters',
    '@uniconvert/renderer',
    '@uniconvert/electron-app'
  ];

  it('shared package has no internal dependencies', () => {
    const sharedPkgPath = join(rootDir, 'packages/shared/package.json');
    const pkg = JSON.parse(readFileSync(sharedPkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const internalDeps = Object.keys(deps).filter(dep => 
      internalPackages.includes(dep)
    );

    expect(internalDeps).toEqual([]);
  });

  it('shared package source files do not import internal packages', () => {
    const sharedSrcFiles = [
      'packages/shared/src/index.js',
      'packages/shared/src/config.js',
      'packages/shared/src/version.js'
    ];

    const violations = [];

    for (const filePath of sharedSrcFiles) {
      const fullPath = join(rootDir, filePath);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf-8');
      
      for (const pkg of internalPackages) {
        if (content.includes(`from '${pkg}'`) || 
            content.includes(`from "${pkg}"`) ||
            content.includes(`require('${pkg}')`) ||
            content.includes(`require("${pkg}")`)) {
          violations.push({
            file: filePath,
            importedPackage: pkg
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('property: shared package remains isolated from other internal packages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...internalPackages),
        (internalPkg) => {
          const sharedPkgPath = join(rootDir, 'packages/shared/package.json');
          const pkg = JSON.parse(readFileSync(sharedPkgPath, 'utf-8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          return !Object.keys(deps).includes(internalPkg);
        }
      ),
      { numRuns: 10 }
    );
  });
});
