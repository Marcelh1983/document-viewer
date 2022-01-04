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

To

#### API:

Props:

- url: document url.
- viewer: google (default), office, mammoth, pdf or url
- viewerUrl: only for viewer: 'url'; location of the document renderer. Only use this option for other viewers then google or office.
- queryParams, e.g. to set language. for google: hl=[lang] e.g. hl=nl
 - overrideLocalhost: documents from the assets folder are not publicly available and therefor won't show in an external viewer (google, office). If the site is already published to public server, then pass that url and if will replace localhost by the other url. Like: overrideLocalhost="https://react-documents.firebaseapp.com/"

There are some issues loading document in the google viewer. See: https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives. If loading pdf's and Word documents, seems to work now with this hack let me know via a Github issue.

- googleCheckContentLoaded = true | If true it will check by interval if the content is loaded.
- googleCheckInterval = 3000 | The interval in milliseconds that is checked whether the iframe is loaded.
- googleMaxChecks = 5 | max number of retries
Output:

- loaded: google only, notifies when iframe is loaded. Can be used to show progress while loading

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

