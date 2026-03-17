import React, { CSSProperties, useEffect, useRef, useState } from 'react';
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
  style: {
    width: '100%',
    height: '100%',
  },
  className: '',
};

interface State {
  url: string;
  externalViewer: boolean;
  docHtml: { __html: string };
  iframeKey: string;
}

export const DocumentViewer = (inputProps: Partial<Props>) => {
  const iframeRef = useRef(null);
  const [state, setState] = useState({
    url: '',
    externalViewer: true,
    docHtml: { __html: '' },
    iframeKey: '',
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
      url: details.url,
      externalViewer: details.externalViewer,
      docHtml: { __html: '' },
      iframeKey: `${props.current.viewer}:${details.url}`,
    });
    if (props.current.viewer === 'mammoth') {
      const setHtml = async () => {
        const docHtml = { __html: await getDocxToHtml(details.url) };
        setState({
          url: '',
          docHtml,
          externalViewer: false,
          iframeKey: '',
        });
      };
      setHtml();
      return () => {
        if (checkIFrameSubscription && checkIFrameSubscription.current) {
          checkIFrameSubscription.current.unsubscribe();
        }
      };
    }

    const timerRef = window.setTimeout(() => {
      setNewUrl(details);
    }, 0);

    return () => {
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
      if (props.current.loaded) props.current.loaded();
      if (checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    }
  };

  return state.externalViewer ? (
    <iframe
      key={state.iframeKey}
      style={props.current?.style}
      className={props.current?.className}
      ref={iframeRef}
      onLoad={() => {
        iframeLoaded();
      }}
      id="iframe"
      title="iframe"
      frameBorder="0"
      src={state.url}
    ></iframe>
  ) : props.current?.viewer !== 'pdf' ? (
    <div dangerouslySetInnerHTML={state.docHtml}></div>
  ) : state.url ? (
    <object
      data={state.url}
      style={props.current?.style}
      className={props.current?.className}
      type="application/pdf"
      width="100%"
      height="100%"
    >
      <p>
        Your browser does not support PDFs.
        <a href={state.url}>Download the PDF</a>.
      </p>
    </object>
  ) : null;
};
