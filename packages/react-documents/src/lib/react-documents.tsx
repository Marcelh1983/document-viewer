import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import {
  IFrameReloader,
  ViewerRecoveryConfig,
  ViewerRecoveryController,
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
  actionUrl: string;
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
  googleFinalRetryDelay: number;
  googleCheckContentLoaded: boolean;
  viewer: viewerType;
  overrideLocalhost: string;
  officeAutoRetry: boolean;
  officeRetryDelay: number;
  loadingRenderer?: ReactNode | ((context: ViewerRendererContext) => ReactNode);
  errorRenderer?: ReactNode | ((context: ViewerRendererContext) => ReactNode);
  retryButtonText?: string;
  officeReloadRenderer?: ReactNode | ((context: ViewerRendererContext) => ReactNode);
  officeReloadButtonText?: string;
  officeReloadButtonTitle?: string;
  secondaryActionText?: string;
  secondaryActionMode?: 'open' | 'download';
  style?: CSSProperties | undefined;
  className?: string | undefined;
}

const defaultProps: Props = {
   
  loaded: () => {},
  onLoading: () => {},
  onError: () => {},
  onPhaseChange: () => {},
  googleCheckContentLoaded: true,
  googleCheckInterval: 3000,
  googleFinalRetryDelay: 0,
  queryParams: '',
  url: '',
  overrideLocalhost: '',
  officeAutoRetry: false,
  officeRetryDelay: 3000,
  googleMaxChecks: 5,
  viewer: 'google',
  viewerUrl: '',
  loadingRenderer: 'Loading document...',
  errorRenderer: undefined,
  retryButtonText: 'Retry',
  officeReloadRenderer: undefined,
  officeReloadButtonText: '↻',
  officeReloadButtonTitle: 'Reload document',
  secondaryActionText: '',
  secondaryActionMode: 'open',
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

const buildRecoveryConfig = (p: Props): ViewerRecoveryConfig => ({
  viewer: p.viewer,
  googleCheckContentLoaded: p.googleCheckContentLoaded,
  googleCheckInterval: p.googleCheckInterval,
  googleMaxChecks: p.googleMaxChecks,
  googleFinalRetryDelay: p.googleFinalRetryDelay,
  officeAutoRetry: p.officeAutoRetry,
  officeRetryDelay: p.officeRetryDelay,
});

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
  const props = useRef<Props>({ ...defaultProps, ...inputProps });
  // Keep the latest merged props available to render + callbacks without forcing
  // the load effect below to re-run on every parent render.
  props.current = { ...defaultProps, ...inputProps };
  const mammothTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const recovery = useRef<ViewerRecoveryController | undefined>(undefined);
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

  const scheduleGoogleProbe = (details: {
    url: string;
    externalViewer: boolean;
  }) => {
    window.setTimeout(() => {
      if (!props.current) {
        return;
      }
      setNewUrl(details);
    }, 0);
  };

  useEffect(() => {
    if (!recovery.current) {
      recovery.current = new ViewerRecoveryController(
        buildRecoveryConfig(props.current),
        {
          triggerRetry: () =>
            setState((current) => ({
              ...current,
              phase: 'loading',
              errorMessage: '',
              retryNonce: current.retryNonce + 1,
            })),
          reportTimeout: () =>
            setState((current) =>
              current.phase !== 'loading'
                ? current
                : {
                    ...current,
                    phase: 'error',
                    errorMessage: `The ${props.current?.viewer} viewer did not finish loading in time.`,
                  }
            ),
        }
      );
    }
    recovery.current.configure(buildRecoveryConfig(props.current));

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
    recovery.current.trackSource(details.url);

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
      if (mammothTimeout.current) {
        clearTimeout(mammothTimeout.current);
        mammothTimeout.current = undefined;
      }
      if (props.current.url) {
        mammothTimeout.current = setTimeout(() => {
          if (!isActive) {
            return;
          }
          setState((current) =>
            current.phase !== 'loading'
              ? current
              : {
                  ...current,
                  phase: 'error',
                  contentKind: 'inline',
                  errorMessage: 'The document did not finish loading in time.',
                }
          );
        }, 15000);
      }
      const setHtml = async () => {
        try {
          const docHtml = { __html: await getDocxToHtml(details.url) };
          if (!isActive) {
            return;
          }
          if (mammothTimeout.current) {
            clearTimeout(mammothTimeout.current);
            mammothTimeout.current = undefined;
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
          if (mammothTimeout.current) {
            clearTimeout(mammothTimeout.current);
            mammothTimeout.current = undefined;
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
        if (mammothTimeout.current) {
          clearTimeout(mammothTimeout.current);
          mammothTimeout.current = undefined;
        }
        recovery.current?.clearTimers();
        if (checkIFrameSubscription && checkIFrameSubscription.current) {
          checkIFrameSubscription.current.unsubscribe();
        }
      };
    }

    if (props.current.url) {
      const plan = recovery.current.beginExternalLoad(() => isActive);
      if (plan.modes.includes('google-probe')) {
        scheduleGoogleProbe(details);
      }
    }

    return () => {
      isActive = false;
      recovery.current?.clearTimers();
      if (checkIFrameSubscription && checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    };
  }, [
    inputProps.url,
    inputProps.viewer,
    inputProps.queryParams,
    inputProps.viewerUrl,
    inputProps.overrideLocalhost,
    inputProps.googleCheckContentLoaded,
    inputProps.googleCheckInterval,
    inputProps.googleMaxChecks,
    inputProps.googleFinalRetryDelay,
    inputProps.officeAutoRetry,
    inputProps.officeRetryDelay,
    state.retryNonce,
  ]);

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
      recovery.current?.notifyLoaded();
      setState((current) => ({ ...current, phase: 'ready' }));
      if (props.current.loaded) props.current.loaded();
      if (checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    }
  };

  const retryLoad = () => {
    recovery.current?.clearTimers();
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
    actionUrl: state.failedUrl || props.current?.url || '',
  };

  const loadingContent =
    typeof props.current?.loadingRenderer === 'function'
      ? props.current.loadingRenderer(rendererContext)
      : props.current?.loadingRenderer;

  const errorContent =
    typeof props.current?.errorRenderer === 'function'
      ? props.current.errorRenderer(rendererContext)
      : props.current?.errorRenderer;
  const officeReloadContent =
    typeof props.current?.officeReloadRenderer === 'function'
      ? props.current.officeReloadRenderer(rendererContext)
      : props.current?.officeReloadRenderer;

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
      actionUrl: state.failedUrl || props.current.url,
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
              {props.current?.secondaryActionText && state.failedUrl ? (
                <a
                  href={state.failedUrl}
                  target={
                    props.current.secondaryActionMode === 'open'
                      ? '_blank'
                      : undefined
                  }
                  rel={
                    props.current.secondaryActionMode === 'open'
                      ? 'noreferrer'
                      : undefined
                  }
                  download={
                    props.current.secondaryActionMode === 'download'
                      ? ''
                      : undefined
                  }
                  style={{
                    marginTop: '14px',
                    marginLeft: '8px',
                    display: 'inline-block',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    borderRadius: '999px',
                    padding: '8px 14px',
                    textDecoration: 'none',
                    font: 'inherit',
                  }}
                >
                  {props.current.secondaryActionText}
                </a>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {props.current?.viewer === 'office' && state.phase === 'ready' ? (
        <button
          type="button"
          title={props.current?.officeReloadButtonTitle}
          onClick={retryLoad}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 1001,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'rgba(255,255,255,0.85)',
            color: '#475569',
            fontSize: '16px',
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5,
            padding: 0,
          }}
        >
          {officeReloadContent ?? props.current?.officeReloadButtonText}
        </button>
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
          allow="clipboard-read; clipboard-write"
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
            recovery.current?.notifyLoaded();
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
