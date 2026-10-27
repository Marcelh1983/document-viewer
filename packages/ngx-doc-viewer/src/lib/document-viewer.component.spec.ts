import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxDocViewerComponent, ViewerStateContext } from './document-viewer.component';
import { GOOGLE_VIEWER_SANDBOX } from 'docviewhelper';

describe('NgxDocViewerComponent', () => {
  let fixture: ComponentFixture<NgxDocViewerComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxDocViewerComponent);
  });

  it('stays idle without a url', () => {
    fixture.componentRef.setInput('url', '');
    fixture.detectChanges();

    expect(fixture.componentInstance.renderPhase()).toBe('idle');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('renders the pdf viewer as an object and emits loading', () => {
    const phases: ViewerStateContext['phase'][] = [];
    fixture.componentInstance.phaseChange.subscribe((state) =>
      phases.push(state.phase),
    );
    fixture.componentRef.setInput('viewer', 'pdf');
    fixture.componentRef.setInput('url', 'https://example.com/file.pdf');
    fixture.detectChanges();

    const object: HTMLObjectElement =
      fixture.nativeElement.querySelector('object');
    expect(object.getAttribute('data')).toBe('https://example.com/file.pdf');
    expect(phases).toEqual(['loading']);
    expect(
      fixture.nativeElement.querySelector('.ngx-doc-viewer-loading-overlay').textContent,
    ).toContain('Loading document...');
  });

  it('wraps the url in the google viewer iframe', () => {
    fixture.componentRef.setInput('viewer', 'google');
    fixture.componentRef.setInput('url', 'https://example.com/file.docx');
    fixture.detectChanges();

    const iframe: HTMLIFrameElement =
      fixture.nativeElement.querySelector('iframe');
    expect(iframe.src).toBe(
      'https://docs.google.com/gview?url=https%3A%2F%2Fexample.com%2Ffile.docx&embedded=true',
    );
  });

  it('reloads the iframe when queryParams change', () => {
    fixture.componentRef.setInput('viewer', 'google');
    fixture.componentRef.setInput('url', 'https://example.com/file.docx');
    fixture.detectChanges();
    fixture.componentRef.setInput('queryParams', 'hl=nl');
    fixture.detectChanges();

    const iframe: HTMLIFrameElement =
      fixture.nativeElement.querySelector('iframe');
    expect(iframe.src).toContain('&embedded=true&hl=nl');
  });

  it('marks the iframe with a class instead of an id', () => {
    fixture.componentRef.setInput('url', 'https://example.com/file.docx');
    fixture.detectChanges();

    const iframe: HTMLIFrameElement =
      fixture.nativeElement.querySelector('iframe');
    expect(iframe.id).toBe('');
    expect(iframe.classList).toContain('ngx-doc-viewer-iframe');
  });

  it('covers the office popout button when disableContent is popout', () => {
    fixture.componentRef.setInput('viewer', 'office');
    fixture.componentRef.setInput('url', 'https://example.com/file.docx');
    fixture.componentRef.setInput('disableContent', 'popout');
    fixture.detectChanges();

    const overlay: HTMLElement = fixture.nativeElement.querySelector(
      '.ngx-doc-viewer-overlay',
    );
    expect(overlay.classList).toContain('ngx-doc-viewer-overlay-popout-office');
    expect(fixture.nativeElement.querySelector('iframe')).not.toBeNull();
  });

  it('emits loaded when the pdf object has loaded', () => {
    const loaded = jest.fn();
    fixture.componentInstance.loaded.subscribe(loaded);
    fixture.componentRef.setInput('viewer', 'pdf');
    fixture.componentRef.setInput('url', 'https://example.com/file.pdf');
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('object')
      .dispatchEvent(new Event('load'));
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  it('remounts the iframe on retry', () => {
    fixture.componentRef.setInput('url', 'https://example.com/file.docx');
    fixture.detectChanges();
    const first = fixture.nativeElement.querySelector('iframe');

    fixture.componentInstance.retryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('iframe')).not.toBe(first);
  });

  it('starts the google reload probe on the rendered iframe', () => {
    jest.useFakeTimers();
    try {
      fixture.componentRef.setInput('viewer', 'google');
      fixture.componentRef.setInput('url', 'https://example.com/file.docx');
      fixture.detectChanges();
      const iframe: HTMLIFrameElement =
        fixture.nativeElement.querySelector('iframe');

      // jsdom leaves the cross-origin viewer as a readable blank page, so the
      // probe treats it as Google's empty 204 response and reloads.
      jest.advanceTimersByTime(3000);
      expect(iframe.src).toBe('about:blank');
    } finally {
      fixture.destroy();
      jest.useRealTimers();
    }
  });

  it('sandboxes only the google viewer iframe, matching GOOGLE_VIEWER_SANDBOX', () => {
    fixture.componentRef.setInput('viewer', 'google');
    fixture.componentRef.setInput('url', 'https://example.com/file.docx');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('iframe').getAttribute('sandbox'),
    ).toBe(GOOGLE_VIEWER_SANDBOX);

    fixture.componentRef.setInput('viewer', 'office');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('iframe').hasAttribute('sandbox'),
    ).toBe(false);
  });

  it('uses prefixed class names that app css (Tailwind, Bootstrap) cannot hit', () => {
    fixture.componentRef.setInput('viewer', 'pdf');
    fixture.componentRef.setInput('url', 'https://example.com/file.pdf');
    fixture.detectChanges();

    const classes = [...fixture.nativeElement.querySelectorAll('[class]')]
      .flatMap((el: Element) => [...el.classList]);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((c) => !c.startsWith('ngx-doc-viewer-'))).toEqual([]);
  });
});
