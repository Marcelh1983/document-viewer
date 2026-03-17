# react-documents
This component can be used to show several different document types in a React app.

Documents that are publicly available can be shown in an iframe using the google or office document viewer.

Pdf files and word document that are not publicly available can be shown using the mammoth viewer or pdf viewer by passing an objectUrl.

This package is created from [ngx-doc-viewer](https://github.com/Marcelh1983/document-viewer/blob/main/libs/ngx-doc-viewer/) which is the Angular version.

<a href="https://react-documents.web.app/">View demo</a>

<a href="https://github.com/Marcelh1983/document-viewer/blob/main/packages/react-documents/changelog.md">Changes</a>

### Install the NPM Module

```sh
npm install react-documents --save
```

### Usage

#### 1. Add DocViewer to component:

```ts
import { DocumentViewer } from 'react-documents';
```

```tsx
  <DocumentViewer
    queryParams="hl=Nl"
    url={selectedDoc}
    viewerUrl={selectedViewer.viewerUrl}
    viewer={selectedViewer.name}
    overrideLocalhost="https://react-doc-viewer.firebaseapp.com/">
  </DocumentViewer>
```

The component now shows an internal loading overlay while external viewers such as Google Docs Viewer and Office Online are initializing, so viewer switches do not appear as a blank panel.

To

#### API:

Props:

- url: document url.
- viewer: google (default), office, mammoth, pdf or url
- viewerUrl: only for viewer: 'url'; location of the document renderer. Only use this option for other viewers then google or office.
- queryParams, e.g. to set language. for google: hl=[lang] e.g. hl=nl
 - overrideLocalhost: documents from the assets folder are not publicly available and therefor won't show in an external viewer (google, office). If the site is already published to public server, then pass that url and if will replace localhost by the other url. Like: overrideLocalhost="https://react-documents.firebaseapp.com/"
 - loadingRenderer: text, JSX, or a render function shown in the built-in loading overlay. Defaults to `Loading document...`
 - errorRenderer: text, JSX, or a render function shown in the built-in error overlay. By default it shows the viewer, failing URL, and a retry button.
 - retryButtonText: text used by the built-in retry button in the default error overlay. Defaults to `Retry`
 - googleFinalRetryDelay: waits this many milliseconds and retries Google once more before showing the error overlay. Defaults to `0`
 - officeAutoRetry: automatically retries the Office viewer once after `officeRetryDelay`. Defaults to `false`
 - officeRetryDelay: delay in milliseconds before the one-time Office auto retry. Defaults to `3000`
 - officeReloadButtonText: text shown in the persistent Office reload button. Defaults to `↻`
 - officeReloadButtonTitle: tooltip/title for the persistent Office reload button. Defaults to `Reload document`
 - officeReloadRenderer: optional JSX or render function used instead of the default Office reload button content
 - secondaryActionText: optional text for a built-in secondary error action button, for example `Open source` or `Download`
 - secondaryActionMode: controls the built-in secondary action behavior. Supported values: `open` or `download`. Defaults to `open`

Example with custom loading markup:

```tsx
<DocumentViewer
  url={selectedDoc}
  viewer={selectedViewer.name}
  loadingRenderer={({ viewer }) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span>Preparing {viewer} preview...</span>
    </div>
  )}
/>
```

Example with custom error markup:

```tsx
<DocumentViewer
  url={selectedDoc}
  viewer={selectedViewer.name}
  errorRenderer={({ viewer, actionUrl, retry }) => (
    <div style={{ textAlign: 'center' }}>
      <div>Preview unavailable for {viewer}.</div>
      <div>{actionUrl}</div>
      <button type="button" onClick={retry}>Retry</button>
    </div>
  )}
/>
```

There are some issues loading document in the google viewer. See: https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives. If loading pdf's and Word documents, seems to work now with this hack let me know via a Github issue.

- googleCheckContentLoaded = true | If true it will check by interval if the content is loaded.
- googleCheckInterval = 3000 | The interval in milliseconds that is checked whether the iframe is loaded.
- googleMaxChecks = 5 | max number of retries
Output:

- loaded: emitted when the current iframe is ready. Can be used to hook into custom loading or telemetry flows.
- onLoading: callback fired when the viewer enters the `loading` phase.
- onError: callback fired when the viewer enters the `error` phase.
- onPhaseChange: callback fired whenever the internal phase changes to `idle`, `loading`, `ready`, or `error`.

Lifecycle callback payload includes:
- `viewer`
- `url`
- `phase`
- `errorText`
- `retry()`
- `actionUrl`

### Recent behavior improvements

- External viewer switches now remount the iframe cleanly when changing between viewers such as Google and Office.
- A built-in loading overlay is shown while remote viewers are loading.
- Mammoth rendering continues to render inline content correctly after switching away from iframe-based viewers.

### File type support

#### office viewer

.ppt, .pptx, .doc, .docx, .xls and .xlsx

#### google viewer

Only files under 25 MB can be previewed with the Google Drive viewer.

Google Drive viewer helps you preview over 15 different file types, listed below:

- Text files (.TXT)
- Markup/Code (.CSS, .HTML, .PHP, .C, .CPP, .H, .HPP, .JS)
- Microsoft Word (.DOC and .DOCX)
- Microsoft Excel (.XLS and .XLSX)
- Microsoft PowerPoint (.PPT and .PPTX)
- Adobe Portable Document Format (.PDF)
- Apple Pages (.PAGES)
- Adobe Illustrator (.AI)
- Adobe Photoshop (.PSD)
- Tagged Image File Format (.TIFF)
- Autodesk AutoCad (.DXF)
- Scalable Vector Graphics (.SVG)
- PostScript (.EPS, .PS)
- TrueType (.TTF)
- XML Paper Specification (.XPS)
- Archive file types (.ZIP and .RAR)

<a href="https://gist.githubusercontent.com/tzmartin/1cf85dc3d975f94cfddc04bc0dd399be/raw/d4263c8faf7b68f4bbfd33b386ec33ed2bc11e7d/embedded-file-viewer.md">Source</a>

#### url

For another external document viewers that should be loaded in an iframe.

For Google Drive

```tsx
<DocumentViewer
  url="https://drive.google.com/file/d/0B5ImRpiNhCfGZDVhMGEyYmUtZTdmMy00YWEyLWEyMTQtN2E2YzM3MDg3MTZh/preview"
  viewer="url"
  style="width:100%;height:50vh;"
>
</DocumentViewer>
```

For the Google Viewer or any other viewer where there is a base url and a parameter for the documentUrl:

```tsx
<DocumentViewer
  viewerUrl={'https://docs.google.com/gview?url=%URL%&embedded=true'}
  url={'https://file-examples.com/wp-content/uploads/2017/02/file-sample_100kB.doc'}
  viewer="url"
>
</DocumentViewer>
```

### pdf

.pdf

NOTE: PDF's are shown in the embed tag. Browser support is not guaranteed. If you need to be sure the pdf renders on all browsers you better use PDF.js

### mammoth

.docx

To use mammoth make sure mammoth.browser.min.js is loaded. Can be added in the index.html
```html
  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.16/mammoth.browser.min.js"
    integrity="sha512-hXFbhlByvaKQUnA8YLVmee6gVnmmL5RMx2GVnxuTBxMrVegwIN/1d2eZ3ICNzw0MViUotNtZEdgPW+Dq+kv4oQ=="
    crossorigin="anonymous"
  ></script>
```

## My other packages

- rx-basic-store: simple rx store for react: [npm](https://www.npmjs.com/package/rx-basic-store) | [github](https://github.com/Marcelh1983/rx-basic-store) | [demo](https://rx-basic-store.web.app/)
