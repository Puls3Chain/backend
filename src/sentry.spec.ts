import * as Sentry from '@sentry/node';
import {
  beforeSend,
  initSentry,
  parseTracesSampleRate,
  registerSentryErrorHandler,
  registerSentryHandlers,
} from './sentry';

jest.mock(
  '@sentry/node',
  () => ({
    init: jest.fn(),
    captureException: jest.fn(),
    Handlers: {
      requestHandler: jest.fn(() => 'request-handler'),
      tracingHandler: jest.fn(() => 'tracing-handler'),
      errorHandler: jest.fn(() => 'error-handler'),
    },
  }),
  { virtual: true },
);

jest.mock(
  '@sentry/integrations',
  () => ({
    RewriteFrames: jest
      .fn()
      .mockImplementation((options: Record<string, unknown>) => ({ options })),
  }),
  { virtual: true },
);

describe('Sentry integration', () => {
  const originalEnv = process.env;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
  });

  afterEach(() => {
    process.env = originalEnv;
    processOnSpy.mockRestore();
  });

  it('parses traces sample rates with a default of 0.1', () => {
    expect(parseTracesSampleRate()).toBe(0.1);
    expect(parseTracesSampleRate('0.25')).toBe(0.25);
    expect(parseTracesSampleRate('bad')).toBe(0.1);
    expect(parseTracesSampleRate('2')).toBe(1);
  });

  it('redacts wallet addresses, emails, and tokens before sending events', () => {
    const redacted = beforeSend({
      message:
        'user alice@example.com wallet GDQP2M6LH7QK4CF5AEUNMZ2AZDWAZEIVQPD3MYDPTZZ7GQGYHFOQCP4V token Bearer eyJabc.def.ghi',
      request: {
        headers: {
          authorization:
            'Bearer secret-token-value-with-more-than-40-characters',
        },
      },
    });

    expect(JSON.stringify(redacted)).not.toContain('alice@example.com');
    expect(JSON.stringify(redacted)).not.toContain(
      'GDQP2M6LH7QK4CF5AEUNMZ2AZDWAZEIVQPD3MYDPTZZ7GQGYHFOQCP4V',
    );
    expect(JSON.stringify(redacted)).not.toContain('eyJabc.def.ghi');
    expect(JSON.stringify(redacted)).toContain('[redacted-email]');
    expect(JSON.stringify(redacted)).toContain('[redacted-wallet]');
    expect(JSON.stringify(redacted)).toContain('[redacted]');
  });

  it('initializes Sentry outside test with release, environment, tracing, and exception hooks', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.4';
    process.env.GIT_SHA = 'abc123';

    expect(initSentry()).toBe(true);

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.invalid/1',
        environment: 'production',
        release: 'abc123',
        tracesSampleRate: 0.4,
        beforeSend,
      }),
    );
    expect(processOnSpy).toHaveBeenCalledWith(
      'uncaughtException',
      expect.any(Function),
    );
    expect(processOnSpy).toHaveBeenCalledWith(
      'unhandledRejection',
      expect.any(Function),
    );
  });

  it('does not initialize Sentry in tests', () => {
    process.env.NODE_ENV = 'test';
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';

    expect(initSentry()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('registers request, tracing, and error handlers when enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    const app = { use: jest.fn() };

    registerSentryHandlers(app);
    registerSentryErrorHandler(app);

    expect(app.use).toHaveBeenNthCalledWith(1, 'request-handler');
    expect(app.use).toHaveBeenNthCalledWith(2, 'tracing-handler');
    expect(app.use).toHaveBeenNthCalledWith(3, 'error-handler');
  });
});
