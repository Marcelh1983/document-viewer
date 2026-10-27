import {
  AfterRenderRef,
  Component,
  ElementRef,
  Injector,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  DisableContent,
  IFrameReloader,
  ViewerRecoveryConfig,
  ViewerRecoveryController,
  ViewerRenderPhase,
  ViewerType,
  getDisableContentOverlay,
  getDocxToHtml,
  googleCheckSubscription,
  iframeIsLoaded,
  resolveViewerDetails,
} from 'docviewhelper';

/** @deprecated Use `ViewerType` instead. */
export type viewerType = ViewerType;
interface ViewerTemplateContext {
  $implicit: ViewerStateContext;
  state: ViewerStateContext;
}
export interface ViewerStateContext {
  viewer: ViewerType;
  url: string;
  phase: ViewerRenderPhase;
  errorText: string;
  retry: () => void;
  actionUrl: string;
}

const SUPPORTED_VIEWERS: ViewerType[] = ['google', 'office', 'mammoth', 'pdf', 'url'];
// Inputs that change which document is shown; any of them starts a new load.
const SOURCE_INPUTS = ['url', 'viewer', 'viewerUrl', 'queryParams', 'overrideLocalhost'];

@Component({
  selector: 'ngx-doc-viewer',
  standalone: true,
  imports: [NgTemplateOutlet],
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
      .error-viewer {
        margin-top: 8px;
        color: #475569;
      }
      .error-url {
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        word-break: break-word;
      }
      .error-actions {
        margin-top: 14px;
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .retry-btn {
        border: 1px solid #fecaca;
        background: #fff;
        color: #991b1b;
        border-radius: 999px;
        padding: 8px 14px;
        font: inherit;
        cursor: pointer;
      }
      .secondary-action-btn {
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #334155;
        border-radius: 999px;
        padding: 8px 14px;
        text-decoration: none;
        font: inherit;
      }
      .overlay {
        position: absolute;
        z-index: 1000;
      }
      .overlay-popout-google {
        width: 40px;
        height: 40px;
        right: 26px;
        top: 11.5px;
      }
      .overlay-popout-office {
        width: 100px;
        height: 20px;
        right: 0;
        bottom: 0;
      }
      .overlay-full {
        width: 100%;
        height: 100%;
        right: 0;
        top: 0;
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
      iframe,
      object {
        display: block;
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
export class NgxDocViewerComponent implements OnChanges, OnDestroy {
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly ngZone = inject(NgZone);
  private readonly injector = inject(Injector);

  readonly loaded = output<void>();
  readonly loading = output<ViewerStateContext>();
  // eslint-disable-next-line @angular-eslint/no-output-native -- public API since v21
  readonly error = output<ViewerStateContext>();
  readonly phaseChange = output<ViewerStateContext>();

  readonly url = input('');
  readonly queryParams = input('');
  readonly viewerUrl = input('');
  readonly googleCheckInterval = input(3000);
  readonly googleMaxChecks = input(5);
  readonly googleFinalRetryDelay = input(0);
  readonly disableContent = input<DisableContent>('none');
  readonly googleCheckContentLoaded = input(true);
  readonly viewer = input<ViewerType>('google');
  readonly overrideLocalhost = input('');
  readonly loadingText = input('Loading document...');
  readonly errorTextOverride = input('');
  readonly retryButtonText = input('Retry');
  readonly officeAutoRetry = input(false);
  readonly officeRetryDelay = input(3000);
  readonly officeReloadButtonText = input('↻');
  readonly officeReloadButtonTitle = input('Reload document');
  readonly secondaryActionText = input('');
  readonly secondaryActionMode = input<'open' | 'download'>('open');

  readonly loadingTemplate = contentChild('loadingContent', { read: TemplateRef });
  readonly errorTemplate = contentChild('errorContent', { read: TemplateRef });
  readonly errorActionsTemplate = contentChild('errorActions', { read: TemplateRef });
  readonly officeReloadTemplate = contentChild('officeReloadContent', {
    read: TemplateRef,
  });
  private readonly iframe = viewChild<ElementRef<HTMLIFrameElement>>('iframe');

  readonly renderPhase = signal<ViewerRenderPhase>('idle');
  readonly externalViewer = signal(false);
  readonly fullUrl = signal<SafeResourceUrl | undefined>(undefined);
  readonly docHtml = signal('');
  readonly errorText = signal('');
  readonly sourceUrl = signal('');
  // A new key per load remounts the iframe/object so it loads (and fires load) again.
  private readonly loadKey = signal(0);
  readonly loadKeys = computed(() => (this.fullUrl() ? [this.loadKey()] : []));
  readonly displayedErrorText = computed(
    () => this.errorTextOverride() || this.errorText() || 'Unable to load document.',
  );
  readonly overlayClass = computed(() => {
    const overlay = getDisableContentOverlay(this.viewer(), this.disableContent());
    return overlay ? `overlay overlay-${overlay}` : undefined;
  });
  readonly templateContext = computed<ViewerTemplateContext>(() => {
    const state: ViewerStateContext = {
      viewer: this.viewer(),
      url: this.sourceUrl() || this.url(),
      phase: this.renderPhase(),
      errorText: this.displayedErrorText(),
      retry: () => this.retryLoad(),
      actionUrl: this.sourceUrl() || this.url(),
    };
    return { $implicit: state, state };
  });

  private checkIFrameSubscription?: IFrameReloader = undefined;
  private googleProbe?: AfterRenderRef = undefined;
  private recovery?: ViewerRecoveryController = undefined;
  private lastEmittedPhase?: ViewerRenderPhase = undefined;

  ngOnDestroy(): void {
    this.recovery?.dispose();
    this.stopGoogleProbe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['viewer'] && !SUPPORTED_VIEWERS.includes(this.viewer())) {
      console.error(
        `Unsupported viewer: '${this.viewer()}'. Supported viewers: ${SUPPORTED_VIEWERS.join(', ')}`,
      );
    }
    if (
      SOURCE_INPUTS.some(
        (name) =>
          changes[name] &&
          changes[name].currentValue !== changes[name].previousValue,
      )
    ) {
      this.load();
    }
  }

  retryLoad() {
    this.load();
  }

  iframeLoaded() {
    const iframe = this.iframe()?.nativeElement;
    if (iframe && iframeIsLoaded(iframe)) {
      this.recovery?.notifyLoaded();
      this.checkIFrameSubscription?.unsubscribe();
      this.setRenderPhase('ready');
    }
  }

  objectLoaded() {
    this.recovery?.notifyLoaded();
    this.setRenderPhase('ready');
  }

  private load() {
    const loadKey = this.loadKey() + 1;
    const isActive = () => loadKey === this.loadKey();
    this.loadKey.set(loadKey);
    const recovery = this.ensureRecovery();
    this.stopGoogleProbe();

    const url = this.url();
    const viewer = this.viewer();
    const details = resolveViewerDetails({
      url,
      viewer,
      queryParams: this.queryParams(),
      viewerUrl: this.viewerUrl(),
      overrideLocalhost: this.overrideLocalhost(),
    });
    recovery.trackSource(details.url);
    this.externalViewer.set(!!url && details.externalViewer);
    this.fullUrl.set(undefined);
    this.docHtml.set('');
    this.errorText.set('');
    this.sourceUrl.set(url);

    if (!url) {
      recovery.clearTimers();
      this.setRenderPhase('idle');
      return;
    }
    this.setRenderPhase('loading');

    if (viewer === 'mammoth') {
      recovery.beginInlineLoad(isActive);
      getDocxToHtml(details.url).then(
        (html) => {
          if (!isActive()) {
            return;
          }
          recovery.notifyLoaded();
          this.docHtml.set(html);
          this.setRenderPhase('ready');
        },
        (error) => {
          if (!isActive()) {
            return;
          }
          recovery.clearTimers();
          this.errorText.set(
            error instanceof Error ? error.message : 'Unable to load document.',
          );
          this.setRenderPhase('error');
        },
      );
      return;
    }

    this.fullUrl.set(this.domSanitizer.bypassSecurityTrustResourceUrl(details.url));
    const plan = recovery.beginExternalLoad(isActive);
    if (plan.modes.includes('google-probe')) {
      this.startGoogleProbe(isActive);
    }
  }

  private ensureRecovery(): ViewerRecoveryController {
    if (!this.recovery) {
      this.recovery = new ViewerRecoveryController(this.buildRecoveryConfig(), {
        triggerRetry: () => this.retryLoad(),
        reportTimeout: () => {
          if (this.renderPhase() !== 'loading') {
            return;
          }
          this.errorText.set(
            `The ${this.viewer()} viewer did not finish loading in time.`,
          );
          this.setRenderPhase('error');
        },
      });
    }
    this.recovery.configure(this.buildRecoveryConfig());
    return this.recovery;
  }

  private buildRecoveryConfig(): ViewerRecoveryConfig {
    return {
      viewer: this.viewer(),
      googleCheckContentLoaded: this.googleCheckContentLoaded(),
      googleCheckInterval: this.googleCheckInterval(),
      googleMaxChecks: this.googleMaxChecks(),
      googleFinalRetryDelay: this.googleFinalRetryDelay(),
      officeAutoRetry: this.officeAutoRetry(),
      officeRetryDelay: this.officeRetryDelay(),
    };
  }

  // Google sometimes answers with an empty 204 page; reload the iframe until the
  // viewer shows up. Starts once the iframe for this load has been rendered.
  // see: https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives
  private startGoogleProbe(isActive: () => boolean) {
    this.googleProbe = afterNextRender(
      () => {
        this.googleProbe = undefined;
        const iframe = this.iframe()?.nativeElement;
        if (!isActive() || !iframe) {
          return;
        }
        this.checkIFrameSubscription = googleCheckSubscription();
        this.ngZone.runOutsideAngular(() =>
          this.checkIFrameSubscription?.subscribe(
            iframe,
            this.googleCheckInterval(),
            this.googleMaxChecks(),
          ),
        );
      },
      { injector: this.injector },
    );
  }

  private stopGoogleProbe() {
    this.googleProbe?.destroy();
    this.googleProbe = undefined;
    this.checkIFrameSubscription?.unsubscribe();
    this.checkIFrameSubscription = undefined;
  }

  private setRenderPhase(phase: ViewerRenderPhase) {
    this.renderPhase.set(phase);
    if (this.lastEmittedPhase === phase) {
      return;
    }
    this.lastEmittedPhase = phase;
    const { state } = this.templateContext();
    this.phaseChange.emit(state);
    if (phase === 'loading') {
      this.loading.emit(state);
    }
    if (phase === 'error') {
      this.error.emit(state);
    }
    if (phase === 'ready') {
      this.loaded.emit();
    }
  }
}
