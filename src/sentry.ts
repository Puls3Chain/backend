import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';

type SentryEvent = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>
>[0];
type SentryHint = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>
>[1];

const WALLET_ADDRESS_PATTERN = /\bG[A-Z2-7]{55}\b/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_PATTERN =
  /\b(?:Bearer\s+)?(?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|[A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{40,})\b/g;
const SENSITIVE_KEY_PATTERN =
  /(token|authorization|password|secret|api[_-]?key|jwt|cookie)/i;

export function parseTracesSampleRate(value?: string): number {
  if (!value) {
    return 0.1;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0.1;
  }

  return Math.min(Math.max(parsed, 0), 1);
}

export function redactPii(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(EMAIL_PATTERN, '[redacted-email]')
      .replace(WALLET_ADDRESS_PATTERN, '[redacted-wallet]')
      .replace(TOKEN_PATTERN, (match) =>
        match.startsWith('Bearer ')
          ? 'Bearer [redacted-token]'
          : '[redacted-token]',
      );
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactPii(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redactPii(entry),
      ]),
    );
  }

  return value;
}

export function beforeSend(
  event: SentryEvent,
  _hint?: SentryHint,
): SentryEvent {
  return redactPii(event) as SentryEvent;
}

export function getSentryRelease(): string | undefined {
  return process.env.GIT_SHA || process.env.npm_package_version;
}

export function initSentry(): boolean {
  if (process.env.NODE_ENV === 'test' || !process.env.SENTRY_DSN) {
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: getSentryRelease(),
    tracesSampleRate: parseTracesSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
    ),
    integrations: [new RewriteFrames({ root: process.cwd() })],
    beforeSend,
  });

  process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
  });

  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
  });

  return true;
}

export function registerSentryHandlers(app: {
  use: (...handlers: unknown[]) => void;
}): void {
  if (process.env.NODE_ENV === 'test' || !process.env.SENTRY_DSN) {
    return;
  }

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

export function registerSentryErrorHandler(app: {
  use: (...handlers: unknown[]) => void;
}): void {
  if (process.env.NODE_ENV === 'test' || !process.env.SENTRY_DSN) {
    return;
  }

  app.use(Sentry.Handlers.errorHandler());
}
