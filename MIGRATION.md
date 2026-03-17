# Migration Guide

## ngx-doc-viewer v16 → v21

### Angular version requirement

The minimum supported Angular version has been raised from **10** to **15**.

Angular 15+ introduced the modern build pipeline this package now targets. If you are on Angular 14 or older, stay on `ngx-doc-viewer@16`.

**No other changes required.** The public API (`NgxDocViewerModule`, `NgxDocViewerComponent` and all `@Input`/`@Output` properties) is unchanged. NgModule-based and standalone usage both continue to work.

### Update your dependency

```bash
npm install ngx-doc-viewer@^21.0.0
# or
pnpm add ngx-doc-viewer@^21.0.0
```

---

## react-documents v1 → v2

### React version requirement

The minimum supported React version has been raised from **16.8** to **17.0**.

React 17 introduced the new JSX transform, which the compiled output now requires. If you are still on React 16, stay on `react-documents@1`.

**No other breaking changes.** The `DocumentViewer` component API is unchanged.

### Update your dependency

```bash
npm install react-documents@^2.0.0
# or
pnpm add react-documents@^2.0.0
```

---

## docviewhelper v0.0.x → v0.1.0

No breaking changes. The package now ships proper `exports` field and dual CJS/ESM output.

---

## Internal / workspace changes (not consumer-facing)

These changes only affect contributors working in this monorepo:

| Before | After |
|---|---|
| npm | pnpm workspaces |
| Nx 17 | removed (pnpm scripts) |
| Angular 16 | Angular 21 |
| React 18 | React 19 |
| react-router-dom 6 | react-router-dom 7 |
| TypeScript 5.1 | TypeScript 5.8 |
| ESLint 8 (.eslintrc) | ESLint 10 (flat config) |
| webpack (demo-react) | Vite 6 |
| Rollup via @nx/rollup | tsup (docviewhelper, react-documents) |
| @nx/angular:package | ng-packagr CLI directly |
| zone.js 0.13 | zone.js 0.16 |

### Getting started after pulling these changes

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install

# Build all libraries (docviewhelper must be built first)
pnpm build:all

# Start demo apps
pnpm start:demo:angular   # http://localhost:4200
pnpm start:demo:react     # http://localhost:4201

# Run tests
pnpm test
```
