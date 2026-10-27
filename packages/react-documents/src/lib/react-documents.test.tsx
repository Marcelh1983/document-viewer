import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DocumentViewer, DocumentViewerEvent } from './react-documents';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DocumentViewer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders nothing to view without a url', () => {
    act(() => root.render(<DocumentViewer viewer="google" url="" />));

    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).not.toContain('Loading document...');
  });

  it('stays idle for the mammoth viewer without a url', async () => {
    await act(async () =>
      root.render(<DocumentViewer viewer="mammoth" url="" />),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));

    expect(container.textContent).toBe('');
  });

  it('renders the pdf viewer as an object and emits loading', () => {
    const phases: DocumentViewerEvent['phase'][] = [];
    act(() =>
      root.render(
        <DocumentViewer
          viewer="pdf"
          url="https://example.com/file.pdf"
          onPhaseChange={(event) => phases.push(event.phase)}
        />,
      ),
    );

    const object = container.querySelector('object');
    expect(object?.getAttribute('data')).toBe('https://example.com/file.pdf');
    expect(phases).toContain('loading');
    expect(container.textContent).toContain('Loading document...');
  });

  it('wraps the url in the google viewer iframe', () => {
    act(() =>
      root.render(
        <DocumentViewer viewer="google" url="https://example.com/file.docx" />,
      ),
    );

    expect(container.querySelector('iframe')?.src).toBe(
      'https://docs.google.com/gview?url=https%3A%2F%2Fexample.com%2Ffile.docx&embedded=true',
    );
  });

  it('marks the iframe with a class instead of an id', () => {
    act(() =>
      root.render(
        <DocumentViewer viewer="google" url="https://example.com/file.docx" />,
      ),
    );

    const iframe = container.querySelector('iframe');
    expect(iframe?.id).toBe('');
    expect(iframe?.classList).toContain('react-documents-iframe');
  });

  it('remounts the iframe when a loading prop changes', () => {
    const url = 'https://example.com/file.docx';
    act(() =>
      root.render(
        <DocumentViewer viewer="office" url={url} officeRetryDelay={3000} />,
      ),
    );
    const first = container.querySelector('iframe');

    act(() =>
      root.render(
        <DocumentViewer viewer="office" url={url} officeRetryDelay={5000} />,
      ),
    );

    expect(container.querySelector('iframe')).not.toBe(first);
  });

  it('covers the google popout button when disableContent is popout', () => {
    act(() =>
      root.render(
        <DocumentViewer
          viewer="google"
          url="https://example.com/file.docx"
          disableContent="popout-hide"
        />,
      ),
    );

    const overlay = container.querySelector<HTMLElement>(
      '.react-documents-overlay',
    );
    expect(overlay?.style.width).toBe('40px');
    expect(overlay?.style.background).toBe('rgb(255, 255, 255)');
  });

  it('renders no overlay when disableContent is none', () => {
    act(() =>
      root.render(
        <DocumentViewer viewer="google" url="https://example.com/file.docx" />,
      ),
    );

    expect(container.querySelector('.react-documents-overlay')).toBeNull();
  });

  it('calls loaded when the pdf object has loaded', () => {
    const loaded = jest.fn();
    act(() =>
      root.render(
        <DocumentViewer
          viewer="pdf"
          url="https://example.com/file.pdf"
          loaded={loaded}
        />,
      ),
    );

    act(() => {
      container
        .querySelector('object')
        ?.dispatchEvent(new Event('load', { bubbles: false }));
    });
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  describe('mammoth', () => {
    const globals = globalThis as unknown as Record<string, unknown>;
    const originalXhr = globals['XMLHttpRequest'];
    let convertToHtml: jest.Mock;

    beforeEach(() => {
      class ArrayBufferXhr {
        status = 0;
        response: ArrayBuffer | null = null;
        responseType = '';
        onload?: () => void;
        open() {}
        send() {
          this.status = 200;
          this.response = new ArrayBuffer(8);
          this.onload?.();
        }
      }
      globals['XMLHttpRequest'] = ArrayBufferXhr;
      convertToHtml = jest.fn();
      globals['mammoth'] = { convertToHtml };
    });

    afterEach(() => {
      globals['XMLHttpRequest'] = originalXhr;
      delete globals['mammoth'];
      jest.useRealTimers();
    });

    it('renders the converted html and calls loaded', async () => {
      convertToHtml.mockResolvedValue({ value: '<p>converted</p>' });
      const loaded = jest.fn();
      await act(async () =>
        root.render(
          <DocumentViewer
            viewer="mammoth"
            url="https://example.com/a.docx"
            loaded={loaded}
          />,
        ),
      );

      expect(container.innerHTML).toContain('<p>converted</p>');
      expect(loaded).toHaveBeenCalledTimes(1);
    });

    it('shows a timeout error when the conversion never finishes', () => {
      jest.useFakeTimers();
      convertToHtml.mockReturnValue(new Promise(() => undefined));
      act(() =>
        root.render(
          <DocumentViewer viewer="mammoth" url="https://example.com/a.docx" />,
        ),
      );

      act(() => {
        jest.advanceTimersByTime(15000);
      });
      expect(container.textContent).toContain(
        'The mammoth viewer did not finish loading in time.',
      );
    });
  });
});
