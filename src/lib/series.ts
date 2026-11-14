import type { MomentumPoint } from '../api/types';
import type { ScorePoint } from '../state/liveFeed';

/**
 * Joins a token's stored momentum history (oldest first) with scores seen live
 * since it was fetched, keeping chronological order and one point per minute.
 */
export function mergeScoreSeries(history: readonly MomentumPoint[], live: readonly ScorePoint[]): ScorePoint[] {
  const series: ScorePoint[] = history.map(({ at, score }) => ({ at, score }));
  const lastAt = series.at(-1)?.at;
  const lastTime = lastAt === undefined ? Number.NEGATIVE_INFINITY : Date.parse(lastAt);
  for (const point of live) {
    if (Date.parse(point.at) > lastTime) series.push(point);
  }
  return series;
}
