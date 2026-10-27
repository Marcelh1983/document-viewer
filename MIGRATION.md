# Migration Guide

## ngx-doc-viewer v21 → v22

### Angular version requirement

The minimum supported Angular version has been raised from **15** to **17.3**. The component now uses signal inputs/outputs and built-in control flow. If you are on Angular 15 to 17.2, stay on `ngx-doc-viewer@21`.

### Template usage is unchanged

Bindings such as `[url]="doc"`, `viewer="google"` and `(loaded)="..."`, and the projected `loadingContent`, `errorContent`, `errorActions` and `officeReloadContent` templates work as before.

### Code that accesses the component directly

Inputs, outputs and state are now signals. If you access the component instance (for example through `@ViewChild` or in tests):

| v21 | v22 |
|---|---|
| `viewer.url = 'x'` | `componentRef.setInput('url', 'x')` or bind it in the template |
| `viewer.renderPhase` | `viewer.renderPhase()` |
| `viewer.loaded.subscribe(...)` | unchanged |
| `viewer.retryLoad()` | unchanged |

### Iframe id replaced by a class

The iframe no longer has an `id` (`iframe` / `iframe-doc-viewer`), so several viewers on one page no longer produce duplicate ids. Target `.ngx-doc-viewer-iframe` instead. The `disableContent` overlay uses the `ngx-doc-viewer-overlay` class.

### `loaded` fires for every viewer

`loaded` is now emitted once per load for every viewer, including pdf and mammoth. Before, it was only emitted for iframe viewers, on every iframe load event.

### Change detection

v22 is built with Angular 22 and does not set a change detection strategy, so the component follows your app's default:

- **Angular 22+**: the component runs as `OnPush`, like your own components.
- **Angular 17.3 – 21**: the component runs as `Eager` (previously `Default`).

The component triggers its own updates for everything it does internally: loading, timeouts, retries and mammoth rendering. Projected templates keep updating with your component's state.

### Update your dependency

```bash
npm install ngx-doc-viewer@^22.0.0
# or
pnpm add ngx-doc-viewer@^22.0.0
```

---

## react-documents v2 → v3

### Iframe id replaced by a class

The iframe no longer has `id="iframe"`, so several viewers on one page no longer produce duplicate ids. Target `.react-documents-iframe` instead.

### `loaded` fires for every viewer

`loaded` is now called once per load for every viewer, including pdf and mammoth. Before, it was only called for iframe viewers.

### New

- `disableContent` prop, the same as in ngx-doc-viewer.
- `DocumentViewerProps` type export.
- `viewerType` is deprecated; use `ViewerType`.

### Update your dependency

```bash
npm install react-documents@^3.0.0
# or
pnpm add react-documents@^3.0.0
```

---

## docviewhelper v0.1 → v0.2

These changes also apply to ngx-doc-viewer v22 and react-documents v3, which re-export docviewhelper.

### `handleFileUpload` returns an object url

It used to read the file into a base64 data url. It now returns an object url (`blob:...`), which loads large files much faster. Object urls only live as long as the page, so don't store them, and release them when the document is no longer shown:

```ts
const url = await handleFileUpload(event);
// later, when showing another document:
URL.revokeObjectURL(url);
```

It now accepts the DOM change `Event` (or React's `ChangeEvent`) instead of `any`.

### Removed `defaultProps`

The unused `defaultProps` export has been removed. ngx-doc-viewer and react-documents define their own defaults.

### New

- `resolveViewerDetails`, `getDisableContentOverlay`, `ViewerRecoveryController.beginInlineLoad`, `LOAD_TIMEOUT_MS`
- `DisableContent` and `DisableContentOverlay` types

---

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
| Angular 16 | Angular 22 |
| React 18 | React 19 |
| react-router-dom 6 | react-router-dom 7 |
| TypeScript 5.1 | TypeScript 6.0 |
| ESLint 8 (.eslintrc) | ESLint 10 (flat config) |
| webpack (demo-react) | Vite 8 |
| Rollup via @nx/rollup | tsup (docviewhelper, react-documents) |
| @nx/angular:package | ng-packagr CLI directly |
| zone.js 0.13 | zoneless demo app (zone.js 0.16 only for the library tests) |
| Jest 29 | Jest 30 |
| @angular-devkit/build-angular (webpack) | @angular/build (esbuild) |

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
