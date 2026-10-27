export type ViewerType = 'google' | 'office' | 'mammoth' | 'pdf' | 'url';
export type ViewerRenderPhase = 'idle' | 'loading' | 'ready' | 'error';
export type DisableContent = 'none' | 'all' | 'popout' | 'popout-hide';
export type DisableContentOverlay = 'full' | 'popout-google' | 'popout-office';
export type ViewerRecoveryMode =
  | 'google-probe'
  | 'google-final-retry'
  | 'office-auto-retry';

export interface ViewerRecoveryPlan {
  modes: ViewerRecoveryMode[];
}

export interface IFrameReloader {
  subscribe: (
    iframe: HTMLIFrameElement,
    interval?: number,
    maxChecks?: number
  ) => ReturnType<typeof setInterval> | undefined;
  unsubscribe: () => void;
}
