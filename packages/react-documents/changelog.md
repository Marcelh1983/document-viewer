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
