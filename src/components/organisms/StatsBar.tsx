import type { StatsResponse } from '../../api/types';
import { formatCount, formatDate } from '../../lib/format';
import './StatsBar.css';

export interface StatsBarProps {
  stats: StatsResponse;
}

/** Database totals from GET /api/stats. */
export function StatsBar({ stats }: StatsBarProps) {
  const groups: { label: string; items: [string, number][] }[] = [
    {
      label: 'Tokens',
      items: [
        ['Active', stats.tokens.active],
        ['Dead', stats.tokens.dead],
        ['Migrated', stats.tokens.migrated],
      ],
    },
    {
      label: 'Safety',
      items: [
        ['Passed', stats.screenings.passed],
        ['Failed', stats.screenings.failed],
        ['Unverified', stats.screenings.unverified],
        ['Pending', stats.screenings.pending],
      ],
    },
    {
      label: 'Recorded',
      items: [
        ['Trades', stats.trades],
        ['Snapshots', stats.snapshots],
      ],
    },
  ];

  return (
    <section className="stats-bar" aria-label="Screener totals">
      <p className="stats-bar__total">
        <strong>{formatCount(stats.tokens.total)}</strong> tokens tracked since{' '}
        <time dateTime={stats.since} title={stats.since}>
          {formatDate(stats.since)}
        </time>
      </p>
      {groups.map((group) => (
        <dl key={group.label} className="stats-bar__group" aria-label={group.label}>
          {group.items.map(([label, value]) => (
            <div key={label} className="stats-bar__item">
              <dt>{label}</dt>
              <dd>{formatCount(value)}</dd>
            </div>
          ))}
        </dl>
      ))}
    </section>
  );
}
