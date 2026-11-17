import type { SmartWalletBucket, WalletRecord, WalletTier } from '../api/types';
import { formatCount, formatPercent, formatSignedPercent } from './format';

const MINUS = '−';

export const TIER_LABELS: Record<WalletTier, string> = { elite: 'Elite', good: 'Good', none: 'Not rated' };

export const TIER_HINTS: Record<WalletTier, string> = {
  elite: 'Elite: at least 10 closed tokens in the last 7 days, 65% won and 5 SOL or more net profit (default settings)',
  good: 'Good: at least 5 closed tokens in the last 7 days, 55% won and a net profit (default settings)',
  none: 'Not enough good results in the last 7 days to be rated good',
};

/** "4 s", "2 min 5 s", "1 h 3 min" after launch. */
export function formatEntrySeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  if (total < 3600) {
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "+14.24 SOL", "−1.20 SOL", "0.00 SOL". */
export function formatSignedSol(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  if (Number(abs) === 0) return `${(0).toFixed(2)} SOL`;
  return `${value > 0 ? '+' : MINUS}${abs} SOL`;
}

/** Why a wallet counts as good, in one plain sentence built from its record. */
export function describeWalletRecord(record: WalletRecord): string {
  if (record.tokens === 0) return 'No closed tokens in the last 7 days yet';
  const parts = [
    `Won ${formatCount(record.wins)} of ${formatCount(record.tokens)} ${record.tokens === 1 ? 'token' : 'tokens'} (${Math.round(record.winRate)}%) in the last 7 days`,
    `net ${formatSignedSol(record.netPnlSol)}`,
  ];
  if (record.medianEntrySeconds !== null) {
    parts.push(`usually buys ${formatEntrySeconds(record.medianEntrySeconds)} after launch`);
  }
  return parts.join(', ');
}

const BUCKET_ORDER = ['0', '1', '2', '3', '4', '5+'];

function bucketLabel(key: string): string {
  if (key === '0') return 'None';
  return key === '1' ? '1 wallet' : `${key} wallets`;
}

export interface AnalysisRow {
  key: string;
  label: string;
  tokens: string;
  tokenCount: number;
  reached2x: string;
  /** reached2xPct relative to the best bucket, 0-100, for the bar. */
  barPct: number;
  migrated: string;
  avgReturn: string;
  medianReturn: string;
  winners: string;
  medianPeak: string;
  /** How the 2× rate compares with tokens bought by no good wallet; null without a baseline. */
  lift: string | null;
  /** Raw values, for styling. */
  avgReturnPct: number;
  medianReturnPct: number;
}

/** Table rows for the analysis buckets, in order 0, 1, 2, 3, 4, 5+; unknown buckets go last. */
export function analysisRows(buckets: readonly SmartWalletBucket[]): AnalysisRow[] {
  const rank = (key: string) => {
    const index = BUCKET_ORDER.indexOf(key);
    return index === -1 ? BUCKET_ORDER.length : index;
  };
  const sorted = [...buckets].sort((a, b) => rank(a.smartWallets) - rank(b.smartWallets));
  const best = Math.max(0, ...sorted.map((b) => b.reached2xPct));
  const baseline = sorted.find((b) => b.smartWallets === '0');
  const baseRate = baseline && baseline.reached2xPct > 0 ? baseline.reached2xPct : null;

  return sorted.map((bucket) => {
    let lift: string | null = null;
    if (bucket === baseline) lift = 'Baseline';
    else if (baseRate !== null) lift = `${(bucket.reached2xPct / baseRate).toFixed(1)}× vs none`;
    return {
      key: bucket.smartWallets,
      label: bucketLabel(bucket.smartWallets),
      tokens: formatCount(bucket.tokens),
      tokenCount: bucket.tokens,
      reached2x: formatPercent(bucket.reached2xPct),
      barPct: best > 0 ? (bucket.reached2xPct / best) * 100 : 0,
      migrated: formatPercent(bucket.migratedPct),
      avgReturn: formatSignedPercent(bucket.avgReturnPct),
      medianReturn: formatSignedPercent(bucket.medianReturnPct),
      winners: formatPercent(bucket.winnersPct),
      medianPeak: `${bucket.medianPeakX.toFixed(2)}×`,
      lift,
      avgReturnPct: bucket.avgReturnPct,
      medianReturnPct: bucket.medianReturnPct,
    };
  });
}
