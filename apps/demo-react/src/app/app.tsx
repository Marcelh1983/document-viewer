import React, { useState } from 'react';
import './app.module.scss';
import { viewers } from '@document-viewer/data';
import { DocumentViewer, handleFileUpload, ViewerType } from 'react-documents';

export function App() {
  const [selectedViewer, setSelectedViewer] = useState(viewers[0]);
  const [selectedDoc, setSelectedDoc] = useState(viewers[0].docs[0]);
  const [url, setUrl] = useState('');

  const handleChange = (e: any) => {
    setUrl(e.target.value);
  };

  const getDocExtension = (doc: string) => {
    const splittedDoc = doc.split('.');
    return splittedDoc[splittedDoc.length - 1];
  };

  const selectViewer = (viewerName: ViewerType) => {
    if (viewerName !== selectViewer.name) {
      const viewer = viewers.find((v) => v.name === viewerName);
      if (viewer) {
        setSelectedViewer(viewer);
        setSelectedDoc(viewer.docs[0]);
      }
    }
  };

  const handleFiles = async (fileInput: any) => {
    setSelectedDoc(await handleFileUpload(fileInput));
  };

  return (
    <div className="text-center">
      <div className="d-flex">
        {viewers.map((viewer) => {
          return (
            <button
              key={viewer.name}
              className={
                (selectedViewer.name === viewer.name ? 'active' : '') +
                ' btn btn-outline-primary m-2'
              }
              onClick={() => selectViewer(viewer.name)}
            >
              {viewer.name}
            </button>
          );
        })}
      </div>
      <div className="d-flex">
        {selectedViewer.docs.map((doc) => {
          return (
            <div key={doc} className="d-flex">
              <button
                className={
                  (selectedDoc === doc ? 'active' : '') +
                  ' btn btn-outline-secondary m-2'
                }
                onClick={() => setSelectedDoc(doc)}
              >
                {getDocExtension(doc)}
              </button>
            </div>
          );
        })}
        {selectedViewer.custom ? (
          <>
            <input
              onChange={handleChange}
              className="form-control w-100 m-2"
              type="text"
              placeholder="your document url"
            />
            <button
              className="btn btn-outline-secondary m-2"
              onClick={() => setSelectedDoc(url)}
            >
              Go
            </button>
          </>
        ) : null}
        {selectedViewer.acceptedUploadTypes ? (
          <input
            type="file"
            id="input"
            accept={selectedViewer.acceptedUploadTypes}
            onChange={handleFiles}
          />
        ) : null}
      </div>

      <DocumentViewer
        style={{ height: '80vh', width: '100%' }}
        queryParams="hl=Nl"
        url={selectedDoc}
        viewerUrl={selectedViewer.viewerUrl}
        viewer={selectedViewer.name}
        overrideLocalhost="https://angular-doc-viewer.firebaseapp.com/"
      ></DocumentViewer>
    </div>
  );
}

export default App;
