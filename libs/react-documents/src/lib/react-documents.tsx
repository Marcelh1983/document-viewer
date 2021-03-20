import { IFrameReloader } from '../../../model';
import React, { useEffect, useRef, useState } from 'react';
import {
  googleCheckSubscription,
  getViewerDetails,
  getDocxToHtml,
  iframeIsLoaded,
  isLocalFile,
  replaceLocalUrl,
} from './../../../helper';

const iframeStyle = {
  width: '100%',
  height: '100%',
};

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
};

interface State {
  url: string;
  externalViewer: boolean;
  docHtml: { __html: string };
}

export const DocumentViewer = (inputProps: Partial<Props>) => {
  const iframeRef = useRef(null);
  const [state, setState] = useState({
    url: '',
    externalViewer: true,
    docHtml: { __html: '' },
  } as State);
  const checkIFrameSubscription = useRef<IFrameReloader>();
  const props = useRef<Props>();

  useEffect(() => {
    props.current = { ...defaultProps, ...inputProps };
    // debugger;
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
    console.log(details.url);
    setState({
      url: details.url,
      externalViewer: details.externalViewer,
      docHtml: { __html: '' },
    });
    if (iframeRef && iframeRef.current) {
      const iframe = (iframeRef.current as unknown) as HTMLIFrameElement;
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
    } else if (props.current.viewer === 'mammoth') {
      const setHtml = async () => {
        const docHtml = { __html: await getDocxToHtml(details.url) };
        setState({
          url: '',
          docHtml,
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
    checkIFrameSubscription.current.subscribe(iframe,interval, maxChecks);
  };

  const iframeLoaded = () => {
    if (
      props.current &&
      iframeRef &&
      iframeRef.current !== null &&
      iframeIsLoaded((iframeRef.current as unknown) as HTMLIFrameElement)
    ) {
      if (props.current.loaded) props.current.loaded();
      if (checkIFrameSubscription.current) {
        checkIFrameSubscription.current.unsubscribe();
      }
    }
  };

  return state.externalViewer ? (
    <iframe
      style={iframeStyle}
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
    <object data={state.url} type="application/pdf" width="100%" height="100%">
      <p>
        Your browser does not support PDFs.
        <a href={state.url}>Download the PDF</a>.
      </p>
    </object>
  ) : null;
};
