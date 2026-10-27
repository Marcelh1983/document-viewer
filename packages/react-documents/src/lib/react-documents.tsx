import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  DisableContent,
  DisableContentOverlay,
  IFrameReloader,
  ViewerRecoveryConfig,
  ViewerRecoveryController,
  ViewerRenderPhase,
  ViewerType,
  getDisableContentOverlay,
  getDocxToHtml,
  googleCheckSubscription,
  iframeIsLoaded,
  resolveViewerDetails,
} from 'docviewhelper';

/** @deprecated Use `ViewerType` instead. */
export type viewerType = ViewerType;
type ViewerContentKind = 'empty' | 'external' | 'inline' | 'pdf';
interface ViewerRendererContext {
  viewer: ViewerType;
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

const disableContentOverlayStyles: Record<
  DisableContentOverlay,
  CSSProperties
> = {
  full: { width: '100%', height: '100%', right: 0, top: 0 },
  'popout-google': { width: '40px', height: '40px', right: '26px', top: '11.5px' },
  'popout-office': { width: '100px', height: '20px', right: 0, bottom: 0 },
};

interface ResolvedProps {
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
  viewer: ViewerType;
  overrideLocalhost: string;
  disableContent: DisableContent;
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

export type DocumentViewerProps = Partial<ResolvedProps>;

const defaultProps: ResolvedProps = {
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
  disableContent: 'none',
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
  sourceUrl: string;
  retryNonce: number;
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to load document.';

export const DocumentViewer = (inputProps: DocumentViewerProps) => {
  const props: ResolvedProps = { ...defaultProps, ...inputProps };
  // Callbacks and timers read the latest props without re-running effects.
  const latestProps = useRef(props);
  latestProps.current = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<State>({
    phase: 'idle',
    contentKind: 'empty',
    url: '',
    docHtml: { __html: '' },
    iframeKey: '',
    errorMessage: '',
    sourceUrl: '',
    retryNonce: 0,
  });
  const checkIFrameSubscription = useRef<IFrameReloader | undefined>(undefined);
  const recovery = useRef<ViewerRecoveryController | undefined>(undefined);
  const lastEmittedPhase = useRef<ViewerRenderPhase | undefined>(undefined);
  const loadCount = useRef(0);
  // The iframe key that still needs the google reload probe once it is mounted.
  const googleProbeKey = useRef<string | undefined>(undefined);

  const {
    url,
    viewer,
    queryParams,
    viewerUrl,
    overrideLocalhost,
    googleCheckContentLoaded,
    googleCheckInterval,
    googleMaxChecks,
    googleFinalRetryDelay,
    officeAutoRetry,
    officeRetryDelay,
  } = props;
  const { retryNonce } = state;

  useEffect(() => {
    const config: ViewerRecoveryConfig = {
      viewer,
      googleCheckContentLoaded,
      googleCheckInterval,
      googleMaxChecks,
      googleFinalRetryDelay,
      officeAutoRetry,
      officeRetryDelay,
    };
    if (!recovery.current) {
      recovery.current = new ViewerRecoveryController(config, {
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
                  errorMessage: `The ${latestProps.current.viewer} viewer did not finish loading in time.`,
                }
          ),
      });
    }
    const controller = recovery.current;
    controller.configure(config);

    let isActive = true;
    const details = resolveViewerDetails({
      url,
      viewer,
      queryParams,
      viewerUrl,
      overrideLocalhost,
    });
    controller.trackSource(details.url);
    // Every load gets its own key so the iframe/object remounts and fires load again.
    const iframeKey = `${viewer}:${details.url}:${++loadCount.current}`;
    googleProbeKey.current = undefined;

    setState({
      phase: url ? 'loading' : 'idle',
      contentKind: !url
        ? 'empty'
        : details.externalViewer
          ? 'external'
          : viewer === 'pdf'
            ? 'pdf'
            : viewer === 'mammoth'
              ? 'inline'
              : 'empty',
      url: details.url,
      docHtml: { __html: '' },
      iframeKey,
      errorMessage: '',
      sourceUrl: url,
      retryNonce,
    });

    if (url && viewer === 'mammoth') {
      controller.beginInlineLoad(() => isActive);
      getDocxToHtml(details.url).then(
        (html) => {
          if (!isActive) {
            return;
          }
          controller.notifyLoaded();
          setState((current) => ({
            ...current,
            phase: 'ready',
            docHtml: { __html: html },
          }));
        },
        (error) => {
          if (!isActive) {
            return;
          }
          controller.clearTimers();
          setState((current) => ({
            ...current,
            phase: 'error',
            errorMessage: toErrorMessage(error),
          }));
        }
      );
    } else if (url) {
      const plan = controller.beginExternalLoad(() => isActive);
      if (plan.modes.includes('google-probe')) {
        googleProbeKey.current = iframeKey;
      }
    }

    return () => {
      isActive = false;
      controller.clearTimers();
    };
  }, [
    url,
    viewer,
    queryParams,
    viewerUrl,
    overrideLocalhost,
    googleCheckContentLoaded,
    googleCheckInterval,
    googleMaxChecks,
    googleFinalRetryDelay,
    officeAutoRetry,
    officeRetryDelay,
    retryNonce,
  ]);

