import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const packages = [
  'packages/docviewhelper',
  'packages/ngx-doc-viewer',
  'packages/react-documents',
];

const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node tools/bump-version.mjs <patch|minor|major>');
  process.exit(1);
}

const bump = (version, type) => {
  let [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else { patch++; }
  return `${major}.${minor}.${patch}`;
};

for (const pkg of packages) {
  const pkgPath = resolve(root, pkg, 'package.json');
  const json = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const oldVersion = json.version;
  json.version = bump(oldVersion, bumpType);
  writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`${pkg}: ${oldVersion} → ${json.version}`);
}
