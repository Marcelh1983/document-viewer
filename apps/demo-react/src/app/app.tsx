import React, { useEffect, useState } from 'react';
import {
  DemoDoc,
  getDemoDoc,
  getDemoViewer,
  viewers,
} from '@document-viewer/data';
import { DocumentViewer, handleFileUpload, ViewerType } from 'react-documents';
import { useNavigate, useParams } from 'react-router-dom';

export function App() {
  const navigate = useNavigate();
  const params = useParams();
  const [selectedViewer, setSelectedViewer] = useState(getDemoViewer());
  const [selectedDoc, setSelectedDoc] = useState(getDemoDoc());
  const [customUrlDraft, setCustomUrlDraft] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    const viewer = getDemoViewer(params.previewer);
    const doc = getDemoDoc(viewer.name, params.doctype);

    if (params.previewer !== viewer.name || params.doctype !== doc.type) {
      navigate(`/${viewer.name}/${doc.type}`, { replace: true });
      return;
    }

    setSelectedViewer(viewer);
    setSelectedDoc(doc);
    setCustomUrlDraft('');
    setCustomUrl('');
  }, [navigate, params.doctype, params.previewer]);

  const selectViewer = (viewerName: ViewerType) => {
    if (viewerName !== selectedViewer.name) {
      const viewer = getDemoViewer(viewerName);
      navigate(`/${viewer.name}/${viewer.docs[0].type}`);
    }
  };

  const selectDoc = (doc: DemoDoc) => {
    if (doc.type !== selectedDoc.type) {
      navigate(`/${selectedViewer.name}/${doc.type}`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFiles = async (fileInput: any) => {
    setCustomUrl(await handleFileUpload(fileInput));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">

      {/* Header */}
      <header className="bg-linear-to-r from-violet-600 to-indigo-600 text-white px-6 py-4 shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Document Viewer</h1>
            <p className="text-violet-200 text-sm mt-0.5">Demo &middot; React</p>
          </div>
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30">
            react-documents
          </span>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto space-y-3">

          {/* Viewer selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-14 shrink-0">Viewer</span>
            {viewers.map((viewer) => (
              <button
                key={viewer.name}
                onClick={() => selectViewer(viewer.name)}
                className={[
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer',
                  selectedViewer.name === viewer.name
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
                ].join(' ')}
              >
                {viewer.name}
              </button>
            ))}
          </div>

          {/* Document selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-14 shrink-0">Format</span>
            {selectedViewer.docs.map((doc) => (
              <button
                key={doc.type}
                onClick={() => selectDoc(doc)}
                className={[
                  'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none cursor-pointer',
                  selectedDoc.type === doc.type
                    ? 'bg-violet-100 text-violet-700 border border-violet-300'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600',
                ].join(' ')}
              >
                {doc.label}
              </button>
            ))}

            {selectedViewer.custom && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  value={customUrlDraft}
                  onChange={(e) => setCustomUrlDraft(e.target.value)}
                  type="text"
                  placeholder="Enter document URL..."
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 w-72"
                />
                <button
                  onClick={() => setCustomUrl(customUrlDraft)}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                >
                  Load
                </button>
              </div>
            )}

            {selectedViewer.acceptedUploadTypes && (
              <label className="ml-2 cursor-pointer flex items-center gap-2 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200 hover:-translate-y-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  accept={selectedViewer.acceptedUploadTypes}
                  onChange={handleFiles}
                />
              </label>
            )}
          </div>

        </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 p-4 min-h-0">
        <div className="h-full rounded-xl overflow-hidden shadow-lg bg-white ring-1 ring-slate-200">
          <DocumentViewer
            style={{ width: '100%', height: '100%', display: 'block' }}
            queryParams="hl=Nl"
            url={customUrl || selectedDoc.url}
            viewerUrl={selectedViewer.viewerUrl}
            viewer={selectedViewer.name}
            overrideLocalhost="https://angular-doc-viewer.firebaseapp.com/"
          />
        </div>
      </div>

    </div>
  );
}

export default App;
