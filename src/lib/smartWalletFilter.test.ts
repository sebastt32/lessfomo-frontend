import { describe, expect, it } from 'vitest';
import {
  CONVICTION_WALLET_OPTIONS,
  DEFAULT_MIN_CONVICTION_WALLETS,
  convictionOptionLabel,
  describeConvictionFilter,
  parseMinConvictionWallets,
  withMinConvictionWallets,
} from './smartWalletFilter';

describe('parseMinConvictionWallets', () => {
  it('defaults to 3 conviction wallets, the public minimum', () => {
    expect(DEFAULT_MIN_CONVICTION_WALLETS).toBe(3);
    expect(parseMinConvictionWallets('')).toBe(3);
    expect(parseMinConvictionWallets('?view=history')).toBe(3);
  });

  it('reads the offered thresholds and falls back to the default for anything else', () => {
    expect(CONVICTION_WALLET_OPTIONS).toEqual([3, 5, 10]);
    expect(parseMinConvictionWallets('?minConvictionWallets=5')).toBe(5);
    expect(parseMinConvictionWallets('?view=history&minConvictionWallets=10')).toBe(10);
    for (const bad of ['0', '1', '2', '4', '7', '11', '-1', '2.5', 'abc', '']) {
      expect(parseMinConvictionWallets(`?minConvictionWallets=${bad}`)).toBe(3);
    }
  });

  it('ignores the old good-wallet threshold', () => {
    expect(parseMinConvictionWallets('?minSmartWallets=10')).toBe(3);
  });
});

describe('withMinConvictionWallets', () => {
  it('omits the default and keeps every other parameter readable', () => {
    expect(withMinConvictionWallets('', 3)).toBe('');
    expect(withMinConvictionWallets('', 5)).toBe('?minConvictionWallets=5');
    expect(withMinConvictionWallets('?view=history&status=passed,failed&sort=maxScore:asc', 10)).toBe(
      '?view=history&status=passed,failed&sort=maxScore:asc&minConvictionWallets=10',
    );
    expect(withMinConvictionWallets('?view=history&minConvictionWallets=10', 3)).toBe('?view=history');
    expect(withMinConvictionWallets('?minConvictionWallets=10', 3)).toBe('');
  });

  it('drops a stale minSmartWallets parameter so the URL carries only the conviction filter', () => {
    expect(withMinConvictionWallets('?view=history&minSmartWallets=20', 5)).toBe('?view=history&minConvictionWallets=5');
  });

  it('round-trips with parseMinConvictionWallets without disturbing the day', () => {
    const search = withMinConvictionWallets('?view=record&day=2026-11-16', 10);
    expect(parseMinConvictionWallets(search)).toBe(10);
    expect(new URLSearchParams(search).get('day')).toBe('2026-11-16');
  });
});

describe('convictionOptionLabel', () => {
  it('labels the top threshold as "or more"', () => {
    expect(CONVICTION_WALLET_OPTIONS.map(convictionOptionLabel)).toEqual(['3', '5', '10+']);
  });
});

describe('describeConvictionFilter', () => {
  it('says which tokens are shown', () => {
    expect(describeConvictionFilter(3)).toBe('Mostrando tokens comprados por al menos 3 wallets que mantienen');
    expect(describeConvictionFilter(10)).toBe('Mostrando tokens comprados por al menos 10 wallets que mantienen');
  });
});