  // Google sometimes answers with an empty 204 page; reload the iframe until the
  // viewer shows up. Runs after the iframe for the current key has mounted.
  // see: https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || googleProbeKey.current !== state.iframeKey) {
      return;
    }
    const subscription = googleCheckSubscription();
    checkIFrameSubscription.current = subscription;
    subscription.subscribe(
      iframe,
      latestProps.current.googleCheckInterval,
      latestProps.current.googleMaxChecks
    );
    return () => subscription.unsubscribe();
  }, [state.iframeKey]);

  const iframeLoaded = () => {
    const iframe = iframeRef.current;
    if (iframe && iframeIsLoaded(iframe)) {
      recovery.current?.notifyLoaded();
      checkIFrameSubscription.current?.unsubscribe();
      setState((current) => ({ ...current, phase: 'ready' }));
    }
  };

  const retryLoad = useCallback(() => {
    recovery.current?.clearTimers();
    setState((current) => ({
      ...current,
      phase: latestProps.current.url ? 'loading' : 'idle',
      errorMessage: '',
      retryNonce: current.retryNonce + 1,
    }));
  }, []);

  const rendererContext: ViewerRendererContext = {
    viewer,
    url: state.sourceUrl || url,
    phase: state.phase,
    errorText: state.errorMessage || 'Unable to load document.',
    retry: retryLoad,
    actionUrl: state.sourceUrl || url,
  };

  const loadingContent =
    typeof props.loadingRenderer === 'function'
      ? props.loadingRenderer(rendererContext)
      : props.loadingRenderer;
  const errorContent =
    typeof props.errorRenderer === 'function'
      ? props.errorRenderer(rendererContext)
      : props.errorRenderer;
  const officeReloadContent =
    typeof props.officeReloadRenderer === 'function'
      ? props.officeReloadRenderer(rendererContext)
      : props.officeReloadRenderer;
  const disableContentOverlay = getDisableContentOverlay(
    viewer,
    props.disableContent
  );

  useEffect(() => {
    // The initial state is a placeholder until the first load starts; emitting
    // it would report an `idle` phase before `loading` even when a url is set.
    if (!state.iframeKey || lastEmittedPhase.current === state.phase) {
      return;
    }
    lastEmittedPhase.current = state.phase;
    const current = latestProps.current;
    const event: DocumentViewerEvent = {
      viewer: current.viewer,
      url: state.sourceUrl || current.url,
      phase: state.phase,
      errorText: state.errorMessage || 'Unable to load document.',
      retry: retryLoad,
      actionUrl: state.sourceUrl || current.url,
    };
    current.onPhaseChange?.(event);
    if (state.phase === 'loading') {
      current.onLoading?.(event);
    }
    if (state.phase === 'error') {
      current.onError?.(event);
    }
    if (state.phase === 'ready') {
      current.loaded?.();
    }
  }, [state.iframeKey, state.errorMessage, state.sourceUrl, state.phase, retryLoad]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...props.style,
      }}
      className={props.className}
    >
      {state.phase === 'loading' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1001,
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
            zIndex: 1001,
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
              <div style={{ marginTop: '8px', color: '#475569' }}>
                Viewer: {viewer}
              </div>
              {state.sourceUrl ? (
                <div
                  style={{
                    marginTop: '4px',
                    color: '#64748b',
                    fontSize: '12px',
                    wordBreak: 'break-word',
                  }}
                >
                  {state.sourceUrl}
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
                {props.retryButtonText}
              </button>
              {props.secondaryActionText && state.sourceUrl ? (
                <a
                  href={state.sourceUrl}
                  target={
                    props.secondaryActionMode === 'open' ? '_blank' : undefined
                  }
                  rel={
                    props.secondaryActionMode === 'open'
                      ? 'noreferrer'
                      : undefined
                  }
                  download={
                    props.secondaryActionMode === 'download' ? '' : undefined
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
                  {props.secondaryActionText}
                </a>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {viewer === 'office' && state.phase === 'ready' ? (
        <button
          type="button"
          title={props.officeReloadButtonTitle}
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
          {officeReloadContent ?? props.officeReloadButtonText}
        </button>
      ) : null}

      {state.contentKind === 'external' ? (
        <>
          <iframe
            key={state.iframeKey}
            className="react-documents-iframe"
            style={{ width: '100%', height: '100%', display: 'block' }}
            ref={iframeRef}
            onLoad={iframeLoaded}
            title="Document viewer"
            frameBorder="0"
            allow="clipboard-read; clipboard-write"
            src={state.url}
          ></iframe>
          {disableContentOverlay ? (
            <div
              className="react-documents-overlay"
              style={{
                position: 'absolute',
                zIndex: 1000,
                background:
                  props.disableContent === 'popout-hide'
                    ? '#fff'
                    : 'transparent',
                ...disableContentOverlayStyles[disableContentOverlay],
              }}
            ></div>
          ) : null}
        </>
      ) : state.contentKind === 'inline' ? (
        <div style={inlineDocumentShellStyle}>
          <div
            style={inlineDocumentPageStyle}
            dangerouslySetInnerHTML={state.docHtml}
          ></div>
        </div>
      ) : state.contentKind === 'pdf' && state.url ? (
        <object
          key={state.iframeKey}
          className="react-documents-object"
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
