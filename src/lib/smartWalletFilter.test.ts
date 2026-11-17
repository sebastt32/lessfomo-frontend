import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MIN_SMART_WALLETS,
  describeSmartWalletFilter,
  parseMinSmartWallets,
  withMinSmartWallets,
} from './smartWalletFilter';
import { parseAppLocation } from './historyQuery';

describe('parseMinSmartWallets', () => {
  it('defaults to 1 good-history wallet', () => {
    expect(DEFAULT_MIN_SMART_WALLETS).toBe(1);
    expect(parseMinSmartWallets('')).toBe(1);
    expect(parseMinSmartWallets('?view=history')).toBe(1);
  });

  it('reads 1 to 5 and falls back to the default for anything else', () => {
    expect(parseMinSmartWallets('?minSmartWallets=3')).toBe(3);
    expect(parseMinSmartWallets('?view=history&minSmartWallets=5')).toBe(5);
    for (const bad of ['0', '6', '-1', '2.5', 'abc', '']) {
      expect(parseMinSmartWallets(`?minSmartWallets=${bad}`)).toBe(1);
    }
  });
});

describe('withMinSmartWallets', () => {
  it('omits the default and keeps every other parameter readable', () => {
    expect(withMinSmartWallets('', 1)).toBe('');
    expect(withMinSmartWallets('', 2)).toBe('?minSmartWallets=2');
    expect(withMinSmartWallets('?view=history&status=passed,failed&sort=maxScore:asc', 4)).toBe(
      '?view=history&status=passed,failed&sort=maxScore:asc&minSmartWallets=4',
    );
    expect(withMinSmartWallets('?view=history&minSmartWallets=4', 1)).toBe('?view=history');
    expect(withMinSmartWallets('?minSmartWallets=4', 1)).toBe('');
  });

  it('round-trips with parseMinSmartWallets without disturbing the history filters', () => {
    const search = withMinSmartWallets('?view=history&minScore=50', 3);
    expect(parseMinSmartWallets(search)).toBe(3);
    expect(parseAppLocation(search).history.minScore).toBe(50);
  });
});

describe('describeSmartWalletFilter', () => {
  it('says which tokens are shown', () => {
    expect(describeSmartWalletFilter(1)).toBe('Showing tokens bought by ≥1 good-history wallet');
    expect(describeSmartWalletFilter(3)).toBe('Showing tokens bought by ≥3 good-history wallets');
  });
});
