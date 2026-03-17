export type ViewerType = 'google' | 'office' | 'mammoth' | 'pdf' | 'url';
export type ViewerRenderPhase = 'idle' | 'loading' | 'ready' | 'error';
export type ViewerRecoveryMode = 'google-probe' | 'office-auto-retry';

export interface ViewerRecoveryPlan {
  modes: ViewerRecoveryMode[];
}

interface Props {
  loaded?: () => void;
  url: string;
  queryParams?: string;
  viewerUrl?: string;
  googleCheckInterval?: number;
  disableContent?: 'none' | 'all' | 'poput' | 'popout-hide';
  googleCheckContentLoaded?: boolean;
  viewer?: ViewerType;
}

export interface IFrameReloader {
  subscribe: (
    iframe: HTMLIFrameElement,
    interval?: number,
    maxChecks?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any;
  unsubscribe: () => void;
}

export const defaultProps: Props = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  loaded: () => {},
  disableContent: 'none',
  googleCheckContentLoaded: true,
  googleCheckInterval: 3000,
  queryParams: '',
  url: '',
  viewer: 'google',
  viewerUrl: '',
};
