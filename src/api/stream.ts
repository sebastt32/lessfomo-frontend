import type { StreamEvent, TokenStreamEvent } from './types';

/** Connection state of the live SSE feed, as shown to the user. */
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const EVENT_TYPES = ['token', 'screening', 'momentum', 'status', 'smart-wallet', 'cycle'] as const satisfies readonly StreamEvent['type'][];
const TOKEN_EVENT_TYPES = ['trade', 'sol-price', 'cycle'] as const satisfies readonly TokenStreamEvent['type'][];

const CLOSED = 2;

/** The subset of the browser EventSource API this module relies on. */
export interface EventSourceLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

/** The EventSource options this module uses. */
export interface EventSourceInitLike {
  withCredentials?: boolean;
}

export type EventSourceConstructor = new (url: string, init?: EventSourceInitLike) => EventSourceLike;

// The session is a cookie: streams must send it on cross-origin connections too (local development).
const SOURCE_INIT: EventSourceInitLike = { withCredentials: true };

interface BaseStreamOptions<E> {
  url: string;
  onEvent: (event: E) => void;
  onConnectionChange: (state: ConnectionState) => void;
  /**
   * The connection was closed for good instead of retried by the browser. EventSource hides the HTTP
   * status, and this is what a rejected request (e.g. 401 without a session) looks like, so callers
   * use it to check whether the session is still valid.
   */
  onRejected?: () => void;
  /** Defaults to the global EventSource; `undefined` means SSE is unavailable. */
  EventSourceImpl?: EventSourceConstructor | undefined;
  /** Delays used when the browser gives up and the source must be recreated. */
  retryDelaysMs?: readonly number[];
}

export type StreamOptions = BaseStreamOptions<StreamEvent>;

/** Options for GET /api/tokens/:mint/stream (`trade`, `sol-price` and `cycle` events). */
export type TokenStreamOptions = BaseStreamOptions<TokenStreamEvent>;

export interface StreamHandle {
  close(): void;
}

const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000] as const;

function defaultEventSource(): EventSourceConstructor | undefined {
  return typeof EventSource === 'undefined' ? undefined : (EventSource as unknown as EventSourceConstructor);
}

/** Subscribes to GET /api/stream (token, screening, momentum, status, smart-wallet and cycle events). */
export function connectStream(options: StreamOptions): StreamHandle {
  return connectEventSource(options, EVENT_TYPES);
}

/** Subscribes to GET /api/tokens/:mint/stream (trade, sol-price and cycle events of one token). */
export function connectTokenStream(options: TokenStreamOptions): StreamHandle {
  return connectEventSource(options, TOKEN_EVENT_TYPES);
}

/**
 * Shared SSE connection. The browser retries dropped connections on its own;
 * when it gives up (readyState CLOSED) the source is recreated with backoff.
 */
function connectEventSource<E extends { type: string; data: unknown }>(
  options: BaseStreamOptions<E>,
  eventTypes: readonly E['type'][],
): StreamHandle {
  const { url, onEvent, onConnectionChange } = options;
  const Impl = 'EventSourceImpl' in options ? options.EventSourceImpl : defaultEventSource();
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  if (!Impl) {
    onConnectionChange('offline');
    return { close: () => {} };
  }
  const EventSourceCtor: EventSourceConstructor = Impl;

  let disposed = false;
  let everConnected = false;
  let attempt = 0;
  let source: EventSourceLike | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let current: ConnectionState | null = null;

  function setState(next: ConnectionState): void {
    if (disposed || next === current) return;
    current = next;
    onConnectionChange(next);
  }

  function open(): void {
    const es = new EventSourceCtor(url, SOURCE_INIT);
    source = es;

    es.onopen = () => {
      if (disposed || source !== es) return;
      everConnected = true;
      attempt = 0;
      setState('connected');
    };

    es.onerror = () => {
      if (disposed || source !== es) return;
      setState(everConnected ? 'reconnecting' : 'offline');
      if (es.readyState === CLOSED) {
        es.close();
        options.onRejected?.();
        const delay = delays[Math.min(attempt, delays.length - 1)] ?? 5_000;
        attempt += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!disposed) open();
        }, delay);
      }
    };

    for (const type of eventTypes) {
      es.addEventListener(type, (message) => {
        if (disposed || source !== es) return;
        let data: unknown;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        onEvent({ type, data } as E);
      });
    }
  }

  setState('connecting');
  open();

  return {
    close() {
      disposed = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      source?.close();
      source = null;
    },
  };
}
