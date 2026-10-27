import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxDocViewerComponent, ViewerStateContext } from './document-viewer.component';

// Under Angular 22 the component compiles as OnPush, so these specs only call
// fixture.detectChanges() where an app would run a regular tick (after an event,
// timer or request has finished).
// The library targets ES2022, so native async/await is invisible to zone.js and
// fixture.whenStable(); wait for the mammoth conversion to settle instead.
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('NgxDocViewerComponent (OnPush)', () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const originalXhr = globals['XMLHttpRequest'];
  let convertToHtml: jest.Mock;

  beforeEach(() => {
    class ArrayBufferXhr {
      status = 0;
      response: ArrayBuffer | null = null;
      responseType = '';
      onload?: () => void;
      onerror?: () => void;
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

  it('compiles as OnPush', () => {
    expect(
      (NgxDocViewerComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp
        .onPush,
    ).toBe(true);
  });

  it('renders mammoth html once it has been converted', async () => {
    convertToHtml.mockResolvedValue({ value: '<p>converted</p>' });
    const fixture = TestBed.createComponent(NgxDocViewerComponent);
    fixture.componentRef.setInput('viewer', 'mammoth');
    fixture.componentRef.setInput('url', 'https://example.com/a.docx');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    const page = fixture.nativeElement.querySelector('.inline-document-page');
    expect(page.innerHTML).toBe('<p>converted</p>');
    expect(fixture.nativeElement.querySelector('.loading-overlay')).toBeNull();
  });

  it('shows the timeout error raised by a timer', () => {
    jest.useFakeTimers();
    const fixture = TestBed.createComponent(NgxDocViewerComponent);
    fixture.componentRef.setInput('viewer', 'pdf');
    fixture.componentRef.setInput('url', 'https://example.com/a.pdf');
    fixture.detectChanges();

    jest.advanceTimersByTime(15000);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.error-overlay').textContent,
    ).toContain('The pdf viewer did not finish loading in time.');
  });

  it('shows the loading overlay for a retry() called outside an Angular event', async () => {
    convertToHtml.mockRejectedValueOnce(new Error('broken document'));
    let state: ViewerStateContext | undefined;
    const fixture = TestBed.createComponent(NgxDocViewerComponent);
    fixture.componentInstance.error.subscribe((s) => (state = s));
    fixture.componentRef.setInput('viewer', 'mammoth');
    fixture.componentRef.setInput('url', 'https://example.com/a.docx');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error-overlay')).not.toBeNull();

    convertToHtml.mockReturnValue(new Promise(() => undefined));
    state?.retry();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading-overlay')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.error-overlay')).toBeNull();
  });

  it('keeps projected error templates in sync with the host', async () => {
    @Component({
      imports: [NgxDocViewerComponent],
      // An Eager host, like apps on Angular 21 and older, must still see its own
      // state in the projected template.
      // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <ngx-doc-viewer viewer="mammoth" url="https://example.com/a.docx">
          <ng-template #errorContent let-state>
            <span class="custom-error">{{ hostLabel }}: {{ state.errorText }}</span>
          </ng-template>
        </ngx-doc-viewer>
      `,
    })
    class HostComponent {
      hostLabel = 'first';
    }
    convertToHtml.mockRejectedValue(new Error('broken document'));
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    const customError = () =>
      fixture.nativeElement.querySelector('.custom-error').textContent;
    expect(customError()).toBe('first: broken document');

    fixture.componentInstance.hostLabel = 'second';
    fixture.detectChanges();
    expect(customError()).toBe('second: broken document');
  });
});
