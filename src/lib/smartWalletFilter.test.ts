import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_BY_PARAM,
  CONVICTION_WALLET_OPTIONS,
  DEFAULT_MIN_CONVICTION_WALLETS,
  convictionOptionLabel,
  describeConvictionFilter,
  parseAnalysisBy,
  parseMinConvictionWallets,
  withAnalysisBy,
  withMinConvictionWallets,
} from './smartWalletFilter';
import { parseAppLocation } from './historyQuery';

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

  it('round-trips with parseMinConvictionWallets without disturbing the history filters', () => {
    const search = withMinConvictionWallets('?view=history&minScore=50', 10);
    expect(parseMinConvictionWallets(search)).toBe(10);
    expect(parseAppLocation(search).history.minScore).toBe(50);
  });
});

describe('convictionOptionLabel', () => {
  it('labels the top threshold as "or more"', () => {
    expect(CONVICTION_WALLET_OPTIONS.map(convictionOptionLabel)).toEqual(['3', '5', '10+']);
  });
});

describe('describeConvictionFilter', () => {
  it('says which tokens are shown', () => {
    expect(describeConvictionFilter(3)).toBe('Showing tokens bought by ≥3 conviction wallets');
    expect(describeConvictionFilter(10)).toBe('Showing tokens bought by ≥10 conviction wallets');
  });
});

describe('analysis grouping in the URL', () => {
  it('defaults to good-history wallets and reads by=conviction', () => {
    expect(ANALYSIS_BY_PARAM).toBe('by');
    expect(parseAnalysisBy('?view=insights')).toBe('smartWallets');
    expect(parseAnalysisBy('?view=insights&by=conviction')).toBe('conviction');
    expect(parseAnalysisBy('?view=insights&by=other')).toBe('smartWallets');
  });

  it('sets by=conviction and removes it for the default, keeping other parameters', () => {
    expect(withAnalysisBy('?view=insights', 'conviction')).toBe('?view=insights&by=conviction');
    expect(withAnalysisBy('?view=insights&by=conviction&minConvictionWallets=5', 'smartWallets')).toBe(
      '?view=insights&minConvictionWallets=5',
    );
  });
});
