import { describe, expect, it } from 'vitest';
import { makeCycle, MINT_A } from '../test/fixtures';
import { connectStream, connectTokenStream, type EventSourceInitLike, type EventSourceLike } from './stream';
import type { StreamEvent, TokenStreamEvent } from './types';

type Listener = (event: MessageEvent<string>) => void;

class FakeEventSource implements EventSourceLike {
  static last: FakeEventSource | null = null;
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private listeners = new Map<string, Listener[]>();

  constructor(
    readonly url: string,
    readonly init?: EventSourceInitLike,
  ) {
    FakeEventSource.last = this;
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {}

  emit(type: string, data: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data: JSON.stringify(data) }));
    }
  }
}

describe('cycle events', () => {
  const payload = { mint: MINT_A, cycle: makeCycle() };

  it('are delivered by the live stream, with credentials', () => {
    const events: StreamEvent[] = [];
    connectStream({
      url: '/api/stream',
      EventSourceImpl: FakeEventSource,
      onEvent: (event) => events.push(event),
      onConnectionChange: () => {},
    });
    FakeEventSource.last!.emit('cycle', payload);
    expect(events).toEqual([{ type: 'cycle', data: payload }]);
    expect(FakeEventSource.last!.init).toEqual({ withCredentials: true });
  });

  it('are delivered by the per-token stream, with credentials', () => {
    const events: TokenStreamEvent[] = [];
    connectTokenStream({
      url: `/api/tokens/${MINT_A}/stream`,
      EventSourceImpl: FakeEventSource,
      onEvent: (event) => events.push(event),
      onConnectionChange: () => {},
    });
    FakeEventSource.last!.emit('cycle', payload);
    expect(events).toEqual([{ type: 'cycle', data: payload }]);
    expect(FakeEventSource.last!.init).toEqual({ withCredentials: true });
  });
});
