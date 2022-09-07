// eslint-disable-next-line no-var
declare var mammoth: any;
import { IFrameReloader, ViewerType } from './model';

export const fileToArray = (url: string): Promise<ArrayBuffer> => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    try {
      const request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'blob';
      request.onload = () => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(request.response);
        reader.onloadend = () => {
          resolve(reader.result as ArrayBuffer);
        };
      };
      request.send();
    } catch {
      reject(`error while retrieving file ${url}.`);
    }
  });
};

export const timeout = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const reloadIFrame = (iframe: HTMLIFrameElement) => {
  if (iframe) {
    console.log('reloading..');
    const url = iframe.src;
    iframe.src = 'about:blank';
    setTimeout(() => {
      if (iframe) {
        iframe.src = url;
      };
    }, 100)
    
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleFileUpload = (fileInput: any) => {
  return new Promise<string>((resolve, reject) => {
    if (fileInput.target.files && fileInput.target.files[0]) {
      const reader = new FileReader();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.onload = (e: any) => {
        resolve(e.target.result);
      };
      reader.readAsDataURL(fileInput.target.files[0]);
    } else {
      reject('no files selected');
    }
  });
};

export const getbaseUrl = (): string => {
  const pathArray = window.location.href.split('/');
  const protocol = pathArray[0];
  const host = pathArray[2];
  return protocol + '//' + host;
};


export const getLocation = (href: string) => {
  // eslint-disable-next-line no-useless-escape
  const match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
  return match && {
    href,
    protocol: match[1],
    host: match[2],
    hostname: match[3],
    port: match[4],
    pathname: match[5],
    search: match[6],
    hash: match[7]
  }
}

export const getDocxToHtml = async (url: string) => {
  if (!mammoth) {
    console.error(
      'Please install mammoth and make sure mammoth.browser.min.js is loaded.'
    );
  }
  const arrayBuffer = await fileToArray(url);
  const resultObject = await mammoth.convertToHtml({ arrayBuffer });
  return resultObject.value;
};

export const googleCheckSubscription = (): IFrameReloader => {
  let subscription: any = null;
  let checkCount = 0;
  return {
    subscribe: (iframe: HTMLIFrameElement, interval = 3000, maxChecks = 5) => {
      if (!iframeIsLoaded(iframe)) {
        subscription = setInterval(() => {
          checkCount++;
          if (checkCount >= maxChecks) {
            clearInterval(subscription);
          }
          reloadIFrame(iframe);
        }, interval);
        return subscription;
      } else {
        if (subscription) {
          clearInterval(subscription);
        }
      }
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
    if (!internetExplorer()) {
      isLoaded = !iframe?.contentDocument;
    } else {
      isLoaded = !iframe?.contentWindow?.document;
    }
  } catch {
    // ignore message Blocked a frame with origin "http://..." from accessing a cross-origin frame.
  }
  return isLoaded;
}

const internetExplorer = () =>
  (/MSIE (\d+\.\d+);/.test(navigator.userAgent) || navigator.userAgent.indexOf("Trident/") > -1);

export const getViewerDetails = (
  url: string,
  configuredViewer: ViewerType = 'google',
  queryParams = '',
  viewerUrl = ''
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

  const u = url?.indexOf('/') ? encodeURIComponent(url) : url;
  let fullUrl = viewerUrl ? viewerUrl.replace('%URL%', u) : url;
  if (queryParams && externalViewer && configuredViewer !== 'url') {
    const start = queryParams.startsWith('&') ? '' : '&';
    fullUrl = `${fullUrl}${start}${queryParams}`;
  }
  return {
    url: fullUrl,
    externalViewer,
  };
};

export const replaceLocalUrl = (url: string, overrideLocalhost: string) => {
  const loc = getLocation(url);
  const locReplace = getLocation(overrideLocalhost);
  if (loc && locReplace) {
    return url.replace(loc.port ? `${loc.hostname}:${loc.port}` : loc.hostname,
      locReplace.port ? `${locReplace.hostname}:${locReplace.port}` : locReplace.hostname);
  }
  return url;
}

const getBlobFromUrl = (url: string) => {
  return new Promise<File>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'blob';
    request.onload = () => {
      resolve(request.response as File);
    };
    request.onerror = reject;
    request.send();
  })
}


export const uploadToCloud = (fileUrl: string, api: string) => new Promise((resolve, reject) => {
  getBlobFromUrl(fileUrl).then(blob => {
    const loc = getLocation(fileUrl);
    const name = loc?.pathname ? loc?.pathname?.split('/')[loc?.pathname?.split('/').length - 1] : '';
    const formData = new FormData();
    const request = new XMLHttpRequest();
    formData.append('file', blob, name);
    request.onreadystatechange = e => {
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
  });
});

export const isLocalFile = (file: string) => {
  const loc = getLocation(file);
  const hostname = loc?.hostname || '';
  return (
    (['localhost', '127.0.0.1', '', '::1'].includes(hostname))
    || (hostname.startsWith('192.168.'))
    || (hostname.startsWith('10.0.'))
    || (hostname.endsWith('.local'))
  )
};