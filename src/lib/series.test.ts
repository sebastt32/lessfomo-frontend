import { describe, expect, it } from 'vitest';
import { mergeScoreSeries } from './series';
import { makePoint } from '../test/fixtures';

describe('mergeScoreSeries', () => {
  it('appends only live points newer than the stored history', () => {
    const history = [makePoint('2026-11-13T20:01:00.000Z', 40), makePoint('2026-11-13T20:02:00.000Z', 55)];
    const live = [
      { at: '2026-11-13T20:02:00.000Z', score: 55 },
      { at: '2026-11-13T20:03:00.000Z', score: 61 },
    ];
    expect(mergeScoreSeries(history, live)).toEqual([
      { at: '2026-11-13T20:01:00.000Z', score: 40 },
      { at: '2026-11-13T20:02:00.000Z', score: 55 },
      { at: '2026-11-13T20:03:00.000Z', score: 61 },
    ]);
  });

  it('uses live points alone when there is no stored history', () => {
    expect(mergeScoreSeries([], [{ at: '2026-11-13T20:03:00.000Z', score: 61 }])).toEqual([
      { at: '2026-11-13T20:03:00.000Z', score: 61 },
    ]);
  });
});
