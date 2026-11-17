/**
 * The smart-wallet filter (decision D4): every list shows only tokens bought by at least N good-or-elite
 * wallets, 5 by default (the public minimum: fewer is never exposed by the API). It lives in the URL as
 * `minSmartWallets` and applies to every view.
 */

export const DEFAULT_MIN_SMART_WALLETS = 5;

/** The thresholds offered; the last one means "or more". */
export const SMART_WALLET_OPTIONS = [5, 10, 20, 30] as const;

export const MIN_SMART_WALLETS_PARAM = 'minSmartWallets';

const MAX = 30;
const OFFERED: readonly number[] = SMART_WALLET_OPTIONS;

export function parseMinSmartWallets(search: string): number {
  const value = new URLSearchParams(search).get(MIN_SMART_WALLETS_PARAM);
  if (value === null || !/^\d+$/.test(value)) return DEFAULT_MIN_SMART_WALLETS;
  const number = Number(value);
  return OFFERED.includes(number) ? number : DEFAULT_MIN_SMART_WALLETS;
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
