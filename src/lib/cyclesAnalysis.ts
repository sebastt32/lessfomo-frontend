import type { CyclesAnalysisResponse, CycleWindowBucket } from '../api/types';
import { formatMultiple } from './cycle';
import { formatCount, formatPercent } from './format';
import { formatEntrySeconds } from './smartWallets';

const DASH = '—';

export interface CycleStat {
  key:
    | 'appearedInTime'
    | 'appearedLate'
    | 'neverExploded'
    | 'exploded'
    | 'crashed'
    | 'medianWindow'
    | 'medianPeak'
    | 'timeToPeak'
    | 'peakToCrash';
  label: string;
  value: string;
  /** What the number means. */
  hint: string;
}

const duration = (seconds: number | null) => (seconds === null ? DASH : formatEntrySeconds(seconds));

/** The headline numbers of GET /api/analysis/cycles; statistics the backend could not compute are dashes. */
export function cycleStats(data: CyclesAnalysisResponse): CycleStat[] {
  return [
    {
      key: 'appearedInTime',
      label: 'Appeared in time',
      value: formatPercent(data.appearedInTimePct),
      hint: 'Tokens that appeared in lessfomo before their price had doubled from launch',
    },
    {
      key: 'appearedLate',
      label: 'Appeared late',
      value: formatPercent(data.appearedLatePct),
      hint: 'Tokens whose price had already doubled from launch when they appeared',
    },
    {
      key: 'neverExploded',
      label: 'Never exploded',
      value: formatPercent(data.neverExplodedPct),
      hint: 'Tokens that never reached 2× the price they had when they appeared',
    },
    {
      key: 'exploded',
      label: 'Exploded',
      value: formatPercent(data.explodedPct),
      hint: 'Tokens that reached 2× the price they had when they appeared',
    },
    {
      key: 'crashed',
      label: 'Crashed',
      value: formatPercent(data.crashedPct),
      hint: 'Tokens that fell to half of their peak or lower',
    },
    {
      key: 'medianWindow',
      label: 'Median invest window',
      value: duration(data.medianInvestWindowSeconds),
      hint: 'Typical time between appearing and the start of the run-up',
    },
    {
      key: 'medianPeak',
      label: 'Median peak',
      value: formatMultiple(data.medianPeakX),
      hint: 'Typical highest price, compared with the price when the token appeared',
    },
    {
      key: 'timeToPeak',
      label: 'Median time to peak',
      value: duration(data.medianSecondsToPeak),
      hint: 'Typical time from appearing to the peak',
    },
    {
      key: 'peakToCrash',
      label: 'Median peak to crash',
      value: duration(data.medianSecondsPeakToCrash),
      hint: 'Typical time from the peak to falling to half of it',
    },
  ];
}

const BUCKET_LABELS: Record<string, string> = {
  late: 'Appeared late',
  '<1m': 'Under 1 min',
  '1-5m': '1 to 5 min',
  '5-15m': '5 to 15 min',
  '15-60m': '15 to 60 min',
  '>1h': 'Over 1 hour',
};

const BUCKET_ORDER = Object.keys(BUCKET_LABELS);

export interface CycleBucketRow {
  key: string;
  label: string;
  tokens: string;
  tokenCount: number;
  /** Tokens relative to the biggest bucket, 0-100, for the bar. */
  barPct: number;
  medianPeak: string;
}

/** Window buckets from "late" to the longest window; labels the UI does not know go last, as sent. */
export function cycleBucketRows(buckets: readonly CycleWindowBucket[]): CycleBucketRow[] {
  const rank = (label: string) => {
    const index = BUCKET_ORDER.indexOf(label);
    return index === -1 ? BUCKET_ORDER.length : index;
  };
  const sorted = [...buckets].sort((a, b) => rank(a.label) - rank(b.label));
  const biggest = Math.max(0, ...sorted.map((bucket) => bucket.tokens));
  return sorted.map((bucket) => ({
    key: bucket.label,
    label: BUCKET_LABELS[bucket.label] ?? bucket.label,
    tokens: formatCount(bucket.tokens),
    tokenCount: bucket.tokens,
    barPct: biggest > 0 ? (bucket.tokens / biggest) * 100 : 0,
    medianPeak: formatMultiple(bucket.medianPeakX),
  }));
}
