declare module '@sentry/node' {
  export interface Event {
    [key: string]: unknown;
  }

  export interface EventHint {
    [key: string]: unknown;
  }

  export function init(options: {
    dsn?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    integrations?: unknown[];
    beforeSend?: (event: Event, hint?: EventHint) => Event | null;
  }): void;

  export function captureException(exception: unknown): string;

  export const Handlers: {
    requestHandler: () => unknown;
    tracingHandler: () => unknown;
    errorHandler: () => unknown;
  };
}

declare module '@sentry/integrations' {
  export class RewriteFrames {
    constructor(options?: { root?: string });
  }
}
