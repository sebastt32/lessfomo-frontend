/**
 * Dollars as the main figure: SOL amounts are turned into USD with the live SOL/USD price, and market caps
 * come from the price per token and pump.fun's fixed supply.
 */

const DASH = '—';

/** Every pump.fun token is created with one billion tokens. */
export const PUMP_TOTAL_SUPPLY = 1_000_000_000;

/** Market cap in SOL of a price per token (SOL); null when the price is unknown. */
export function marketCapSol(priceSol: number | null | undefined): number | null {
  return priceSol === null || priceSol === undefined || !Number.isFinite(priceSol) ? null : priceSol * PUMP_TOTAL_SUPPLY;
}

/** SOL in USD; null when either is unknown. */
export function solToUsd(sol: number | null | undefined, solUsd: number | null): number | null {
  if (sol === null || sol === undefined || solUsd === null || !Number.isFinite(sol)) return null;
  return sol * solUsd;
}

const UNITS = [
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
] as const;

/** Three significant digits at most, without trailing zeros: 4.5, 45.2, 452. */
function short(value: number): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return String(Number(value.toFixed(digits)));
}

/** "$850", "$45.2K", "$1.25M"; cents only under one dollar; a dash when unknown. */
export function formatUsdCompact(usd: number | null): string {
  if (usd === null || !Number.isFinite(usd)) return DASH;
  const sign = usd < 0 ? '-' : '';
  const abs = Math.abs(usd);
  for (const unit of UNITS) {
    if (abs >= unit.value) return `${sign}$${short(abs / unit.value)}${unit.suffix}`;
  }
  return `${sign}$${abs >= 1 ? Math.round(abs) : Number(abs.toFixed(2))}`;
}
