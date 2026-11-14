import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectStream, connectTokenStream, type ConnectionState, type EventSourceLike } from './stream';
import type { StreamEvent, TokenStreamEvent } from './types';

type Listener = (event: MessageEvent<string>) => void;

class FakeEventSource implements EventSourceLike {
  static instances: FakeEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState = FakeEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<string, Listener[]>();

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }

  // Test helpers
  open(): void {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  fail(readyState: number): void {
    this.readyState = readyState;
    this.onerror?.(new Event('error'));
  }

  emit(type: string, data: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data }));
    }
  }

  listenerTypes(): string[] {
    return [...this.listeners.keys()].sort();
  }
}

const URL = 'http://api.test/api/stream';

function setup() {
  const events: StreamEvent[] = [];
  const states: ConnectionState[] = [];
  const handle = connectStream({
    url: URL,
    EventSourceImpl: FakeEventSource,
    onEvent: (event) => events.push(event),
    onConnectionChange: (state) => states.push(state),
    retryDelaysMs: [1000, 5000],
  });
  return { events, states, handle, source: () => FakeEventSource.instances.at(-1)! };
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('connectStream', () => {
  it('opens an EventSource on the stream URL and subscribes to the four contract events', () => {
    const { states, source } = setup();
    expect(source().url).toBe(URL);
    expect(source().listenerTypes()).toEqual(['momentum', 'screening', 'status', 'token']);
    expect(states).toEqual(['connecting']);
  });

  it('reports connected when the stream opens', () => {
    const { states, source } = setup();
    source().open();
    expect(states).toEqual(['connecting', 'connected']);
  });

  it('parses JSON data and forwards typed events', () => {
    const { events, source } = setup();
    source().open();
    source().emit('status', JSON.stringify({ sources: { pumpportal: 'connected', solanaLogs: 'disconnected' } }));
    source().emit('momentum', JSON.stringify({ at: '2026-11-13T20:05:00.000Z', movers: [] }));
    expect(events).toEqual([
      { type: 'status', data: { sources: { pumpportal: 'connected', solanaLogs: 'disconnected' } } },
      { type: 'momentum', data: { at: '2026-11-13T20:05:00.000Z', movers: [] } },
    ]);
  });

  it('ignores events whose data is not valid JSON', () => {
    const { events, source } = setup();
    source().emit('screening', 'not json');
    expect(events).toEqual([]);
  });

  it('reports offline when the first connection attempt fails', () => {
    const { states, source } = setup();
    source().fail(FakeEventSource.CONNECTING);
    expect(states).toEqual(['connecting', 'offline']);
  });

  it('reports reconnecting when an established connection drops and the browser retries', () => {
    const { states, source } = setup();
    source().open();
    source().fail(FakeEventSource.CONNECTING);
    expect(states).toEqual(['connecting', 'connected', 'reconnecting']);
    expect(FakeEventSource.instances).toHaveLength(1);
    source().open();
    expect(states.at(-1)).toBe('connected');
  });

  it('recreates the EventSource with backoff when the browser gives up (CLOSED)', () => {
    const { states, source } = setup();
    source().open();
    source().fail(FakeEventSource.CLOSED);
    expect(states.at(-1)).toBe('reconnecting');
    expect(FakeEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(999);
    expect(FakeEventSource.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[0]?.closed).toBe(true);

    // Second failure uses the next delay; delays then stay at the last value.
    source().fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(4999);
    expect(FakeEventSource.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(3);
    source().fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(5000);
    expect(FakeEventSource.instances).toHaveLength(4);
  });

  it('resets the backoff after a successful reconnect', () => {
    const { source } = setup();
    source().fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(1000);
    source().open();
    source().fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(1000);
    expect(FakeEventSource.instances).toHaveLength(3);
  });

  it('close() closes the source, cancels pending retries and stops notifications', () => {
    const { states, handle, events, source } = setup();
    const first = source();
    first.fail(FakeEventSource.CLOSED);
    handle.close();
    expect(first.closed).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    const before = states.length;
    first.emit('token', JSON.stringify({ mint: 'x' }));
    first.open();
    expect(events).toEqual([]);
    expect(states).toHaveLength(before);
  });

  it('reports offline when EventSource is not available', () => {
    const states: ConnectionState[] = [];
    connectStream({
      url: URL,
      EventSourceImpl: undefined,
      onEvent: () => {},
      onConnectionChange: (state) => states.push(state),
    });
    expect(states).toEqual(['offline']);
  });
});

describe('connectTokenStream', () => {
  const TOKEN_URL = 'http://api.test/api/tokens/MINT/stream';

  function setupToken() {
    const events: TokenStreamEvent[] = [];
    const states: ConnectionState[] = [];
    const handle = connectTokenStream({
      url: TOKEN_URL,
      EventSourceImpl: FakeEventSource,
      onEvent: (event) => events.push(event),
      onConnectionChange: (state) => states.push(state),
      retryDelaysMs: [1000],
    });
    return { events, states, handle, source: () => FakeEventSource.instances.at(-1)! };
  }

  it('subscribes to the trade and sol-price events of the token stream URL', () => {
    const { source, states } = setupToken();
    expect(source().url).toBe(TOKEN_URL);
    expect(source().listenerTypes()).toEqual(['sol-price', 'trade']);
    expect(states).toEqual(['connecting']);
  });

  it('forwards parsed trade and sol-price events and ignores invalid JSON', () => {
    const { source, events } = setupToken();
    const trade = {
      signature: 'sig',
      trader: 'wallet',
      side: 'buy',
      solAmount: 0.5,
      tokenAmount: 1000,
      priceSol: 0.0000005,
      isDev: false,
      time: 1_763_064_000,
    };
    source().emit('trade', JSON.stringify(trade));
    source().emit('sol-price', JSON.stringify({ solUsd: 150 }));
    source().emit('trade', '{oops');
    expect(events).toEqual([
      { type: 'trade', data: trade },
      { type: 'sol-price', data: { solUsd: 150 } },
    ]);
  });

  it('reuses the reconnect backoff and stops on close()', () => {
    const { source, states, handle } = setupToken();
    source().open();
    source().fail(FakeEventSource.CLOSED);
    expect(states).toEqual(['connecting', 'connected', 'reconnecting']);
    vi.advanceTimersByTime(1000);
    expect(FakeEventSource.instances).toHaveLength(2);
    handle.close();
    expect(FakeEventSource.instances[1]?.closed).toBe(true);
  });
});
