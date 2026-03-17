#!/usr/bin/env node
// Prepares a package.json in dist/packages/<name> for publishing:
// - Rewrites dist-prefixed paths to root-relative paths
// - Resolves workspace:* dependencies to their actual versions
// - Removes the scripts field

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgName = process.argv[2];

if (!pkgName) {
  console.error('Usage: prepare-dist.mjs <package-name>');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'packages', pkgName, 'package.json'), 'utf8'));

// Rewrite top-level path fields
for (const field of ['main', 'module', 'types', 'typings']) {
  if (pkg[field]) {
    pkg[field] = pkg[field].replace(/^(\.\/)?dist\//, './');
  }
}

// Rewrite exports paths
if (pkg.exports) {
  pkg.exports = rewritePaths(pkg.exports);
}

// Resolve workspace:* to actual versions
for (const depField of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  if (!pkg[depField]) continue;
  for (const [dep, version] of Object.entries(pkg[depField])) {
    if (version === 'workspace:*') {
      const depPkg = JSON.parse(readFileSync(join(root, 'packages', dep, 'package.json'), 'utf8'));
      pkg[depField][dep] = depPkg.version;
    }
  }
}

delete pkg.scripts;

const outPath = join(root, 'dist', 'packages', pkgName, 'package.json');
writeFileSync(outPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Wrote ${outPath}`);

function rewritePaths(value) {
  if (typeof value === 'string') return value.replace(/^(\.\/)?dist\//, './');
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewritePaths(v)]));
  }
  return value;
}
