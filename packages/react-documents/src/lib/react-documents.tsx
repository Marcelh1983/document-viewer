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
interface ViewerRendererContext {
  viewer: viewerType;
  url: string;
  phase: ViewerRenderPhase;
  errorText: string;
  retry: () => void;
}
export type DocumentViewerEvent = ViewerRendererContext;

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
  onLoading?: (event: DocumentViewerEvent) => void;
  onError?: (event: DocumentViewerEvent) => void;
  onPhaseChange?: (event: DocumentViewerEvent) => void;
  url: string;
  queryParams: string;
  viewerUrl: string;
  googleCheckInterval: number;
  googleMaxChecks: number;
  googleCheckContentLoaded: boolean;
  viewer: viewerType;
  overrideLocalhost: string;
  loadingRenderer?: ReactNode | ((context: ViewerRendererContext) => ReactNode);
  errorRenderer?: ReactNode | ((context: ViewerRendererContext) => ReactNode);
  retryButtonText?: string;
  style?: CSSProperties | undefined;
  className?: string | undefined;
}

const defaultProps: Props = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  loaded: () => {},
  onLoading: () => {},
  onError: () => {},
  onPhaseChange: () => {},
  googleCheckContentLoaded: true,
  googleCheckInterval: 3000,
  queryParams: '',
  url: '',
  overrideLocalhost: '',
  googleMaxChecks: 5,
  viewer: 'google',
  viewerUrl: '',
  loadingRenderer: 'Loading document...',
  errorRenderer: undefined,
  retryButtonText: 'Retry',
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
  failedUrl: string;
  retryNonce: number;
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
    failedUrl: '',
    retryNonce: 0,
  } as State);
  const checkIFrameSubscription = useRef<IFrameReloader | undefined>(undefined);
  const props = useRef<Props | undefined>(undefined);
  const externalLoadTimeout = useRef<number | undefined>(undefined);
  const lastEmittedPhase = useRef<ViewerRenderPhase | undefined>(undefined);

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
      iframeKey: `${props.current.viewer}:${details.url}:${state.retryNonce}`,
      errorMessage: '',
      failedUrl: props.current.url,
      retryNonce: state.retryNonce,
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
            failedUrl: props.current?.url ?? '',
            retryNonce: state.retryNonce,
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
            failedUrl: props.current?.url ?? '',
            retryNonce: state.retryNonce,
          });
        }
      };
      setHtml();
      return () => {
        isActive = false;
        if (externalLoadTimeout.current) {
          window.clearTimeout(externalLoadTimeout.current);
          externalLoadTimeout.current = undefined;
        }
        if (checkIFrameSubscription && checkIFrameSubscription.current) {
          checkIFrameSubscription.current.unsubscribe();
        }
      };
    }

    const timerRef = window.setTimeout(() => {
      setNewUrl(details);
    }, 0);

    if (props.current.url) {
      if (externalLoadTimeout.current) {
        window.clearTimeout(externalLoadTimeout.current);
      }
      const timeoutMs =
        props.current.viewer === 'google'
          ? Math.max(props.current.googleCheckInterval * props.current.googleMaxChecks + 2000, 15000)
          : 15000;
      externalLoadTimeout.current = window.setTimeout(() => {
        if (!isActive) {
          return;
        }
        setState((current) =>
          current.phase !== 'loading'
            ? current
            : {
                ...current,
                phase: 'error',
                errorMessage: `The ${props.current?.viewer} viewer did not finish loading in time.`,
              }
        );
      }, timeoutMs);
    }

    return () => {
      isActive = false;
      window.clearTimeout(timerRef);
      if (externalLoadTimeout.current) {
        window.clearTimeout(externalLoadTimeout.current);
        externalLoadTimeout.current = undefined;
      }
      if (checkIFrameSubscription && checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    };
  }, [inputProps, state.retryNonce]);

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
      if (externalLoadTimeout.current) {
        window.clearTimeout(externalLoadTimeout.current);
        externalLoadTimeout.current = undefined;
      }
      setState((current) => ({ ...current, phase: 'ready' }));
      if (props.current.loaded) props.current.loaded();
      if (checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    }
  };

  const retryLoad = () => {
    setState((current) => ({
      ...current,
      phase: props.current?.url ? 'loading' : 'idle',
      errorMessage: '',
      retryNonce: current.retryNonce + 1,
    }));
  };

  const rendererContext: ViewerRendererContext = {
    viewer: props.current?.viewer ?? 'google',
    url: state.failedUrl || props.current?.url || '',
    phase: state.phase,
    errorText: state.errorMessage || 'Unable to load document.',
    retry: retryLoad,
  };

  const loadingContent =
    typeof props.current?.loadingRenderer === 'function'
      ? props.current.loadingRenderer(rendererContext)
      : props.current?.loadingRenderer;

  const errorContent =
    typeof props.current?.errorRenderer === 'function'
      ? props.current.errorRenderer(rendererContext)
      : props.current?.errorRenderer;

  useEffect(() => {
    if (!props.current || lastEmittedPhase.current === state.phase) {
      return;
    }
    lastEmittedPhase.current = state.phase;
    const event: DocumentViewerEvent = {
      viewer: props.current.viewer,
      url: state.failedUrl || props.current.url,
      phase: state.phase,
      errorText: state.errorMessage || 'Unable to load document.',
      retry: retryLoad,
    };
    props.current.onPhaseChange?.(event);
    if (state.phase === 'loading') {
      props.current.onLoading?.(event);
    }
    if (state.phase === 'error') {
      props.current.onError?.(event);
    }
  }, [state.errorMessage, state.failedUrl, state.phase]);

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
          {loadingContent}
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
          {errorContent ?? (
            <div>
              <div>{state.errorMessage || 'Unable to load document.'}</div>
              {props.current?.viewer ? (
                <div style={{ marginTop: '8px', color: '#475569' }}>
                  Viewer: {props.current.viewer}
                </div>
              ) : null}
              {state.failedUrl ? (
                <div
                  style={{
                    marginTop: '4px',
                    color: '#64748b',
                    fontSize: '12px',
                    wordBreak: 'break-word',
                  }}
                >
                  {state.failedUrl}
                </div>
              ) : null}
              <button
                type="button"
                onClick={retryLoad}
                style={{
                  marginTop: '14px',
                  border: '1px solid #fecaca',
                  background: '#fff',
                  color: '#991b1b',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  font: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {props.current?.retryButtonText}
              </button>
            </div>
          )}
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
            if (externalLoadTimeout.current) {
              window.clearTimeout(externalLoadTimeout.current);
              externalLoadTimeout.current = undefined;
            }
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
