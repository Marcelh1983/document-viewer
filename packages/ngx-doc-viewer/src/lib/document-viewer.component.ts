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
  public isLoading = false;
  private checkIFrameSubscription?: IFrameReloader = undefined;

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
      if (this.checkIFrameSubscription) {
        this.checkIFrameSubscription.unsubscribe();
      }
      if (!this.url) {
        this.fullUrl = undefined;
        this.showIframe = false;
        this.isLoading = false;
      } else if (
        viewerDetails.externalViewer ||
        this.configuredViewer === 'url' ||
        this.configuredViewer === 'pdf'
      ) {
        this.isLoading = true;
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
        this.isLoading = true;
        this.fullUrl = undefined;
        this.showIframe = false;
        const docHtml = await getDocxToHtml(this.url);
        this.ngZone.run(() => {
          this.docHtml = docHtml;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
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
      this.isLoading = false;
      this.loaded.emit(undefined);
      if (this.checkIFrameSubscription) {
        this.checkIFrameSubscription.unsubscribe();
      }
    }
  }

  objectLoaded() {
    this.isLoading = false;
  }
}
