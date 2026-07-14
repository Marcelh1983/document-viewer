import { getViewerRecoveryPlan } from './helper';
import { ViewerRecoveryPlan, ViewerType } from './model';

export interface ViewerRecoveryConfig {
  viewer: ViewerType;
  googleCheckContentLoaded: boolean;
  googleCheckInterval: number;
  googleMaxChecks: number;
  googleFinalRetryDelay: number;
  officeAutoRetry: boolean;
  officeRetryDelay: number;
}

export interface ViewerRecoveryHandlers {
  /**
   * Start a fresh load of the current document. Used by the google final-retry
   * and office auto-retry recovery modes.
   */
  triggerRetry: () => void;
  /**
   * The external viewer did not finish loading in time and no retry is pending.
   * The host should surface the timeout error (guarding on its own load phase).
   */
  reportTimeout: () => void;
}

/**
 * Framework-agnostic orchestration for the google/office iframe recovery logic
 * shared by ngx-doc-viewer and react-documents. Owns the load-timeout,
 * google-final-retry and office-auto-retry timers plus the per-source retry
 * bookkeeping. The google-probe iframe reload stays in the host because it is
 * framework specific (iframe refs, Angular zones).
 */
export class ViewerRecoveryController {
  private externalLoadTimeoutId?: ReturnType<typeof setTimeout>;
  private googleFinalRetryTimeoutId?: ReturnType<typeof setTimeout>;
  private officeRetryTimeoutId?: ReturnType<typeof setTimeout>;
  private googleFinalRetriedSourceKey?: string;
  private currentGoogleSourceKey?: string;
  private officeAutoRetriedSourceKey?: string;
  private currentOfficeSourceKey?: string;

  constructor(
    private config: ViewerRecoveryConfig,
    private readonly handlers: ViewerRecoveryHandlers,
  ) {}

  /** Update the active configuration (e.g. after inputs change). */
  configure(config: ViewerRecoveryConfig): void {
    this.config = config;
  }

  /**
   * Track the resolved viewer URL as the current source. Resets the per-source
   * "already retried" flags whenever the source changes so a new document gets
   * its own recovery budget.
   */
  trackSource(resolvedUrl: string): void {
    const officeSourceKey =
      this.config.viewer === 'office' ? resolvedUrl : undefined;
    if (officeSourceKey !== this.currentOfficeSourceKey) {
      this.officeAutoRetriedSourceKey = undefined;
    }
    this.currentOfficeSourceKey = officeSourceKey;

    const googleSourceKey =
      this.config.viewer === 'google' ? resolvedUrl : undefined;
    if (googleSourceKey !== this.currentGoogleSourceKey) {
      this.googleFinalRetriedSourceKey = undefined;
    }
    this.currentGoogleSourceKey = googleSourceKey;
  }

  /**
   * Begin watching an external (iframe/pdf/url) load. Clears any prior timers,
   * arms the load-timeout and schedules office auto-retry. Returns the recovery
   * plan so the host can run the framework-specific google-probe if present.
   */
  beginExternalLoad(isActive: () => boolean): ViewerRecoveryPlan {
    this.clearTimers();
    const { viewer, googleCheckInterval, googleMaxChecks } = this.config;
    const timeoutMs =
      viewer === 'google'
        ? Math.max(googleCheckInterval * googleMaxChecks + 2000, 15000)
        : 15000;
    this.externalLoadTimeoutId = setTimeout(() => {
      if (!isActive()) {
        return;
      }
      if (this.scheduleGoogleFinalRetry(isActive)) {
        return;
      }
      this.handlers.reportTimeout();
    }, timeoutMs);

    const plan = this.recoveryPlan();
    if (plan.modes.includes('office-auto-retry')) {
      this.scheduleOfficeRetry(isActive);
    }
    return plan;
  }

  /** The external viewer finished loading; stop all pending recovery timers. */
  notifyLoaded(): void {
    this.clearTimers();
  }

  /** Clear every pending recovery timer without tearing down state. */
  clearTimers(): void {
    this.clearExternalLoadTimeout();
    this.clearGoogleFinalRetry();
    this.clearOfficeRetry();
  }

  /** Release all timers; call on destroy. */
  dispose(): void {
    this.clearTimers();
  }

  private recoveryPlan(): ViewerRecoveryPlan {
    return getViewerRecoveryPlan({
      viewer: this.config.viewer,
      googleCheckContentLoaded: this.config.googleCheckContentLoaded,
      googleFinalRetryDelay: this.config.googleFinalRetryDelay,
      officeAutoRetry: this.config.officeAutoRetry,
    });
  }

  private scheduleGoogleFinalRetry(isActive: () => boolean): boolean {
    if (
      !this.recoveryPlan().modes.includes('google-final-retry') ||
      !this.currentGoogleSourceKey ||
      this.googleFinalRetriedSourceKey === this.currentGoogleSourceKey
    ) {
      return false;
    }
    this.clearGoogleFinalRetry();
    this.googleFinalRetryTimeoutId = setTimeout(() => {
      if (
        !isActive() ||
        !this.currentGoogleSourceKey ||
        this.googleFinalRetriedSourceKey === this.currentGoogleSourceKey
      ) {
        return;
      }
      this.googleFinalRetriedSourceKey = this.currentGoogleSourceKey;
      this.handlers.triggerRetry();
    }, this.config.googleFinalRetryDelay);
    return true;
  }

  private scheduleOfficeRetry(isActive: () => boolean): void {
    if (
      this.config.viewer !== 'office' ||
      !this.config.officeAutoRetry ||
      !this.currentOfficeSourceKey ||
      this.officeAutoRetriedSourceKey === this.currentOfficeSourceKey
    ) {
      return;
    }
    this.clearOfficeRetry();
    this.officeRetryTimeoutId = setTimeout(() => {
      if (
        !isActive() ||
        !this.currentOfficeSourceKey ||
        this.officeAutoRetriedSourceKey === this.currentOfficeSourceKey
      ) {
        return;
      }
      this.officeAutoRetriedSourceKey = this.currentOfficeSourceKey;
      this.handlers.triggerRetry();
    }, this.config.officeRetryDelay);
  }

  private clearExternalLoadTimeout(): void {
    if (this.externalLoadTimeoutId) {
      clearTimeout(this.externalLoadTimeoutId);
      this.externalLoadTimeoutId = undefined;
    }
  }

  private clearGoogleFinalRetry(): void {
    if (this.googleFinalRetryTimeoutId) {
      clearTimeout(this.googleFinalRetryTimeoutId);
      this.googleFinalRetryTimeoutId = undefined;
    }
  }

  private clearOfficeRetry(): void {
    if (this.officeRetryTimeoutId) {
      clearTimeout(this.officeRetryTimeoutId);
      this.officeRetryTimeoutId = undefined;
    }
  }
}
