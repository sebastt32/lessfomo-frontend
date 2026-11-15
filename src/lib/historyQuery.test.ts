import { describe, expect, it } from 'vitest';
import { DEFAULT_HISTORY, parseAppLocation, serializeAppLocation, toTokenListQuery } from './historyQuery';

const local = (year: number, month: number, day: number) => new Date(year, month - 1, day).toISOString();
const NOW = new Date(2026, 10, 14, 15, 30);

describe('parseAppLocation', () => {
  it('defaults to the live view with default history filters', () => {
    expect(parseAppLocation('')).toEqual({ view: 'live', history: DEFAULT_HISTORY });
    expect(parseAppLocation('?view=nope')).toEqual({ view: 'live', history: DEFAULT_HISTORY });
  });

  it('reads the history view, filters, sort and page', () => {
    expect(
      parseAppLocation(
        '?view=history&range=2026-11&status=failed,passed&lifecycle=dead&minScore=50&q=%20frog%20&sort=maxScore:asc&page=3',
      ),
    ).toEqual({
      view: 'history',
      history: {
        date: { kind: 'period', year: 2026, month: 11, day: null },
        status: ['passed', 'failed'],
        lifecycle: 'dead',
        minScore: 50,
        q: 'frog',
        sort: { field: 'maxScore', direction: 'asc' },
        page: 3,
      },
    });
  });

  it('drops invalid values instead of failing', () => {
    const { history } = parseAppLocation(
      '?view=history&status=passed,bogus,passed&lifecycle=zombie&minScore=101&sort=symbol:up&page=0',
    );
    expect(history).toEqual({ ...DEFAULT_HISTORY, status: ['passed'] });
    expect(parseAppLocation('?view=history&minScore=abc&page=2.5').history).toEqual(DEFAULT_HISTORY);
  });
});

describe('serializeAppLocation', () => {
  it('omits defaults', () => {
    expect(serializeAppLocation({ view: 'live', history: DEFAULT_HISTORY })).toBe('');
    expect(serializeAppLocation({ view: 'history', history: DEFAULT_HISTORY })).toBe('?view=history');
  });

  it('writes readable, round-trippable params', () => {
    const location = {
      view: 'history' as const,
      history: {
        date: { kind: 'range' as const, from: '2026-11-01', to: '2026-11-10' },
        status: ['passed' as const, 'unverified' as const],
        lifecycle: 'active' as const,
        minScore: 25,
        q: 'frog coin',
        sort: { field: 'liquidity' as const, direction: 'desc' as const },
        page: 2,
      },
    };
    const search = serializeAppLocation(location);
    expect(search).toBe(
      '?view=history&range=2026-11-01..2026-11-10&status=passed,unverified&lifecycle=active&minScore=25&q=frog+coin&sort=liquidity:desc&page=2',
    );
    expect(parseAppLocation(search)).toEqual(location);
  });
});

describe('toTokenListQuery', () => {
  it('maps the default filters to the first page, newest first', () => {
    expect(toTokenListQuery(DEFAULT_HISTORY, NOW)).toEqual({
      sort: { field: 'detectedAt', direction: 'desc' },
      page: 1,
      pageSize: 50,
    });
  });

  it('turns the date filter into ISO bounds and keeps every other filter', () => {
    expect(
      toTokenListQuery(
        {
          date: { kind: 'preset', preset: 'today' },
          status: ['failed'],
          lifecycle: 'active',
          minScore: 50,
          q: 'frog',
          sort: { field: 'peakMarketCapSol', direction: 'desc' },
          page: 4,
        },
        NOW,
      ),
    ).toEqual({
      from: local(2026, 11, 14),
      to: local(2026, 11, 15),
      status: ['failed'],
      lifecycle: 'active',
      minScore: 50,
      q: 'frog',
      sort: { field: 'peakMarketCapSol', direction: 'desc' },
      page: 4,
      pageSize: 50,
    });
  });
});
