import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import {
  IFrameReloader,
  googleCheckSubscription,
  getViewerDetails,
  getDocxToHtml,
  iframeIsLoaded,
  isLocalFile,
  replaceLocalUrl
} from 'docviewhelper';

export type viewerType = 'google' | 'office' | 'mammoth' | 'pdf' | 'url';
type ViewerRenderPhase = 'idle' | 'loading' | 'ready' | 'error';
type ViewerContentKind = 'empty' | 'external' | 'inline' | 'pdf';

const inlineDocumentShellStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'auto',
  background: 'linear-gradient(180deg, #eef2f7 0%, #f8fafc 100%)',
  padding: '24px',
};

const inlineDocumentPageStyle: CSSProperties = {
  maxWidth: '900px',
  minHeight: '100%',
  margin: '0 auto',
  background: '#fff',
  border: '1px solid #dbe4f0',
  borderRadius: '18px',
  boxShadow:
    '0 18px 40px -24px rgba(15, 23, 42, 0.3), 0 6px 18px -10px rgba(15, 23, 42, 0.18)',
  padding: '40px 48px',
  color: '#1e293b',
  fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
  fontSize: '18px',
  lineHeight: 1.7,
};

interface Props {
  loaded?: () => void;
  url: string;
  queryParams: string;
  viewerUrl: string;
  googleCheckInterval: number;
  googleMaxChecks: number;
  googleCheckContentLoaded: boolean;
  viewer: viewerType;
  overrideLocalhost: string;
  loadingRenderer?: ReactNode;
  style?: CSSProperties | undefined;
  className?: string | undefined;
}

const defaultProps: Props = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  loaded: () => {},
  googleCheckContentLoaded: true,
  googleCheckInterval: 3000,
  queryParams: '',
  url: '',
  overrideLocalhost: '',
  googleMaxChecks: 5,
  viewer: 'google',
  viewerUrl: '',
  loadingRenderer: 'Loading document...',
  style: {
    width: '100%',
    height: '100%',
  },
  className: '',
};

interface State {
  phase: ViewerRenderPhase;
  contentKind: ViewerContentKind;
  url: string;
  docHtml: { __html: string };
  iframeKey: string;
  errorMessage: string;
}

export const DocumentViewer = (inputProps: Partial<Props>) => {
  const iframeRef = useRef(null);
  const [state, setState] = useState({
    phase: 'idle',
    contentKind: 'empty',
    url: '',
    docHtml: { __html: '' },
    iframeKey: '',
    errorMessage: '',
  } as State);
  const checkIFrameSubscription = useRef<IFrameReloader | undefined>(undefined);
  const props = useRef<Props | undefined>(undefined);

  const setNewUrl = async (details: {
    url: string;
    externalViewer: boolean;
  }) => {
    if (props.current) {
      const iframe = iframeRef.current as unknown as HTMLIFrameElement;
      if (checkIFrameSubscription && checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
      if (
        (props.current.viewer === 'google' ||
          props.current.viewer === 'office') &&
        props.current.googleCheckContentLoaded === true
      ) {
        reloadIframe(
          iframe,
          details.url,
          props.current.googleCheckInterval,
          props.current.googleMaxChecks
        );
      }
    }
  };

  useEffect(() => {
    props.current = { ...defaultProps, ...inputProps };
    let isActive = true;
    let details = getViewerDetails(
      props.current.url,
      props.current.viewer,
      props.current.queryParams,
      props.current.viewerUrl
    );
    if (
      details.externalViewer &&
      props.current.overrideLocalhost &&
      isLocalFile(props.current.url)
    ) {
      const newUrl = replaceLocalUrl(
        props.current.url,
        props.current.overrideLocalhost
      );
      details = getViewerDetails(
        newUrl,
        props.current.viewer,
        props.current.queryParams,
        props.current.viewerUrl
      );
    }

    setState({
      phase: props.current.url ? 'loading' : 'idle',
      contentKind: props.current.url
        ? details.externalViewer
          ? 'external'
          : props.current.viewer === 'pdf'
            ? 'pdf'
            : props.current.viewer === 'mammoth'
              ? 'inline'
              : 'empty'
        : 'empty',
      url: details.url,
      docHtml: { __html: '' },
      iframeKey: `${props.current.viewer}:${details.url}`,
      errorMessage: '',
    });
    if (props.current.viewer === 'mammoth') {
      const setHtml = async () => {
        try {
          const docHtml = { __html: await getDocxToHtml(details.url) };
          if (!isActive) {
            return;
          }
          setState({
            phase: 'ready',
            contentKind: 'inline',
            url: '',
            docHtml,
            iframeKey: '',
            errorMessage: '',
          });
        } catch (error) {
          if (!isActive) {
            return;
          }
          setState({
            phase: 'error',
            contentKind: 'inline',
            url: '',
            docHtml: { __html: '' },
            iframeKey: '',
            errorMessage:
              error instanceof Error ? error.message : 'Unable to load document.',
          });
        }
      };
      setHtml();
      return () => {
        isActive = false;
        if (checkIFrameSubscription && checkIFrameSubscription.current) {
          checkIFrameSubscription.current.unsubscribe();
        }
      };
    }

    const timerRef = window.setTimeout(() => {
      setNewUrl(details);
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timerRef);
      if (checkIFrameSubscription && checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    };
  }, [inputProps]);

  const reloadIframe = (
    iframe: HTMLIFrameElement,
    url: string,
    interval: number,
    maxChecks: number
  ) => {
    checkIFrameSubscription.current = googleCheckSubscription();
    checkIFrameSubscription.current.subscribe(iframe, interval, maxChecks);
  };

  const iframeLoaded = () => {
    if (
      props.current &&
      iframeRef &&
      iframeRef.current !== null &&
      iframeIsLoaded(iframeRef.current as unknown as HTMLIFrameElement)
    ) {
      setState((current) => ({ ...current, phase: 'ready' }));
      if (props.current.loaded) props.current.loaded();
      if (checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...props.current?.style,
      }}
      className={props.current?.className}
    >
      {state.phase === 'loading' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.88)',
            color: '#475569',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {props.current?.loadingRenderer}
        </div>
      ) : null}
      {state.phase === 'error' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.94)',
            color: '#991b1b',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            textAlign: 'center',
            padding: '16px',
          }}
        >
          {state.errorMessage || 'Unable to load document.'}
        </div>
      ) : null}

      {state.contentKind === 'external' ? (
        <iframe
          key={state.iframeKey}
          style={{ width: '100%', height: '100%', display: 'block' }}
          ref={iframeRef}
          onLoad={() => {
            iframeLoaded();
          }}
          id="iframe"
          title="iframe"
          frameBorder="0"
          src={state.url}
        ></iframe>
      ) : state.contentKind === 'inline' ? (
        <div style={inlineDocumentShellStyle}>
          <div
            style={inlineDocumentPageStyle}
            dangerouslySetInnerHTML={state.docHtml}
          ></div>
        </div>
      ) : state.contentKind === 'pdf' && state.url ? (
        <object
          data={state.url}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onLoad={() => {
            setState((current) => ({ ...current, phase: 'ready' }));
          }}
          type="application/pdf"
          width="100%"
          height="100%"
        >
          <p>
            Your browser does not support PDFs.
            <a href={state.url}>Download the PDF</a>.
          </p>
        </object>
      ) : null}
    </div>
  );
};
