import type { CandleInterval, CyclePhase, TokenCycle } from '../api/types';
import { bucketStart } from './candles';
import { formatSignedPercent } from './format';
import { formatEntrySeconds } from './smartWallets';

/**
 * A token's cycle in plain words: how long it could be bought after appearing in lessfomo, and where the
 * moments of the cycle fall on its chart. Everything here describes what already happened; nothing predicts.
 */

const DASH = '—';

export const CYCLE_UNAVAILABLE = 'Todavía no hay datos del ciclo';

export const PHASE_LABELS: Record<CyclePhase, string> = {
  stable: 'Estable',
  exploding: 'Duplicó',
  crashed: 'Se desplomó',
};

export const PHASE_HINTS: Record<CyclePhase, string> = {
  stable: 'Todavía no llegó al doble del precio que tenía cuando apareció en lessfomo',
  exploding: 'Llegó al doble (2×) del precio que tenía cuando apareció en lessfomo',
  crashed: 'Después del pico cayó a la mitad o menos',
};

export const PHASE_ORDER: readonly CyclePhase[] = ['stable', 'exploding', 'crashed'];

export const LATE_HINT = 'Antes de aparecer en lessfomo, su precio ya se había duplicado desde el lanzamiento';

function toSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** "45s", "6m 20s", "12m", "1h 5m", "1d 1h": two units at most, for table cells. */
export function formatDurationCompact(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const pair = (big: number, bigUnit: string, small: number, smallUnit: string) =>
    small === 0 ? `${big}${bigUnit}` : `${big}${bigUnit} ${small}${smallUnit}`;
  if (total < 3600) return pair(Math.floor(total / 60), 'm', total % 60, 's');
  if (total < 86_400) return pair(Math.floor(total / 3600), 'h', Math.floor((total % 3600) / 60), 'm');
  return pair(Math.floor(total / 86_400), 'd', Math.floor((total % 86_400) / 3600), 'h');
}

/** Whole seconds since the token appeared, never negative; null when the time cannot be read. */
function secondsSinceAppeared(cycle: TokenCycle, now: number): number | null {
  const appeared = Date.parse(cycle.appearedAt);
  return Number.isNaN(appeared) ? null : Math.max(0, Math.floor((now - appeared) / 1000));
}

/** A late token has no window to buy, whatever its phase; its window (when known) is negative. */
function isLate(cycle: TokenCycle): boolean {
  return cycle.appearedLate || (cycle.investWindowSeconds !== null && cycle.investWindowSeconds < 0);
}

/** One sentence about the time the token could be bought before its run-up. `now` is ms since epoch. */
export function investWindowSentence(cycle: TokenCycle, now: number): string {
  const window = cycle.investWindowSeconds;
  if (isLate(cycle)) {
    return window === null
      ? 'Apareció cuando ya se había duplicado'
      : `Apareció ${formatEntrySeconds(Math.abs(window))} después de haberse duplicado`;
  }
  if (window !== null) {
    return window === 0
      ? 'La subida empezó al aparecer: no hubo tiempo para comprar antes'
      : `Se pudo comprar durante ${formatEntrySeconds(window)} antes de la subida`;
  }
  if (cycle.phase === 'stable') {
    const elapsed = secondsSinceAppeared(cycle, now);
    return elapsed === null ? 'Sigue estable' : `Sigue estable: ${formatEntrySeconds(elapsed)} desde que apareció`;
  }
  return 'No se sabe cuánto tiempo hubo para comprar';
}

/** The same fact for a table cell: "6m 20s para comprar", "12m hasta ahora", "3m tarde" or a dash. */
export function investWindowCompact(cycle: TokenCycle | null | undefined, now: number): string {
  if (!cycle) return DASH;
  const window = cycle.investWindowSeconds;
  if (isLate(cycle)) return window === null ? 'tarde' : `${formatDurationCompact(Math.abs(window))} tarde`;
  if (window !== null) return `${formatDurationCompact(window)} para comprar`;
  if (cycle.phase === 'stable') {
    const elapsed = secondsSinceAppeared(cycle, now);
    return elapsed === null ? DASH : `${formatDurationCompact(elapsed)} hasta ahora`;
  }
  return DASH;
}

