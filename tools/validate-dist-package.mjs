#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgName = process.argv[2];

if (!pkgName) {
  console.error('Usage: validate-dist-package.mjs <package-name>');
  process.exit(1);
}

const sourcePkgPath = join(root, 'packages', pkgName, 'package.json');
const distPkgPath = join(root, 'dist', 'packages', pkgName, 'package.json');

const sourcePkg = JSON.parse(readFileSync(sourcePkgPath, 'utf8'));
const distPkg = JSON.parse(readFileSync(distPkgPath, 'utf8'));
const distRoot = dirname(distPkgPath);
const errors = [];

const requiredFieldsByPackage = {
  'ngx-doc-viewer': ['main', 'module', 'types', 'exports'],
};

for (const field of ['main', 'module', 'types', 'typings', 'exports']) {
  if (sourcePkg[field] && !distPkg[field]) {
    errors.push(`Missing required field copied from source package.json: "${field}"`);
  }
}

for (const field of requiredFieldsByPackage[pkgName] ?? []) {
  if (!distPkg[field]) {
    errors.push(`Missing required field for ${pkgName}: "${field}"`);
  }
}

for (const field of ['main', 'module', 'types', 'typings']) {
  const value = distPkg[field];
  if (typeof value === 'string') {
    validatePath(field, value);
  }
}

if (distPkg.exports) {
  validateExports(distPkg.exports, 'exports');
}

if (pkgName === 'ngx-doc-viewer') {
  const rootExport = distPkg.exports?.['.'];
  if (!rootExport || typeof rootExport !== 'object') {
    errors.push('Missing required root export "." for ngx-doc-viewer');
  } else {
    if (typeof rootExport.types !== 'string') {
      errors.push('Missing required exports["."].types for ngx-doc-viewer');
    }
    if (typeof rootExport.default !== 'string') {
      errors.push('Missing required exports["."].default for ngx-doc-viewer');
    }
  }
}

if (errors.length > 0) {
  console.error(`Dist package validation failed for ${pkgName}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated dist/packages/${pkgName}/package.json`);

function validateExports(value, label) {
  if (typeof value === 'string') {
    validatePath(label, value);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    validateExports(nestedValue, `${label}.${key}`);
  }
}

function validatePath(label, relativePath) {
  if (!relativePath.startsWith('./')) {
    return;
  }

  const fullPath = join(distRoot, relativePath);
  if (!existsSync(fullPath)) {
    errors.push(`${label} points to a missing file: ${relativePath}`);
  }
}
