import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MIN_SMART_WALLETS,
  SMART_WALLET_OPTIONS,
  describeSmartWalletFilter,
  parseMinSmartWallets,
  smartWalletOptionLabel,
  withMinSmartWallets,
} from './smartWalletFilter';
import { parseAppLocation } from './historyQuery';

describe('parseMinSmartWallets', () => {
  it('defaults to 5 good-history wallets, the public minimum', () => {
    expect(DEFAULT_MIN_SMART_WALLETS).toBe(5);
    expect(parseMinSmartWallets('')).toBe(5);
    expect(parseMinSmartWallets('?view=history')).toBe(5);
  });

  it('reads the offered thresholds and falls back to the default for anything else', () => {
    expect(SMART_WALLET_OPTIONS).toEqual([5, 10, 20, 30]);
    expect(parseMinSmartWallets('?minSmartWallets=10')).toBe(10);
    expect(parseMinSmartWallets('?view=history&minSmartWallets=30')).toBe(30);
    for (const bad of ['0', '1', '4', '7', '31', '-1', '2.5', 'abc', '']) {
      expect(parseMinSmartWallets(`?minSmartWallets=${bad}`)).toBe(5);
    }
  });
});

describe('withMinSmartWallets', () => {
  it('omits the default and keeps every other parameter readable', () => {
    expect(withMinSmartWallets('', 5)).toBe('');
    expect(withMinSmartWallets('', 10)).toBe('?minSmartWallets=10');
    expect(withMinSmartWallets('?view=history&status=passed,failed&sort=maxScore:asc', 20)).toBe(
      '?view=history&status=passed,failed&sort=maxScore:asc&minSmartWallets=20',
    );
    expect(withMinSmartWallets('?view=history&minSmartWallets=20', 5)).toBe('?view=history');
    expect(withMinSmartWallets('?minSmartWallets=20', 5)).toBe('');
  });

  it('round-trips with parseMinSmartWallets without disturbing the history filters', () => {
    const search = withMinSmartWallets('?view=history&minScore=50', 20);
    expect(parseMinSmartWallets(search)).toBe(20);
    expect(parseAppLocation(search).history.minScore).toBe(50);
  });
});

describe('smartWalletOptionLabel', () => {
  it('labels the top threshold as "or more"', () => {
    expect(SMART_WALLET_OPTIONS.map(smartWalletOptionLabel)).toEqual(['5', '10', '20', '30+']);
  });
});

describe('describeSmartWalletFilter', () => {
  it('says which tokens are shown', () => {
    expect(describeSmartWalletFilter(5)).toBe('Showing tokens bought by ≥5 good-history wallets');
    expect(describeSmartWalletFilter(30)).toBe('Showing tokens bought by ≥30 good-history wallets');
  });
});
