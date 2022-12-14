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
  isSwitching: boolean;
}

export const DocumentViewer = (inputProps: Partial<Props>) => {
  const iframeRef = useRef(null);
  const [state, setState] = useState({
    url: '',
    isSwitching: false,
    externalViewer: true,
    docHtml: { __html: '' },
  } as State);
  const checkIFrameSubscription = useRef<IFrameReloader>();
  const props = useRef<Props>();

  const setNewurl = async (details: {
    url: string;
    externalViewer: boolean;
  }) => {
    if (props.current) {
      const iframe = iframeRef.current as unknown as HTMLIFrameElement;
      if (checkIFrameSubscription && checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
      if (
        props.current.viewer === 'google' &&
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
    let timerRef: any;
    if (state.isSwitching) {
      setState((s) => {
        return { ...s, isSwitching: false };
      });
      timerRef = setTimeout(() => {
        setNewurl({ url: state.url, externalViewer: state.externalViewer });
      }, 500);
    }
    return () => {
      if (timerRef) {
        clearTimeout(timerRef);
      }
    };
  }, [state.isSwitching]);

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
      isSwitching: false,
      docHtml: { __html: '' },
    });
    if (iframeRef && iframeRef.current) {
      const iframe = iframeRef.current as unknown as HTMLIFrameElement;
      if (iframe.src && iframe.src !== `${window.location.protocol}//${window.location.host}/` && iframe.src !== details.url) {
        // url of the iframe is changed, set is switching to true to
        // remove the iframe and add it later with the new url;
        setState((state) => ({ ...state, isSwitching: true }));
      } else {
        setNewurl(details);
      }
    } else if (props.current.viewer === 'mammoth') {
      const setHtml = async () => {
        const docHtml = { __html: await getDocxToHtml(details.url) };
        setState({
          url: '',
          docHtml,
          isSwitching: false,
          externalViewer: false,
        });
      };
      setHtml();
    }
    return () => {
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

  return state.isSwitching ? null : state.externalViewer ? (
    <iframe
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
