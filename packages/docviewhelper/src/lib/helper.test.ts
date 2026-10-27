import {
  getDisableContentOverlay,
  getDocxToHtml,
  getViewerDetails,
  getViewerRecoveryPlan,
  googleCheckSubscription,
  handleFileUpload,
  isLocalFile,
  resolveViewerDetails,
  uploadToCloud,
} from './helper';

const makeIframe = () => {
  let src = 'https://docs.google.com/gview?url=doc';
  const iframe = {
    contentDocument: {} as unknown,
    reloads: 0,
    get src() {
      return src;
    },
    set src(value: string) {
      if (value === 'about:blank') {
        iframe.reloads++;
      }
      src = value;
    },
  };
  return iframe;
};

describe('helper', () => {
  it('builds a google viewer URL', () => {
    const result = getViewerDetails(
      'http://www.africau.edu/images/default/sample.pdf'
    );

    expect(result.externalViewer).toBe(true);
    expect(result.url).toContain('https://docs.google.com/gview');
  });

  it('encodes relative urls placed in a viewer url', () => {
    expect(getViewerDetails('/files/a b.pdf', 'google').url).toBe(
      'https://docs.google.com/gview?url=%2Ffiles%2Fa%20b.pdf&embedded=true'
    );
  });

  it('rewrites local urls for external viewers when overrideLocalhost is set', () => {
    expect(
      resolveViewerDetails({
        url: 'http://localhost:4200/assets/a.pdf',
        viewer: 'google',
        overrideLocalhost: 'https://demo.example.com',
      }).url
    ).toBe(
      'https://docs.google.com/gview?url=http%3A%2F%2Fdemo.example.com%2Fassets%2Fa.pdf&embedded=true'
    );
    expect(
      resolveViewerDetails({
        url: 'http://localhost:4200/assets/a.pdf',
        viewer: 'pdf',
        overrideLocalhost: 'https://demo.example.com',
      }).url
    ).toBe('http://localhost:4200/assets/a.pdf');
  });

  it('places the disableContent overlay per viewer', () => {
    expect(getDisableContentOverlay('google', 'none')).toBeUndefined();
    expect(getDisableContentOverlay('pdf', 'all')).toBe('full');
    expect(getDisableContentOverlay('google', 'popout')).toBe('popout-google');
    expect(getDisableContentOverlay('office', 'popout-hide')).toBe(
      'popout-office'
    );
    expect(getDisableContentOverlay('url', 'popout')).toBeUndefined();
  });

  it('detects hosts that external viewers cannot reach', () => {
    for (const url of [
      'http://localhost:4200/a.pdf',
      'http://127.0.0.2/a.pdf',
      'http://10.12.0.5/a.pdf',
      'http://172.20.1.1/a.pdf',
      'http://192.168.1.10/a.pdf',
      'http://printer.local/a.pdf',
      '/assets/a.pdf',
    ]) {
      expect(isLocalFile(url)).toBe(true);
    }
    for (const url of [
      'https://example.com/a.pdf',
      'http://172.32.0.1/a.pdf',
      'http://8.8.8.8/a.pdf',
    ]) {
      expect(isLocalFile(url)).toBe(false);
    }
  });

  describe('getDocxToHtml', () => {
    const globals = globalThis as unknown as Record<string, unknown>;
    const originalXhr = globals['XMLHttpRequest'];
    afterEach(() => {
      globals['XMLHttpRequest'] = originalXhr;
      delete globals['mammoth'];
    });

    it('reports a file that is not a docx in plain words', async () => {
      class HtmlXhr {
        status = 0;
        response: ArrayBuffer | null = null;
        responseType = '';
        onload?: () => void;
        open() {}
        send() {
          this.status = 200;
          this.response = new TextEncoder().encode('<!doctype html>').buffer;
          this.onload?.();
        }
      }
      globals['XMLHttpRequest'] = HtmlXhr;
      globals['mammoth'] = {
        convertToHtml: () =>
          Promise.reject(new Error("Can't find end of central directory")),
      };

      await expect(getDocxToHtml('https://example.com/a.docx')).rejects.toThrow(
        'This file could not be read as a .docx document.'
      );
    });
  });

  it('reports a missing mammoth global as an error', async () => {
    await expect(getDocxToHtml('https://example.com/a.docx')).rejects.toThrow(
      'mammoth.browser.min.js'
    );
  });

  describe('handleFileUpload', () => {
    it('returns an object url for the selected file', async () => {
      const file = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
      const url = await handleFileUpload({
        target: { files: [file] } as unknown as EventTarget,
      });
      expect(url.startsWith('blob:')).toBe(true);
      URL.revokeObjectURL(url);
    });

    it('rejects when no file was selected', async () => {
      await expect(
        handleFileUpload({ target: { files: [] } as unknown as EventTarget })
      ).rejects.toBe('no files selected');
    });
  });

  describe('uploadToCloud', () => {
    const originalXhr = globalThis.XMLHttpRequest;
    afterEach(() => {
      globalThis.XMLHttpRequest = originalXhr;
    });

    it('rejects when the file cannot be retrieved', async () => {
      class NotFoundXhr {
        status = 0;
        onload?: () => void;
        open() {}
        send() {
          this.status = 404;
          this.onload?.();
        }
      }
      globalThis.XMLHttpRequest =
        NotFoundXhr as unknown as typeof XMLHttpRequest;

      await expect(
        uploadToCloud('https://example.com/a.pdf', 'https://api')
      ).rejects.toContain('status 404');
    });
  });

  describe('googleCheckSubscription', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('reloads up to maxChecks times while the viewer stays empty', () => {
      const iframe = makeIframe();
      googleCheckSubscription().subscribe(
        iframe as unknown as HTMLIFrameElement,
        1000,
        3
      );

      jest.advanceTimersByTime(10000);
      expect(iframe.reloads).toBe(3);
    });

    it('stops reloading once the viewer has loaded', () => {
      const iframe = makeIframe();
      googleCheckSubscription().subscribe(
        iframe as unknown as HTMLIFrameElement,
        1000,
        5
      );

      jest.advanceTimersByTime(1000);
      expect(iframe.reloads).toBe(1);
      // a cross-origin document hides contentDocument: the viewer loaded
      iframe.contentDocument = null;
      jest.advanceTimersByTime(5000);
      expect(iframe.reloads).toBe(1);
    });
  });

  it('returns a google recovery plan when probing is enabled', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'google',
        googleCheckContentLoaded: true,
      }).modes
    ).toEqual(['google-probe']);
  });

  it('returns a final google retry mode when a delay is configured', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'google',
        googleFinalRetryDelay: 4000,
      }).modes
    ).toEqual(['google-probe', 'google-final-retry']);
  });

  it('returns an office recovery plan when auto retry is enabled', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'office',
        officeAutoRetry: true,
      }).modes
    ).toEqual(['office-auto-retry']);
  });

  it('returns no recovery plan for viewers without recovery policies', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'mammoth',
        googleCheckContentLoaded: true,
        officeAutoRetry: true,
      }).modes
    ).toEqual([]);
  });
});
