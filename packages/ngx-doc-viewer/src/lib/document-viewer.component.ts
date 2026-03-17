import {
  Component,
  Input,
  NgZone,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Output,
  ViewChildren,
  QueryList,
  ElementRef,
  ChangeDetectorRef,
  ContentChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EventEmitter } from '@angular/core';
import {
  getDocxToHtml,
  getViewerDetails,
  googleCheckSubscription,
  iframeIsLoaded,
  isLocalFile,
  replaceLocalUrl,
  IFrameReloader,
} from 'docviewhelper';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type viewerType = 'google' | 'office' | 'mammoth' | 'pdf' | 'url';
type ViewerRenderPhase = 'idle' | 'loading' | 'ready' | 'error';
@Component({
  selector: 'ngx-doc-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'document-viewer.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .container {
        width: 100%;
        height: 100%;
        position: relative;
      }
      .inline-document-shell {
        width: 100%;
        height: 100%;
        overflow: auto;
        background:
          linear-gradient(180deg, #eef2f7 0%, #f8fafc 100%);
        padding: 24px;
      }
      .inline-document-page {
        max-width: 900px;
        min-height: 100%;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #dbe4f0;
        border-radius: 18px;
        box-shadow:
          0 18px 40px -24px rgba(15, 23, 42, 0.3),
          0 6px 18px -10px rgba(15, 23, 42, 0.18);
        padding: 40px 48px;
      }
      .inline-document-page,
      .inline-document-page * {
        box-sizing: border-box;
      }
      .inline-document-page {
        color: #1e293b;
        font-family:
          Georgia, Cambria, 'Times New Roman', Times, serif;
        font-size: 18px;
        line-height: 1.7;
      }
      .inline-document-page p,
      .inline-document-page ul,
      .inline-document-page ol,
      .inline-document-page blockquote,
      .inline-document-page table {
        margin: 0 0 1.1em;
      }
      .inline-document-page h1,
      .inline-document-page h2,
      .inline-document-page h3,
      .inline-document-page h4,
      .inline-document-page h5,
      .inline-document-page h6 {
        margin: 1.4em 0 0.65em;
        color: #0f172a;
        line-height: 1.25;
      }
      .inline-document-page h1:first-child,
      .inline-document-page h2:first-child,
      .inline-document-page h3:first-child,
      .inline-document-page p:first-child {
        margin-top: 0;
      }
      .inline-document-page table {
        width: 100%;
        border-collapse: collapse;
      }
      .inline-document-page td,
      .inline-document-page th {
        padding: 6px 10px;
        vertical-align: top;
      }
      .inline-document-page img {
        max-width: 100%;
        height: auto;
      }
      .inline-document-page hr {
        border: 0;
        border-top: 1px solid #dbe4f0;
        margin: 1.5em 0;
      }
      .loading-overlay {
        position: absolute;
        inset: 0;
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.88);
        color: #475569;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-align: center;
        padding: 16px;
      }
      .error-overlay {
        position: absolute;
        inset: 0;
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.94);
        color: #991b1b;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-align: center;
        padding: 16px;
      }
      .overlay-popout-google {
        width: 40px;
        height: 40px;
        right: 26px;
        top: 11.5px;
        position: absolute;
        z-index: 1000;
      }
      .overlay-popout-office {
        width: 100px;
        height: 20px;
        right: 0;
        bottom: 0;
        position: absolute;
        z-index: 1000;
      }
      .overlay-full {
        width: 100%;
        height: 100%;
        right: 0;
        top: 0;
        position: absolute;
        z-index: 1000;
      }
      iframe {
        width: 100%;
        height: 100%;
      }
      @media (max-width: 768px) {
        .inline-document-shell {
          padding: 12px;
        }
        .inline-document-page {
          border-radius: 12px;
          padding: 22px 18px;
        }
      }
    `,
  ],
})
export class NgxDocViewerComponent
  implements OnChanges, OnDestroy
{
  @Output() loaded: EventEmitter<void> = new EventEmitter();
  @Input() url = '';
  @Input() queryParams = '';
  @Input() viewerUrl = '';
  @Input() googleCheckInterval = 3000;
  @Input() googleMaxChecks = 5;
  @Input() disableContent: 'none' | 'all' | 'popout' | 'popout-hide' = 'none';
  @Input() googleCheckContentLoaded = true;
  @Input() viewer: viewerType = 'google';
  @Input() overrideLocalhost = '';
  @Input() loadingText = 'Loading document...';
  @ContentChild('loadingContent', { read: TemplateRef })
  loadingTemplate?: TemplateRef<unknown>;
  @ViewChildren('iframe') iframes?: QueryList<ElementRef> = undefined;

  public fullUrl?: SafeResourceUrl = undefined;
  public externalViewer = false;
  public docHtml = '';
  public configuredViewer: viewerType = 'google';
  public showIframe = true;
  public renderPhase: ViewerRenderPhase = 'idle';
  public errorText = '';
  private checkIFrameSubscription?: IFrameReloader = undefined;
  private loadVersion = 0;

  constructor(
    private domSanitizer: DomSanitizer,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    if (this.checkIFrameSubscription) {
      this.checkIFrameSubscription.unsubscribe();
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (
      changes &&
      changes['viewer'] &&
      (changes['viewer'].firstChange ||
        changes['viewer'].currentValue !== changes['viewer'].previousValue)
    ) {
      if (
        this.viewer !== 'google' &&
        this.viewer !== 'office' &&
        this.viewer !== 'mammoth' &&
        this.viewer !== 'pdf' &&
        this.viewer !== 'url'
      ) {
        console.error(
          `Unsupported viewer: '${this.viewer}'. Supported viewers: google, office, mammoth and pdf`,
        );
      }
      this.configuredViewer = this.viewer;
    }

    if (
      (changes['url'] &&
        changes['url'].currentValue !== changes['url'].previousValue) ||
      (changes['viewer'] &&
        changes['viewer'].currentValue !== changes['viewer'].previousValue) ||
      (changes['viewerUrl'] &&
        changes['viewerUrl'].currentValue !==
          changes['viewerUrl'].previousValue)
    ) {
      let viewerDetails = getViewerDetails(
        this.url,
        this.configuredViewer,
        this.queryParams,
        this.viewerUrl,
      );
      const loadVersion = ++this.loadVersion;
      this.externalViewer = viewerDetails.externalViewer;
      if (
        viewerDetails.externalViewer &&
        this.overrideLocalhost &&
        isLocalFile(this.url)
      ) {
        const newUrl = replaceLocalUrl(this.url, this.overrideLocalhost);
        viewerDetails = getViewerDetails(
          newUrl,
          this.configuredViewer,
          this.queryParams,
          this.viewerUrl,
        );
      }
      this.docHtml = '';
      this.errorText = '';
      if (this.checkIFrameSubscription) {
        this.checkIFrameSubscription.unsubscribe();
      }
      if (!this.url) {
        this.fullUrl = undefined;
        this.showIframe = false;
        this.externalViewer = false;
        this.renderPhase = 'idle';
      } else if (
        viewerDetails.externalViewer ||
        this.configuredViewer === 'url' ||
        this.configuredViewer === 'pdf'
      ) {
        this.renderPhase = 'loading';
        const iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
          viewerDetails.url,
        );
        this.fullUrl = undefined;
        this.showIframe = false;
        this.cdr.detectChanges();
        this.fullUrl = iframeUrl;
        this.showIframe = true;
        // see:
        // https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives
        // hack to reload iframe if it's not loaded.
        // would maybe be better to use view.officeapps.live.com but seems not to work with sas token.
        this.cdr.detectChanges();
        if (
          this.configuredViewer === 'google' &&
          this.googleCheckContentLoaded
        ) {
          this.ngZone.runOutsideAngular(() => {
            window.setTimeout(() => {
              const iframe = this.iframes?.first
                ?.nativeElement as HTMLIFrameElement;
              if (iframe) {
                this.reloadIframe(iframe);
              }
            }, 0);
          });
        }
      } else if (this.configuredViewer === 'mammoth') {
        this.renderPhase = 'loading';
        this.externalViewer = false;
        this.fullUrl = undefined;
        this.showIframe = false;
        try {
          const docHtml = await getDocxToHtml(this.url);
          if (loadVersion !== this.loadVersion) {
            return;
          }
          this.ngZone.run(() => {
            this.docHtml = docHtml;
            this.renderPhase = 'ready';
            this.cdr.detectChanges();
          });
        } catch (error) {
          if (loadVersion !== this.loadVersion) {
            return;
          }
          this.ngZone.run(() => {
            this.errorText =
              error instanceof Error ? error.message : 'Unable to load document.';
            this.renderPhase = 'error';
            this.cdr.detectChanges();
          });
        }
      }
    }
  }

  private reloadIframe(iframe: HTMLIFrameElement) {
    this.checkIFrameSubscription = googleCheckSubscription();
    this.checkIFrameSubscription.subscribe(
      iframe,
      this.googleCheckInterval,
      this.googleMaxChecks,
    );
  }

  iframeLoaded() {
    const iframe = this.iframes?.first?.nativeElement as HTMLIFrameElement;
    if (iframe && iframeIsLoaded(iframe)) {
      this.renderPhase = 'ready';
      this.loaded.emit(undefined);
      if (this.checkIFrameSubscription) {
        this.checkIFrameSubscription.unsubscribe();
      }
    }
  }

  objectLoaded() {
    this.renderPhase = 'ready';
  }
}
