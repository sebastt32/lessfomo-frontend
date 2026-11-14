const DASH = '—';
const MINUS = '−';

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return DASH;
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatPercent(value: number | null, digits = 1): string {
  return value === null ? DASH : `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value: number, digits = 1): string {
  const abs = Math.abs(value).toFixed(digits);
  if (Number(abs) === 0) return `${(0).toFixed(digits)}%`;
  return value > 0 ? `+${abs}%` : `${MINUS}${abs}%`;
}

export function formatScore(score: number): string {
  return Math.round(score).toString();
}

/** Momentum components go from 0 to 1. */
export function formatComponent(value: number): string {
  return value.toFixed(2);
}

const countFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatCount(value: number | null): string {
  return value === null ? DASH : countFormatter.format(value);
}

export function formatSol(value: number): string {
  return `${value.toFixed(2)} SOL`;
}

export function formatPriceSol(value: number | null): string {
  return value === null ? DASH : `${Number(value.toPrecision(3)).toString()} SOL`;
}

export function shortenMint(mint: string): string {
  return mint.length <= 12 ? mint : `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
