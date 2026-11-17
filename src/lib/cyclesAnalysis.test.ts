import { describe, expect, it } from 'vitest';
import { makeCyclesAnalysis } from '../test/fixtures';
import { cycleBucketRows, cycleStats } from './cyclesAnalysis';

describe('cycleStats', () => {
  it('formats shares and medians in plain units', () => {
    const stats = Object.fromEntries(cycleStats(makeCyclesAnalysis()).map((stat) => [stat.key, stat.value]));
    expect(stats).toEqual({
      appearedInTime: '61.5%',
      appearedLate: '38.5%',
      neverExploded: '55.8%',
      exploded: '44.2%',
      crashed: '31.0%',
      medianWindow: '6 min 20 s',
      medianPeak: '2.90×',
      timeToPeak: '12 min',
      peakToCrash: '1 min 35 s',
    });
  });

  it('shows dashes for statistics the backend could not compute', () => {
    const stats = cycleStats(
      makeCyclesAnalysis({
        tokens: 0,
        appearedInTimePct: null,
        appearedLatePct: null,
        explodedPct: null,
        neverExplodedPct: null,
        crashedPct: null,
        medianInvestWindowSeconds: null,
        medianPeakX: null,
        medianSecondsToPeak: null,
        medianSecondsPeakToCrash: null,
      }),
    );
    expect(stats.map((stat) => stat.value)).toEqual(Array.from({ length: 9 }, () => '—'));
  });
});

describe('cycleBucketRows', () => {
  it('orders the window buckets from late to the longest window, with readable labels', () => {
    const rows = cycleBucketRows(makeCyclesAnalysis().windowBuckets);
    expect(rows.map((row) => [row.key, row.label, row.tokens, row.medianPeak])).toEqual([
      ['late', 'Appeared late', '189', '2.20×'],
      ['<1m', 'Under 1 min', '40', '2.60×'],
      ['1-5m', '1 to 5 min', '80', '3.10×'],
      ['5-15m', '5 to 15 min', '60', '3.40×'],
      ['15-60m', '15 to 60 min', '12', '4.05×'],
      ['>1h', 'Over 1 hour', '0', '—'],
    ]);
    // Bars are relative to the biggest bucket.
    expect(rows[0]?.barPct).toBe(100);
    expect(rows[1]?.barPct).toBeCloseTo((40 / 189) * 100);
    expect(rows[5]?.barPct).toBe(0);
  });

  it('keeps unknown bucket labels last and handles no buckets', () => {
    const rows = cycleBucketRows([
      { label: 'weird', tokens: 3, medianPeakX: 1.2 },
      { label: '<1m', tokens: 1, medianPeakX: null },
    ]);
    expect(rows.map((row) => row.label)).toEqual(['Under 1 min', 'weird']);
    expect(cycleBucketRows([])).toEqual([]);
  });
});
