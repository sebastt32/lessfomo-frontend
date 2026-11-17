import type { CyclesAnalysisResponse } from '../../api/types';
import { cycleBucketRows, cycleStats, type CycleStat } from '../../lib/cyclesAnalysis';
import { formatCount } from '../../lib/format';
import { DateTime } from '../atoms/DateTime';
import './CyclesAnalysis.css';

export interface CyclesAnalysisProps {
  data: CyclesAnalysisResponse;
}

/** Buckets with fewer tokens than this are flagged: their medians swing a lot. */
export const SMALL_CYCLE_SAMPLE = 30;

const SHARES: readonly CycleStat['key'][] = ['appearedInTime', 'appearedLate', 'neverExploded'];

function StatList({ stats, className }: { stats: readonly CycleStat[]; className: string }) {
  return (
    <dl className={className}>
      {stats.map((stat) => (
        <div key={stat.key} title={stat.hint}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** How tokens that appeared in lessfomo went through their cycle, in aggregate. Presentational. */
export function CyclesAnalysis({ data }: CyclesAnalysisProps) {
  const stats = cycleStats(data);
  const rows = cycleBucketRows(data.windowBuckets);
  const shares = stats.filter((stat) => SHARES.includes(stat.key));
  const rest = stats.filter((stat) => !SHARES.includes(stat.key));

  return (
    <div className="cycles">
      <p className="cycles__intro">
        {formatCount(data.tokens)} {data.tokens === 1 ? 'token' : 'tokens'} appeared in lessfomo from{' '}
        <DateTime iso={data.from} /> to <DateTime iso={data.to} />. A token appears when enough conviction wallets
        have bought it; its price at that moment is its base price. "In time" means its price had not yet doubled
        from launch; "exploded" means it later reached 2× the base price.
      </p>

      {data.tokens === 0 ? (
        <p className="cycles__note">No token appeared in this period yet, so there is nothing to measure.</p>
      ) : null}

      <StatList stats={shares} className="cycles__shares" />
      <StatList stats={rest} className="cycles__stats" />

      {rows.length > 0 ? (
        <section className="cycles__windows" aria-labelledby="cycles-windows-title">
          <h3 id="cycles-windows-title" className="cycles__subtitle">
            Tokens by invest window
          </h3>
          <ol className="cycles__buckets">
            {rows.map((row) => (
              <li key={row.key} className="cycles__bucket">
                <span className="cycles__label">{row.label}</span>
                <span className="cycles__track" aria-hidden="true">
                  <span className="cycles__bar" style={{ inlineSize: `${row.barPct}%` }} />
                </span>
                <span className="cycles__value">
                  {row.tokens} {row.tokenCount === 1 ? 'token' : 'tokens'}
                  {row.tokenCount > 0 && row.tokenCount < SMALL_CYCLE_SAMPLE ? (
                    <span className="cycles__small" title={`Fewer than ${SMALL_CYCLE_SAMPLE} tokens: treat with care`}>
                      {' '}
                      (small sample)
                    </span>
                  ) : null}
                </span>
                <span className="cycles__peak">median peak {row.medianPeak}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="cycles__note">
        Peaks are multiples of the base price. These are cycles of past tokens lessfomo observed, measured as they
        happened; they do not say what the next token will do.
      </p>
    </div>
  );
}
