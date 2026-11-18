import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient, CyclesAnalysisOptions, TokenListQuery } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { dayBounds, dayKey, monthBounds, shiftDay } from '../lib/dailyRecord';
import { fakeClient } from '../test/fakeClient';
import { makeCycle, makeCyclesAnalysis, makeListItem, makeToken, MINT_B } from '../test/fixtures';
import { AppShell } from './AppShell';

function renderApp(client: ApiClient, url: string) {
  window.history.replaceState(null, '', url);
  const connect = vi.fn((_options: StreamOptions) => ({ close: vi.fn() }));
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <AppShell />
    </LiveFeedProvider>,
  );
}

afterEach(() => window.history.replaceState(null, '', '/'));

const today = dayKey(new Date());
const yesterday = shiftDay(today, -1);

/** 250 tokens on the day: the list needs two pages of 200. */
function recordClient() {
  const items = Array.from({ length: 250 }, (_, index) =>
    makeListItem({ token: makeToken({ mint: `${MINT_B.slice(0, 40)}${String(index).padStart(4, '0')}` }), cycle: makeCycle() }),
  );
  return fakeClient({
    listTokens: vi.fn(async (query: TokenListQuery) => {
      const start = ((query.page ?? 1) - 1) * (query.pageSize ?? 50);
      return { tokens: items.slice(start, start + (query.pageSize ?? 50)), page: query.page ?? 1, pageSize: query.pageSize ?? 50, total: 250 };
    }),
    getCyclesAnalysis: vi.fn(async (options?: CyclesAnalysisOptions) =>
      makeCyclesAnalysis(
        options?.from === monthBounds(yesterday).from && options.to === monthBounds(yesterday).to
          ? { tokens: 1000, explodedPct: 21.3 }
          : { tokens: 250, explodedPct: 40 },
      ),
    ),
  });
}

describe('daily record', () => {
  it('lists every token that appeared on the day in the URL, with the day and month success', async () => {
    const client = recordClient();
    renderApp(client, `/?view=record&day=${yesterday}`);

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(251);
    const queries = (client.listTokens as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as TokenListQuery);
    expect(queries.map((query) => query.page)).toEqual([1, 2]);
    expect(queries[0]).toMatchObject({ ...dayBounds(yesterday), dateField: 'appearedAt', pageSize: 200 });
    expect(screen.getByText('100 de 250 tokens llegaron a 2× después de aparecer')).toBeInTheDocument();
    expect(screen.getByText('213 de 1000 tokens llegaron a 2× después de aparecer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registro diario' })).toHaveAttribute('aria-current', 'page');
  });

  it('moves between days through the URL, never past today', async () => {
    const user = userEvent.setup();
    renderApp(recordClient(), `/?view=record&day=${yesterday}`);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Día anterior' }));
    expect(window.location.search).toBe(`?view=record&day=${shiftDay(yesterday, -1)}`);
    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(window.location.search).toBe('?view=record');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeDisabled());
  });
});
