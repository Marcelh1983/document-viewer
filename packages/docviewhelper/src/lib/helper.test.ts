import { getViewerDetails, getViewerRecoveryPlan } from './helper';

describe('helper', () => {
  it('builds a google viewer URL', () => {
    const result = getViewerDetails(
      'http://www.africau.edu/images/default/sample.pdf'
    );

    expect(result.externalViewer).toBe(true);
    expect(result.url).toContain('https://docs.google.com/gview');
  });

  it('returns a google recovery plan when probing is enabled', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'google',
        googleCheckContentLoaded: true,
      }).modes
    ).toEqual(['google-probe']);
  });

  it('returns a final google retry mode when a delay is configured', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'google',
        googleFinalRetryDelay: 4000,
      }).modes
    ).toEqual(['google-probe', 'google-final-retry']);
  });

  it('returns an office recovery plan when auto retry is enabled', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'office',
        officeAutoRetry: true,
      }).modes
    ).toEqual(['office-auto-retry']);
  });

  it('returns no recovery plan for viewers without recovery policies', () => {
    expect(
      getViewerRecoveryPlan({
        viewer: 'mammoth',
        googleCheckContentLoaded: true,
        officeAutoRetry: true,
      }).modes
    ).toEqual([]);
  });
});
