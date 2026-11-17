/**
 * The smart-wallet filter (decision D4): every list shows only tokens bought by at least N good-or-elite
 * wallets, 1 by default. It lives in the URL as `minSmartWallets` and applies to every view.
 */

export const DEFAULT_MIN_SMART_WALLETS = 1;

/** The thresholds offered; 5 means "5 or more". */
export const SMART_WALLET_OPTIONS = [1, 2, 3, 4, 5] as const;

export const MIN_SMART_WALLETS_PARAM = 'minSmartWallets';

const MAX = 5;

export function parseMinSmartWallets(search: string): number {
  const value = new URLSearchParams(search).get(MIN_SMART_WALLETS_PARAM);
  if (value === null || !/^\d+$/.test(value)) return DEFAULT_MIN_SMART_WALLETS;
  const number = Number(value);
  return number >= DEFAULT_MIN_SMART_WALLETS && number <= MAX ? number : DEFAULT_MIN_SMART_WALLETS;
}

/** `search` with the threshold set (or removed when it is the default); '' when nothing is left. */
export function withMinSmartWallets(search: string, min: number): string {
  const params = new URLSearchParams(search);
  params.delete(MIN_SMART_WALLETS_PARAM);
  if (min !== DEFAULT_MIN_SMART_WALLETS) params.set(MIN_SMART_WALLETS_PARAM, String(min));
  const query = params.toString();
  // Commas and colons are legal in a query value; keep them readable in the address bar.
  return query === '' ? '' : `?${query.replace(/%2C/gi, ',').replace(/%3A/gi, ':')}`;
}

export function smartWalletOptionLabel(min: number): string {
  return min >= MAX ? `${MAX}+` : String(min);
}

export function describeSmartWalletFilter(min: number): string {
  return `Showing tokens bought by ≥${min} good-history ${min === 1 ? 'wallet' : 'wallets'}`;
}
