import {
  ViewerRecoveryConfig,
  ViewerRecoveryController,
} from './viewer-recovery-controller';

const baseConfig = (
  overrides: Partial<ViewerRecoveryConfig> = {},
): ViewerRecoveryConfig => ({
  viewer: 'google',
  googleCheckContentLoaded: true,
  googleCheckInterval: 3000,
  googleMaxChecks: 5,
  googleFinalRetryDelay: 0,
  officeAutoRetry: false,
  officeRetryDelay: 3000,
  ...overrides,
});

describe('ViewerRecoveryController', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const makeHandlers = () => ({
    triggerRetry: jest.fn(),
    reportTimeout: jest.fn(),
  });

  it('reports a timeout when a plain google viewer never loads', () => {
    const handlers = makeHandlers();
    const controller = new ViewerRecoveryController(baseConfig(), handlers);
    controller.trackSource('u1');

    const plan = controller.beginExternalLoad(() => true);
    expect(plan.modes).toEqual(['google-probe']);

    // google timeout = max(3000 * 5 + 2000, 15000) = 17000
    jest.advanceTimersByTime(17000);
    expect(handlers.reportTimeout).toHaveBeenCalledTimes(1);
    expect(handlers.triggerRetry).not.toHaveBeenCalled();
  });

  it('schedules a google final retry once per source, then reports a timeout', () => {
    const handlers = makeHandlers();
    const controller = new ViewerRecoveryController(
      baseConfig({ googleFinalRetryDelay: 4000 }),
      handlers,
    );
    controller.trackSource('u1');

    controller.beginExternalLoad(() => true);
    jest.advanceTimersByTime(17000); // load timeout arms the final retry
    expect(handlers.triggerRetry).not.toHaveBeenCalled();
    expect(handlers.reportTimeout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(4000); // final retry fires
    expect(handlers.triggerRetry).toHaveBeenCalledTimes(1);

    // The retry re-arms the load, but the source has spent its final-retry budget.
    controller.beginExternalLoad(() => true);
    jest.advanceTimersByTime(17000);
    expect(handlers.triggerRetry).toHaveBeenCalledTimes(1);
    expect(handlers.reportTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets the final-retry budget when the source changes', () => {
    const handlers = makeHandlers();
    const controller = new ViewerRecoveryController(
      baseConfig({ googleFinalRetryDelay: 4000 }),
      handlers,
    );

    controller.trackSource('u1');
    controller.beginExternalLoad(() => true);
    jest.advanceTimersByTime(17000 + 4000);
    expect(handlers.triggerRetry).toHaveBeenCalledTimes(1);

    controller.trackSource('u2');
    controller.beginExternalLoad(() => true);
    jest.advanceTimersByTime(17000 + 4000);
    expect(handlers.triggerRetry).toHaveBeenCalledTimes(2);
  });

  it('auto-retries an office viewer once per source', () => {
    const handlers = makeHandlers();
    const controller = new ViewerRecoveryController(
      baseConfig({ viewer: 'office', officeAutoRetry: true, officeRetryDelay: 3000 }),
      handlers,
    );
    controller.trackSource('o1');

    controller.beginExternalLoad(() => true);
    jest.advanceTimersByTime(3000);
    expect(handlers.triggerRetry).toHaveBeenCalledTimes(1);

    // Same source: budget spent, no further auto-retry.
    controller.beginExternalLoad(() => true);
    jest.advanceTimersByTime(3000);
    expect(handlers.triggerRetry).toHaveBeenCalledTimes(1);
  });

  it('notifyLoaded cancels all pending recovery timers', () => {
    const handlers = makeHandlers();
    const controller = new ViewerRecoveryController(
      baseConfig({ googleFinalRetryDelay: 4000 }),
      handlers,
    );
    controller.trackSource('u1');
    controller.beginExternalLoad(() => true);

    controller.notifyLoaded();
    jest.advanceTimersByTime(100000);
    expect(handlers.triggerRetry).not.toHaveBeenCalled();
    expect(handlers.reportTimeout).not.toHaveBeenCalled();
  });

  it('skips recovery callbacks once the load is no longer active', () => {
    const handlers = makeHandlers();
    const controller = new ViewerRecoveryController(
      baseConfig({ googleFinalRetryDelay: 4000 }),
      handlers,
    );
    controller.trackSource('u1');

    controller.beginExternalLoad(() => false);
    jest.advanceTimersByTime(100000);
    expect(handlers.triggerRetry).not.toHaveBeenCalled();
    expect(handlers.reportTimeout).not.toHaveBeenCalled();
  });
});
