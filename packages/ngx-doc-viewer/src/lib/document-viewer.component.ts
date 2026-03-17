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
  getViewerRecoveryPlan,
  googleCheckSubscription,
  iframeIsLoaded,
  isLocalFile,
  replaceLocalUrl,
  IFrameReloader,
} from 'docviewhelper';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type viewerType = 'google' | 'office' | 'mammoth' | 'pdf' | 'url';
type ViewerRenderPhase = 'idle' | 'loading' | 'ready' | 'error';
interface ViewerTemplateContext {
  $implicit: ViewerStateContext;
  state: ViewerStateContext;
}
export interface ViewerStateContext {
  viewer: viewerType;
  url: string;
  phase: ViewerRenderPhase;
  errorText: string;
  retry: () => void;
  actionUrl: string;
}
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
      .office-reload-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 1001;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: rgba(255, 255, 255, 0.85);
        color: #475569;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        transition: opacity 0.15s;
        padding: 0;
      }
      .office-reload-btn:hover {
        opacity: 1;
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
  @Output() loading: EventEmitter<ViewerStateContext> = new EventEmitter();
  @Output() error: EventEmitter<ViewerStateContext> = new EventEmitter();
  @Output() phaseChange: EventEmitter<ViewerStateContext> = new EventEmitter();
  @Input() url = '';
  @Input() queryParams = '';
  @Input() viewerUrl = '';
  @Input() googleCheckInterval = 3000;
  @Input() googleMaxChecks = 5;
  @Input() googleFinalRetryDelay = 0;
  @Input() disableContent: 'none' | 'all' | 'popout' | 'popout-hide' = 'none';
  @Input() googleCheckContentLoaded = true;
  @Input() viewer: viewerType = 'google';
  @Input() overrideLocalhost = '';
  @Input() loadingText = 'Loading document...';
  @Input() errorTextOverride = '';
  @Input() retryButtonText = 'Retry';
  @Input() officeAutoRetry = false;
  @Input() officeRetryDelay = 3000;
  @Input() officeReloadButtonText = '↻';
  @Input() officeReloadButtonTitle = 'Reload document';
  @Input() secondaryActionText = '';
  @Input() secondaryActionMode: 'open' | 'download' = 'open';
  @ContentChild('loadingContent', { read: TemplateRef })
  loadingTemplate?: TemplateRef<unknown>;
  @ContentChild('errorContent', { read: TemplateRef })
  errorTemplate?: TemplateRef<unknown>;
  @ContentChild('errorActions', { read: TemplateRef })
  errorActionsTemplate?: TemplateRef<unknown>;
  @ContentChild('officeReloadContent', { read: TemplateRef })
  officeReloadTemplate?: TemplateRef<unknown>;
  @ViewChildren('iframe') iframes?: QueryList<ElementRef> = undefined;

  public fullUrl?: SafeResourceUrl = undefined;
  public externalViewer = false;
  public docHtml = '';
  public configuredViewer: viewerType = 'google';
  public showIframe = true;
  public renderPhase: ViewerRenderPhase = 'idle';
  public errorText = '';
  public failedUrl = '';
  public retryNonce = 0;
  public loadingTemplateContext: ViewerTemplateContext = this.createTemplateContext();
  public errorTemplateContext: ViewerTemplateContext = this.createTemplateContext();
  private checkIFrameSubscription?: IFrameReloader = undefined;
  private loadVersion = 0;
  private externalLoadTimeoutId?: number = undefined;
  private googleFinalRetryTimeoutId?: number = undefined;
  private googleFinalRetriedSourceKey?: string = undefined;
  private currentGoogleSourceKey?: string = undefined;
  private officeRetryTimeoutId?: number = undefined;
  private officeAutoRetriedSourceKey?: string = undefined;
  private currentOfficeSourceKey?: string = undefined;
  private lastEmittedPhase?: ViewerRenderPhase = undefined;

  constructor(
    private domSanitizer: DomSanitizer,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.clearExternalLoadTimeout();
    this.clearGoogleFinalRetry();
    this.clearOfficeRetry();
    if (this.checkIFrameSubscription) {
      this.checkIFrameSubscription.unsubscribe();
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (
      changes &&
      changes['retryNonce'] &&
      changes['retryNonce'].firstChange
    ) {
      return;
    }
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
      this.updateTemplateContexts();
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
      this.clearExternalLoadTimeout();
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
      const officeSourceKey =
        this.configuredViewer === 'office' ? viewerDetails.url : undefined;
      if (officeSourceKey !== this.currentOfficeSourceKey) {
        this.officeAutoRetriedSourceKey = undefined;
      }
      this.currentOfficeSourceKey = officeSourceKey;
      const googleSourceKey =
        this.configuredViewer === 'google' ? viewerDetails.url : undefined;
      if (googleSourceKey !== this.currentGoogleSourceKey) {
        this.googleFinalRetriedSourceKey = undefined;
      }
      this.currentGoogleSourceKey = googleSourceKey;
      this.docHtml = '';
      this.errorText = '';
      this.failedUrl = this.url;
      this.clearGoogleFinalRetry();
      this.clearOfficeRetry();
      this.updateTemplateContexts();
      if (this.checkIFrameSubscription) {
        this.checkIFrameSubscription.unsubscribe();
      }
      if (!this.url) {
        this.fullUrl = undefined;
        this.showIframe = false;
        this.externalViewer = false;
        this.setRenderPhase('idle');
        this.updateTemplateContexts();
      } else if (
        viewerDetails.externalViewer ||
        this.configuredViewer === 'url' ||
        this.configuredViewer === 'pdf'
      ) {
        this.setRenderPhase('loading');
        const iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
          viewerDetails.url,
        );
        this.fullUrl = undefined;
        this.showIframe = false;
        this.cdr.detectChanges();
        this.fullUrl = iframeUrl;
        this.showIframe = true;
        this.updateTemplateContexts();
        this.scheduleExternalLoadTimeout(loadVersion);
        this.cdr.detectChanges();
        this.scheduleViewerRecovery();
      } else if (this.configuredViewer === 'mammoth') {
        this.setRenderPhase('loading');
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
            this.setRenderPhase('ready');
            this.updateTemplateContexts();
            this.cdr.detectChanges();
          });
        } catch (error) {
          if (loadVersion !== this.loadVersion) {
            return;
          }
          this.ngZone.run(() => {
            this.errorText =
              error instanceof Error ? error.message : 'Unable to load document.';
            this.setRenderPhase('error');
            this.updateTemplateContexts();
            this.cdr.detectChanges();
          });
        }
      }
    }
  }

  retryLoad() {
    this.retryNonce += 1;
    const retryVersion = ++this.loadVersion;
    this.clearExternalLoadTimeout();
    this.clearGoogleFinalRetry();
    this.clearOfficeRetry();
    this.errorText = '';
    this.setRenderPhase(this.url ? 'loading' : 'idle');
    this.updateTemplateContexts();

    if (!this.url) {
      return;
    }

    if (this.configuredViewer === 'mammoth') {
      this.docHtml = '';
      void this.reloadMammoth(retryVersion);
      return;
    }

    if (
      this.configuredViewer === 'google' ||
      this.configuredViewer === 'office' ||
      this.configuredViewer === 'url' ||
      this.configuredViewer === 'pdf'
    ) {
      const details = getViewerDetails(
        this.url,
        this.configuredViewer,
        this.queryParams,
        this.viewerUrl,
      );
      const finalUrl =
        details.externalViewer && this.overrideLocalhost && isLocalFile(this.url)
          ? getViewerDetails(
              replaceLocalUrl(this.url, this.overrideLocalhost),
              this.configuredViewer,
              this.queryParams,
              this.viewerUrl,
            ).url
          : details.url;

      this.fullUrl = undefined;
      this.showIframe = false;
      this.cdr.detectChanges();
      this.fullUrl =
        this.domSanitizer.bypassSecurityTrustResourceUrl(finalUrl);
      this.showIframe = true;
      this.scheduleExternalLoadTimeout(retryVersion);
      this.scheduleViewerRecovery();
      this.updateTemplateContexts();
      this.cdr.detectChanges();
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

  private scheduleViewerRecovery() {
    const recoveryPlan = getViewerRecoveryPlan({
      viewer: this.configuredViewer,
      googleCheckContentLoaded: this.googleCheckContentLoaded,
      googleFinalRetryDelay: this.googleFinalRetryDelay,
      officeAutoRetry: this.officeAutoRetry,
    });
    for (const mode of recoveryPlan.modes) {
      if (mode === 'google-probe') {
        this.scheduleGoogleRecovery();
      }
      if (mode === 'google-final-retry') {
        continue;
      }
      if (mode === 'office-auto-retry') {
        this.scheduleOfficeRetry();
      }
    }
  }

  private scheduleGoogleRecovery() {
    if (
      this.configuredViewer !== 'google' ||
      !this.googleCheckContentLoaded
    ) {
      return;
    }
    // see:
    // https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives
    // hack to reload iframe if it's not loaded.
    this.ngZone.runOutsideAngular(() => {
      window.setTimeout(() => {
        const iframe = this.iframes?.first?.nativeElement as HTMLIFrameElement;
        if (iframe) {
          this.reloadIframe(iframe);
        }
      }, 0);
    });
  }

  iframeLoaded() {
    const iframe = this.iframes?.first?.nativeElement as HTMLIFrameElement;
    if (iframe && iframeIsLoaded(iframe)) {
      this.clearExternalLoadTimeout();
      this.clearGoogleFinalRetry();
      this.clearOfficeRetry();
      this.setRenderPhase('ready');
      this.updateTemplateContexts();
      this.loaded.emit(undefined);
      if (this.checkIFrameSubscription) {
        this.checkIFrameSubscription.unsubscribe();
      }
    }
  }

  objectLoaded() {
    this.clearExternalLoadTimeout();
    this.clearGoogleFinalRetry();
    this.clearOfficeRetry();
    this.setRenderPhase('ready');
    this.updateTemplateContexts();
  }

  private async reloadMammoth(loadVersion: number) {
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
        this.setRenderPhase('ready');
        this.updateTemplateContexts();
        this.cdr.detectChanges();
      });
    } catch (error) {
      if (loadVersion !== this.loadVersion) {
        return;
      }
      this.ngZone.run(() => {
        this.errorText =
          error instanceof Error ? error.message : 'Unable to load document.';
        this.setRenderPhase('error');
        this.updateTemplateContexts();
        this.cdr.detectChanges();
      });
    }
  }

  private scheduleExternalLoadTimeout(loadVersion: number) {
    this.clearExternalLoadTimeout();
    const timeoutMs =
      this.configuredViewer === 'google'
        ? Math.max(this.googleCheckInterval * this.googleMaxChecks + 2000, 15000)
        : 15000;
    this.externalLoadTimeoutId = window.setTimeout(() => {
      if (loadVersion !== this.loadVersion || this.renderPhase !== 'loading') {
        return;
      }
      if (this.scheduleGoogleFinalRetry()) {
        return;
      }
      this.ngZone.run(() => {
        this.errorText = `The ${this.configuredViewer} viewer did not finish loading in time.`;
        this.setRenderPhase('error');
        this.updateTemplateContexts();
        this.cdr.detectChanges();
      });
    }, timeoutMs);
  }

  private clearExternalLoadTimeout() {
    if (this.externalLoadTimeoutId) {
      window.clearTimeout(this.externalLoadTimeoutId);
      this.externalLoadTimeoutId = undefined;
    }
  }

  private clearGoogleFinalRetry() {
    if (this.googleFinalRetryTimeoutId) {
      window.clearTimeout(this.googleFinalRetryTimeoutId);
      this.googleFinalRetryTimeoutId = undefined;
    }
  }

  private clearOfficeRetry() {
    if (this.officeRetryTimeoutId) {
      window.clearTimeout(this.officeRetryTimeoutId);
      this.officeRetryTimeoutId = undefined;
    }
  }

  private scheduleOfficeRetry() {
    if (
      this.configuredViewer !== 'office' ||
      !this.officeAutoRetry ||
      !this.currentOfficeSourceKey ||
      this.officeAutoRetriedSourceKey === this.currentOfficeSourceKey
    ) {
      return;
    }
    this.clearOfficeRetry();
    this.officeRetryTimeoutId = window.setTimeout(() => {
      if (
        !this.currentOfficeSourceKey ||
        this.officeAutoRetriedSourceKey === this.currentOfficeSourceKey
      ) {
        return;
      }
      this.officeAutoRetriedSourceKey = this.currentOfficeSourceKey;
      this.ngZone.run(() => this.retryLoad());
    }, this.officeRetryDelay);
  }

  private scheduleGoogleFinalRetry() {
    const recoveryPlan = getViewerRecoveryPlan({
      viewer: this.configuredViewer,
      googleCheckContentLoaded: this.googleCheckContentLoaded,
      googleFinalRetryDelay: this.googleFinalRetryDelay,
      officeAutoRetry: this.officeAutoRetry,
    });
    if (
      !recoveryPlan.modes.includes('google-final-retry') ||
      !this.currentGoogleSourceKey ||
      this.googleFinalRetriedSourceKey === this.currentGoogleSourceKey
    ) {
      return false;
    }
    this.clearGoogleFinalRetry();
    this.googleFinalRetryTimeoutId = window.setTimeout(() => {
      if (
        !this.currentGoogleSourceKey ||
        this.googleFinalRetriedSourceKey === this.currentGoogleSourceKey
      ) {
        return;
      }
      this.googleFinalRetriedSourceKey = this.currentGoogleSourceKey;
      this.ngZone.run(() => this.retryLoad());
    }, this.googleFinalRetryDelay);
    return true;
  }

  get displayedErrorText() {
    return this.errorTextOverride || this.errorText || 'Unable to load document.';
  }

  private updateTemplateContexts() {
    const state = this.createStateContext();
    this.loadingTemplateContext = { $implicit: state, state };
    this.errorTemplateContext = { $implicit: state, state };
  }

  private createTemplateContext(): ViewerTemplateContext {
    const state = this.createStateContext();
    return { $implicit: state, state };
  }

  private createStateContext(): ViewerStateContext {
    return {
      viewer: this.configuredViewer,
      url: this.failedUrl || this.url,
      phase: this.renderPhase,
      errorText: this.displayedErrorText,
      retry: () => this.retryLoad(),
      actionUrl: this.failedUrl || this.url,
    };
  }

  private setRenderPhase(phase: ViewerRenderPhase) {
    this.renderPhase = phase;
    this.emitLifecycleIfNeeded();
  }

  private emitLifecycleIfNeeded() {
    if (this.lastEmittedPhase === this.renderPhase) {
      return;
    }
    this.lastEmittedPhase = this.renderPhase;
    const state = this.createStateContext();
    this.phaseChange.emit(state);
    if (this.renderPhase === 'loading') {
      this.loading.emit(state);
    }
    if (this.renderPhase === 'error') {
      this.error.emit(state);
    }
  }
}
