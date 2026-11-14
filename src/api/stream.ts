import type { StreamEvent } from './types';

/** Connection state of the live SSE feed, as shown to the user. */
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const EVENT_TYPES = ['token', 'screening', 'momentum', 'status'] as const satisfies readonly StreamEvent['type'][];

const CLOSED = 2;

/** The subset of the browser EventSource API this module relies on. */
export interface EventSourceLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export type EventSourceConstructor = new (url: string) => EventSourceLike;

export interface StreamOptions {
  url: string;
  onEvent: (event: StreamEvent) => void;
  onConnectionChange: (state: ConnectionState) => void;
  /** Defaults to the global EventSource; `undefined` means SSE is unavailable. */
  EventSourceImpl?: EventSourceConstructor | undefined;
  /** Delays used when the browser gives up and the source must be recreated. */
  retryDelaysMs?: readonly number[];
}

export interface StreamHandle {
  close(): void;
}

const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000] as const;

function defaultEventSource(): EventSourceConstructor | undefined {
  return typeof EventSource === 'undefined' ? undefined : (EventSource as unknown as EventSourceConstructor);
}

/**
 * Subscribes to GET /api/stream. The browser retries dropped connections on its own;
 * when it gives up (readyState CLOSED) the source is recreated with backoff.
 */
export function connectStream(options: StreamOptions): StreamHandle {
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
    const es = new EventSourceCtor(url);
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
        const delay = delays[Math.min(attempt, delays.length - 1)] ?? 5_000;
        attempt += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!disposed) open();
        }, delay);
      }
    };

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (message) => {
        if (disposed || source !== es) return;
        let data: unknown;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        onEvent({ type, data } as StreamEvent);
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