/** "3.20×"; a dash when unknown. */
export function formatMultiple(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? DASH : `${value.toFixed(2)}×`;
}

export interface CycleFact {
  key: 'riseBefore' | 'peak' | 'timeToPeak' | 'drawdown' | 'lastPrice';
  label: string;
  value: string;
  /** What the number means, for a tooltip. */
  hint: string;
}

/** The numbers of a cycle as label/value pairs; unknown values are dashes. */
export function cycleFacts(cycle: TokenCycle): CycleFact[] {
  const appeared = toSeconds(cycle.appearedAt);
  const peak = toSeconds(cycle.peakAt);
  const toPeak = appeared !== null && peak !== null ? Math.max(0, peak - appeared) : null;
  const last = cycle.lastPriceX;
  return [
    {
      key: 'riseBefore',
      label: 'Subida antes de aparecer',
      value: cycle.riseBeforeAppearanceX === null ? DASH : `${formatMultiple(cycle.riseBeforeAppearanceX)} su precio de lanzamiento`,
      hint: 'Precio cuando apareció en lessfomo, comparado con su primera operación'
    },
    {
      key: 'peak',
      label: 'Pico',
      value: cycle.peakX === null ? DASH : `${formatMultiple(cycle.peakX)} el precio al aparecer`,
      hint: 'Precio más alto después de duplicarse, comparado con el precio cuando apareció'
    },
    {
      key: 'timeToPeak',
      label: 'Tiempo hasta el pico',
      value: toPeak === null ? DASH : `${formatEntrySeconds(toPeak)} después de aparecer`,
      hint: 'Desde que apareció en lessfomo hasta su precio más alto por ahora'
    },
    {
      key: 'drawdown',
      label: 'Mayor caída',
      value: cycle.maxDrawdownPct === null ? DASH : `${Math.round(cycle.maxDrawdownPct)}% debajo del pico`,
      hint: 'La caída más grande desde el pico, por ahora'
    },
    {
      key: 'lastPrice',
      label: 'Último precio',
      value: last === null ? DASH : `${formatMultiple(last)} el precio al aparecer (${formatSignedPercent((last - 1) * 100)})`,
      hint: 'Último precio comparado con el precio cuando apareció'
    },
  ];
}

/** The reading updated last; null when neither is known. */
export function newerCycle(a: TokenCycle | null | undefined, b: TokenCycle | null | undefined): TokenCycle | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a;
}

export type CycleMarkKind = 'created' | 'appeared' | 'runStart' | 'explosion' | 'peak' | 'crash';

export interface CycleMark {
  kind: CycleMarkKind;
  label: string;
  /** ISO time of the moment. */
  at: string;
  /** The same moment in Unix seconds. */
  time: number;
}

export const MARK_LABELS: Record<CycleMarkKind, string> = {
  created: 'Creado',
  appeared: 'Apareció en lessfomo',
  runStart: 'Empieza la subida',
  explosion: 'Se duplica',
  peak: 'Pico',
  crash: 'Caída',
};

export const MARK_HINTS: Record<CycleMarkKind, string> = {
  created: 'El token se creó en pump.fun',
  appeared: 'Se hizo público en lessfomo: lo compraron suficientes wallets que mantienen. Su precio en ese momento es el precio al aparecer',
  runStart: 'Última operación a no más de 1,2× el precio al aparecer, antes de duplicarse',
  explosion: 'Primera operación al doble del precio al aparecer o más',
  peak: 'Precio más alto después de duplicarse, por ahora',
  crash: 'Primera operación a la mitad del pico o menos',
};

