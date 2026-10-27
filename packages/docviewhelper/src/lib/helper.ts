declare const mammoth: {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};
import {
  DisableContent,
  DisableContentOverlay,
  IFrameReloader,
  ViewerRecoveryPlan,
  ViewerType,
} from './model';

export const fileToArray = (url: string): Promise<ArrayBuffer> => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    try {
      const request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.response as ArrayBuffer);
        } else {
          reject(`error while retrieving file ${url} (status ${request.status}).`);
        }
      };
      request.onerror = () => reject(`error while retrieving file ${url}.`);
      request.send();
    } catch {
      reject(`error while retrieving file ${url}.`);
    }
  });
};

export const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const reloadIFrame = (iframe: HTMLIFrameElement) => {
  if (iframe) {
    const url = iframe.src;
    iframe.src = 'about:blank';
    setTimeout(() => {
      if (iframe) {
        iframe.src = url;
      }
    }, 100);
  }
};

/**
 * Turns the file picked in an `<input type="file">` into an object url the
 * mammoth and pdf viewers can load. Accepts the DOM change event as well as
 * React's ChangeEvent. Call `URL.revokeObjectURL(url)` once the document is no
 * longer shown.
 */
export const handleFileUpload = (event: {
  target: EventTarget | null;
}): Promise<string> => {
  const file = (event.target as HTMLInputElement | null)?.files?.[0];
  return file
    ? Promise.resolve(URL.createObjectURL(file))
    : Promise.reject('no files selected');
};

export const getbaseUrl = (): string => {
  const pathArray = window.location.href.split('/');
  const protocol = pathArray[0];
  const host = pathArray[2];
  return protocol + '//' + host;
};

export const getLocation = (href: string) => {
   
  const match = href.match(
    /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/,
  );
  return (
    match && {
      href,
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      pathname: match[5],
      search: match[6],
      hash: match[7],
    }
  );
};

export const getDocxToHtml = async (url: string) => {
  if (typeof mammoth === 'undefined') {
    throw new Error(
      'Please install mammoth and make sure mammoth.browser.min.js is loaded.',
    );
  }
  const arrayBuffer = await fileToArray(url);
  const resultObject = await mammoth.convertToHtml({ arrayBuffer });
  return resultObject.value;
};

export const googleCheckSubscription = (): IFrameReloader => {
  let subscription: ReturnType<typeof setInterval> | undefined = undefined;
  let checkCount = 0;
  return {
    subscribe: (iframe: HTMLIFrameElement, interval = 3000, maxChecks = 5) => {
      if (!iframeIsLoaded(iframe)) {
        subscription = setInterval(() => {
          if (iframeIsLoaded(iframe)) {
            clearInterval(subscription);
            return;
          }
          checkCount++;
          if (checkCount >= maxChecks) {
            clearInterval(subscription);
          }
          reloadIFrame(iframe);
        }, interval);
      } else if (subscription) {
        clearInterval(subscription);
      }
      return subscription;
    },
    unsubscribe: () => {
      if (subscription) {
        clearInterval(subscription);
      }
    },
  };
};

export const iframeIsLoaded = (iframe: HTMLIFrameElement) => {
  // its #document <html><head></head><body></body></html> when google is returning a 204
  // so if contentDocument = null then it's loaded.
  let isLoaded = false;
  try {
    isLoaded = !iframe?.contentDocument;
  } catch {
    // ignore message Blocked a frame with origin "http://..." from accessing a cross-origin frame.
  }
  return isLoaded;
};

