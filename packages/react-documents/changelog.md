# 3.0.2 (10/27/2026)
* the google viewer iframe is sandboxed without `allow-downloads`: Google sometimes answers with an empty 204 response, which browsers saved as a `gview` download on every reload attempt
* clearer errors: a failed download shows the reason (for example `status 404`), and a file that is not a .docx shows "This file could not be read as a .docx document." instead of a zip error

# 3.0.1 (10/27/2026)
* `handleFileUpload` returns an object url (`blob:`) instead of a base64 data url; revoke it with `URL.revokeObjectURL` when it is no longer shown
* phase events no longer start with an `idle` event before `loading` when a url is given, matching ngx-doc-viewer
* the published package.json declares `sideEffects: false` and exports `./package.json`

# 3.0.0 (10/27/2026)
Breaking changes:
* the iframe no longer has `id="iframe"`; use the `react-documents-iframe` class instead
* `loaded` is called for every viewer (iframe, pdf and mammoth), once per load
* the `viewerType` type is deprecated in favor of `ViewerType`

Changes:
* added the `disableContent` prop (`none`, `all`, `popout`, `popout-hide`), matching ngx-doc-viewer
* the props are exported as the `DocumentViewerProps` type
* the google reload probe now starts after the new iframe has mounted and stops when the component unmounts
* changing any prop that affects loading now always remounts the iframe, so it can no longer get stuck in the loading state
* the mammoth timeout now uses the shared recovery logic (message: "The mammoth viewer did not finish loading in time.")
* fixed the mammoth viewer showing an error instead of staying idle when `url` is empty
* fixed relative document urls not being encoded when passed to the google or office viewer
* a missing mammoth script now shows a clear error message instead of `mammoth is not defined`
* the google reload check now stops as soon as the document has loaded
* `overrideLocalhost` now recognizes all private network addresses (`10.x`, `172.16-31.x`, `192.168.x`, `127.x`)

# 2.0.0 (03/17/2026)
* added a built-in loading overlay while external viewers and inline renderers initialize
* added customizable loading content support through the `loadingRenderer` prop
* added customizable error content support through the `errorRenderer` prop
* added configurable retry button text for the default error overlay
* added optional built-in secondary error action for opening or downloading the source URL
* added configurable Office reload control and documented one-time Office auto retry behavior
* added `googleFinalRetryDelay` to retry Google once more before surfacing the error state
* added structured render context for loading and error renderers with viewer, url, phase, error text, and retry
* added React lifecycle callbacks for loading, error, and phase changes
* improved iframe remounting when switching between Google and Office viewers
* improved demo routing so `previewer` and `doctype` are reflected in the URL

# 1.1.3 (09/07/2022)
* updated dependencies

# 1.1.1 (01/07/2022)
* added classname and style properties on object tag

# 1.1.0 (01/04/2022)
* use docviewhelper to share code between ngx-doc-viewer and react-documents
* added classname and style properties
* use default nx build script

# 1.0.1 (03/20/2021)
* clean up google refresh subscription in useEffect()

# 1.0.0 (03/19/2021)
* First release, used code from ngx-doc-viewer