/** The moments of a cycle that already happened, oldest first. Works without a cycle (creation only). */
export function cycleMarks(createdAt: string | null | undefined, cycle: TokenCycle | null | undefined): CycleMark[] {
  const moments: [CycleMarkKind, string | null | undefined][] = [
    ['created', createdAt],
    ['appeared', cycle?.appearedAt],
    ['runStart', cycle?.runStartAt],
    ['explosion', cycle?.explosionAt],
    ['peak', cycle?.peakAt],
    ['crash', cycle?.crashAt],
  ];
  const appeared = toSeconds(cycle?.appearedAt);
  const marks: CycleMark[] = [];
  for (const [kind, at] of moments) {
    let time = toSeconds(at);
    // Creation is stamped by our clock and the appearance by the chain's, which can run a second or
    // two earlier; a token cannot appear before it exists, so the creation is drawn no later.
    if (kind === 'created' && time !== null && appeared !== null && time > appeared) time = appeared;
    if (at && time !== null) marks.push({ kind, label: MARK_LABELS[kind], at, time });
  }
  // Stable sort: moments at the same second keep the order of the cycle.
  return marks.sort((a, b) => a.time - b.time);
}

/** The time the token could be bought, in Unix seconds. `open` while it is still stable (it ends "now"). */
export interface InvestRange {
  from: number;
  to: number;
  open: boolean;
}

/** From the appearance to the start of the run-up, or to now while stable; null for late tokens. */
export function investWindowRange(cycle: TokenCycle | null | undefined, now: number): InvestRange | null {
  if (!cycle || isLate(cycle)) return null;
  const from = toSeconds(cycle.appearedAt);
  if (from === null) return null;
  const runStart = toSeconds(cycle.runStartAt);
  if (runStart !== null) return runStart >= from ? { from, to: runStart, open: false } : null;
  if (cycle.phase !== 'stable') return null;
  const to = Math.floor(now / 1000);
  return to >= from ? { from, to, open: true } : null;
}

export interface PlacedMark extends CycleMark {
  /** Time of the candle the mark sits on; null when the moment is outside the loaded candles. */
  candleTime: number | null;
}

export interface CyclePlacement {
  marks: PlacedMark[];
  /** Candle times the shaded invest window spans; null when no part of it is loaded. */
  shade: { from: number; to: number } | null;
}

/** First index whose time is ≥ `time` (the array is sorted ascending); `times.length` when none. */
function lowerBound(times: readonly number[], time: number): number {
  let low = 0;
  let high = times.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((times[mid] as number) < time) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Maps marks and the invest window onto the loaded candles (`candleTimes`: bucket starts, oldest first).
 * Buckets without trades have no candle, so a moment lands on the next candle. Moments older than the
 * first candle or newer than the last one stay off the chart (candleTime null) and are only listed.
 */
export function placeCycle(
  marks: readonly CycleMark[],
  range: InvestRange | null,
  candleTimes: readonly number[],
  interval: CandleInterval,
): CyclePlacement {
  const first = candleTimes[0];
  const last = candleTimes.at(-1);
  if (first === undefined || last === undefined) {
    return { marks: marks.map((mark) => ({ ...mark, candleTime: null })), shade: null };
  }

  const placed = marks.map((mark): PlacedMark => {
    const bucket = bucketStart(mark.time, interval);
    if (bucket < first || bucket > last) return { ...mark, candleTime: null };
    return { ...mark, candleTime: candleTimes[lowerBound(candleTimes, bucket)] ?? null };
  });

  let shade: CyclePlacement['shade'] = null;
  if (range) {
    const fromBucket = bucketStart(range.from, interval);
    const toBucket = bucketStart(range.to, interval);
    if (toBucket >= first && fromBucket <= last) {
      const from = candleTimes[lowerBound(candleTimes, Math.max(fromBucket, first))] as number;
      // Last candle at or before the end of the window.
      const endIndex = lowerBound(candleTimes, Math.min(toBucket, last) + 1) - 1;
      const to = candleTimes[Math.max(endIndex, 0)] as number;
      shade = { from, to: Math.max(from, to) };
    }
  }
  return { marks: placed, shade };
}