export const getViewerDetails = (
  url: string,
  configuredViewer: ViewerType = 'google',
  queryParams = '',
  viewerUrl = '',
) => {
  switch (configuredViewer) {
    case 'google':
      viewerUrl = `https://docs.google.com/gview?url=%URL%&embedded=true`;
      break;
    case 'office': {
      viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=%URL%`;
      break;
    }
    case 'pdf': {
      viewerUrl = '';
      break;
    }
  }
  const externalViewer =
    configuredViewer === 'google' ||
    configuredViewer === 'office' ||
    configuredViewer === 'url';

  let fullUrl = viewerUrl
    ? viewerUrl.replace('%URL%', encodeURIComponent(url ?? ''))
    : url;
  if (queryParams && externalViewer && configuredViewer !== 'url') {
    const start = queryParams.startsWith('&') ? '' : '&';
    fullUrl = `${fullUrl}${start}${queryParams}`;
  }
  return {
    url: fullUrl,
    externalViewer,
  };
};

/**
 * getViewerDetails plus the overrideLocalhost rewrite: external viewers cannot
 * reach local files, so those urls are rewritten to the public host first.
 */
export const resolveViewerDetails = ({
  url,
  viewer = 'google',
  queryParams = '',
  viewerUrl = '',
  overrideLocalhost = '',
}: {
  url: string;
  viewer?: ViewerType;
  queryParams?: string;
  viewerUrl?: string;
  overrideLocalhost?: string;
}) => {
  const details = getViewerDetails(url, viewer, queryParams, viewerUrl);
  if (details.externalViewer && overrideLocalhost && isLocalFile(url)) {
    return getViewerDetails(
      replaceLocalUrl(url, overrideLocalhost),
      viewer,
      queryParams,
      viewerUrl,
    );
  }
  return details;
};

/** Which part of the external viewer the disableContent overlay covers. */
export const getDisableContentOverlay = (
  viewer: ViewerType,
  disableContent: DisableContent,
): DisableContentOverlay | undefined => {
  if (disableContent === 'all') {
    return 'full';
  }
  if (disableContent === 'popout' || disableContent === 'popout-hide') {
    if (viewer === 'google') {
      return 'popout-google';
    }
    if (viewer === 'office') {
      return 'popout-office';
    }
  }
  return undefined;
};

export const getViewerRecoveryPlan = ({
  viewer,
  googleCheckContentLoaded = true,
  googleFinalRetryDelay = 0,
  officeAutoRetry = false,
}: {
  viewer: ViewerType;
  googleCheckContentLoaded?: boolean;
  googleFinalRetryDelay?: number;
  officeAutoRetry?: boolean;
}): ViewerRecoveryPlan => {
  const modes: ViewerRecoveryPlan['modes'] = [];

  if (viewer === 'google' && googleCheckContentLoaded) {
    modes.push('google-probe');
  }

  if (viewer === 'google' && googleFinalRetryDelay > 0) {
    modes.push('google-final-retry');
  }

  if (viewer === 'office' && officeAutoRetry) {
    modes.push('office-auto-retry');
  }

  return { modes };
};

export const replaceLocalUrl = (url: string, overrideLocalhost: string) => {
  const loc = getLocation(url);
  const locReplace = getLocation(overrideLocalhost);
  if (loc && locReplace) {
    return url.replace(
      loc.port ? `${loc.hostname}:${loc.port}` : loc.hostname,
      locReplace.port
        ? `${locReplace.hostname}:${locReplace.port}`
        : locReplace.hostname,
    );
  }
  return url;
};

const getBlobFromUrl = (url: string) => {
  return new Promise<File>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'blob';
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response as File);
      } else {
        reject(`error while retrieving file ${url} (status ${request.status}).`);
      }
    };
    request.onerror = reject;
    request.send();
  });
};

export const uploadToCloud = (fileUrl: string, api: string) =>
  getBlobFromUrl(fileUrl).then(
    (blob) =>
      new Promise((resolve, reject) => {
        const loc = getLocation(fileUrl);
        const name = loc?.pathname
          ? loc?.pathname?.split('/')[loc?.pathname?.split('/').length - 1]
          : '';
        const formData = new FormData();
        const request = new XMLHttpRequest();
        formData.append('file', blob, name);
        request.onreadystatechange = () => {
          if (request.readyState === XMLHttpRequest.DONE) {
            if (request.status === 200) {
              resolve(request.responseText);
            } else {
              reject(request.responseText);
            }
          }
        };
        request.onerror = reject;
        request.open('post', api, true);
        request.send(formData);
      }),
  );

// Loopback and RFC 1918 ranges, which external viewers cannot reach.
const isPrivateIPv4 = (hostname: string) => {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!match) {
    return false;
  }
  const [a, b] = [Number(match[1]), Number(match[2])];
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

export const isLocalFile = (file: string) => {
  const loc = getLocation(file);
  const hostname = loc?.hostname || '';
  return (
    ['localhost', '', '::1'].includes(hostname) ||
    isPrivateIPv4(hostname) ||
    hostname.endsWith('.local')
  );
};
