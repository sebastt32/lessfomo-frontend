import type { Liquidity } from '../api/types';

const DASH = '—';
const MINUS = '−';

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return DASH;
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 5) return 'justo ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
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

const solGrouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const solTwoDecimals = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** SOL amount that may be unknown: grouped above 1,000, two decimals above 1, three significant digits below. */
export function formatSolAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  const abs = Math.abs(value);
  if (abs >= 1000) return `${solGrouped.format(value)} SOL`;
  if (abs >= 1) return `${solTwoDecimals.format(value)} SOL`;
  return `${Number(value.toPrecision(3)).toString()} SOL`;
}

/** SOL in the token's market; a dash when unknown or when the backend does not send liquidity yet. */
export function formatLiquiditySol(liquidity: Liquidity | null | undefined): string {
  return formatSolAmount(liquidity?.sol ?? null);
}

/** Bonding curve progress, 0-100 with no decimals. */
export function formatCurvePct(value: number | null): string {
  if (value === null) return DASH;
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(kind: 'date' | 'time' | 'seconds', timeZone: string | undefined): Intl.DateTimeFormat {
  const key = `${kind}|${timeZone ?? ''}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(
      'es',
      kind === 'date'
        ? { month: 'short', day: 'numeric', year: 'numeric', timeZone }
        : {
            hour: '2-digit',
            minute: '2-digit',
            ...(kind === 'seconds' ? { second: '2-digit' as const } : {}),
            hourCycle: 'h23',
            timeZone,
          },
    );
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/** Calendar date such as "14 nov 2026", in the viewer's timezone unless one is given. */
export function formatDate(iso: string, timeZone?: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? DASH : dateFormatter('date', timeZone).format(time);
}

/** 24-hour clock time such as "03:15", in the viewer's timezone unless one is given. */
export function formatTime(iso: string, timeZone?: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? DASH : dateFormatter('time', timeZone).format(time);
}

/** 24-hour clock time with seconds such as "03:15:42", for moments where seconds matter. */
export function formatTimeWithSeconds(iso: string, timeZone?: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? DASH : dateFormatter('seconds', timeZone).format(time);
}
