/**
 * The conviction-wallet filter (S7, decision D7): every list shows only tokens bought by at least N
 * conviction wallets (good-history wallets that usually hold what they buy), 3 by default (the public
 * minimum: fewer is never exposed by the API). It lives in the URL as `minConvictionWallets` and applies
 * to every view. Flippers never count.
 */

export const DEFAULT_MIN_CONVICTION_WALLETS = 3;

/** The thresholds offered; the last one means "or more". */
export const CONVICTION_WALLET_OPTIONS = [3, 5, 10] as const;

export const MIN_CONVICTION_WALLETS_PARAM = 'minConvictionWallets';

/** The previous good-wallet threshold; dropped from URLs so only the conviction filter travels. */
const LEGACY_MIN_SMART_WALLETS_PARAM = 'minSmartWallets';

const MAX = 10;
const OFFERED: readonly number[] = CONVICTION_WALLET_OPTIONS;

function toSearch(params: URLSearchParams): string {
  const query = params.toString();
  // Commas and colons are legal in a query value; keep them readable in the address bar.
  return query === '' ? '' : `?${query.replace(/%2C/gi, ',').replace(/%3A/gi, ':')}`;
}

export function parseMinConvictionWallets(search: string): number {
  const value = new URLSearchParams(search).get(MIN_CONVICTION_WALLETS_PARAM);
  if (value === null || !/^\d+$/.test(value)) return DEFAULT_MIN_CONVICTION_WALLETS;
  const number = Number(value);
  return OFFERED.includes(number) ? number : DEFAULT_MIN_CONVICTION_WALLETS;
}

/** `search` with the threshold set (or removed when it is the default); '' when nothing is left. */
export function withMinConvictionWallets(search: string, min: number): string {
  const params = new URLSearchParams(search);
  params.delete(MIN_CONVICTION_WALLETS_PARAM);
  params.delete(LEGACY_MIN_SMART_WALLETS_PARAM);
  if (min !== DEFAULT_MIN_CONVICTION_WALLETS) params.set(MIN_CONVICTION_WALLETS_PARAM, String(min));
  return toSearch(params);
}

export function convictionOptionLabel(min: number): string {
  return min >= MAX ? `${MAX}+` : String(min);
}

export function describeConvictionFilter(min: number): string {
  return `Showing tokens bought by ≥${min} conviction ${min === 1 ? 'wallet' : 'wallets'}`;
}
