import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectStream, connectTokenStream, type EventSourceInitLike, type EventSourceLike } from './stream';

class RecordingEventSource implements EventSourceLike {
  static instances: RecordingEventSource[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(
    public readonly url: string,
    public readonly init?: EventSourceInitLike,
  ) {
    RecordingEventSource.instances.push(this);
  }

  addEventListener(): void {}

  close(): void {
    this.readyState = 2;
  }

  fail(readyState: number): void {
    this.readyState = readyState;
    this.onerror?.(new Event('error'));
  }
}

const base = { EventSourceImpl: RecordingEventSource, onEvent: () => {}, onConnectionChange: () => {} };
const last = () => RecordingEventSource.instances.at(-1)!;

beforeEach(() => {
  RecordingEventSource.instances = [];
});

describe('stream credentials', () => {
  it('opens the main stream with withCredentials so the session cookie is sent cross-origin', () => {
    connectStream({ ...base, url: 'http://api.test/api/stream' });
    expect(last().init).toEqual({ withCredentials: true });
  });

  it('opens a per-token stream with withCredentials', () => {
    connectTokenStream({ ...base, url: 'http://api.test/api/tokens/abc/stream' });
    expect(last().init).toEqual({ withCredentials: true });
  });

  it('keeps withCredentials when the source is recreated after the browser gives up', () => {
    vi.useFakeTimers();
    try {
      connectStream({ ...base, url: 'http://api.test/api/stream', retryDelaysMs: [1000] });
      last().fail(2);
      vi.advanceTimersByTime(1000);
      expect(RecordingEventSource.instances).toHaveLength(2);
      expect(last().init).toEqual({ withCredentials: true });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('stream rejected by the server', () => {
  it('calls onRejected when the connection is closed for good (how a 401 looks to EventSource)', () => {
    const onRejected = vi.fn();
    connectStream({ ...base, url: 'http://api.test/api/stream', onRejected });
    last().fail(2);
    expect(onRejected).toHaveBeenCalledTimes(1);
  });

  it('does not call onRejected while the browser is still retrying on its own', () => {
    const onRejected = vi.fn();
    connectTokenStream({ ...base, url: 'http://api.test/api/tokens/abc/stream', onRejected });
    last().fail(0);
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('does not call onRejected after close()', () => {
    const onRejected = vi.fn();
    const handle = connectStream({ ...base, url: 'http://api.test/api/stream', onRejected });
    const source = last();
    handle.close();
    source.fail(2);
    expect(onRejected).not.toHaveBeenCalled();
  });
});
