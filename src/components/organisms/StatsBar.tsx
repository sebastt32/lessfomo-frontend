import type { ReactNode } from 'react';
import type { StatsResponse } from '../../api/types';
import { formatCount, formatDate } from '../../lib/format';
import { HelpTip } from '../molecules/HelpTip';
import './StatsBar.css';

export interface StatsBarProps {
  stats: StatsResponse;
}

/** Database totals from GET /api/stats. */
export function StatsBar({ stats }: StatsBarProps) {
  const groups: { label: string; items: [ReactNode, number][] }[] = [
    {
      label: 'Tokens',
      items: [
        ['Activos', stats.tokens.active],
        ['Inactivos', stats.tokens.dead],
        ['Graduados', stats.tokens.migrated],
      ],
    },
    {
      label: 'Seguridad',
      items: [
        ['Aprobados', stats.screenings.passed],
        ['Rechazados', stats.screenings.failed],
        ['Sin verificar', stats.screenings.unverified],
        ['Pendientes', stats.screenings.pending],
      ],
    },
    {
      label: 'Datos guardados',
      items: [
        ['Operaciones', stats.trades],
        [
          <>
            Registros
            <HelpTip topic="un registro">
              El estado del token guardado en momentos clave: al crearse, a los 5 minutos, a la hora, al graduarse…
            </HelpTip>
          </>,
          stats.snapshots,
        ],
      ],
    },
  ];

  return (
    <section className="stats-bar" aria-label="Totales del screener">
      <p className="stats-bar__total">
        <strong>{formatCount(stats.tokens.total)}</strong> tokens seguidos desde{' '}
        <time dateTime={stats.since} title={stats.since}>
          {formatDate(stats.since)}
        </time>
      </p>
      {groups.map((group) => (
        <dl key={group.label} className="stats-bar__group" aria-label={group.label}>
          {group.items.map(([label, value], index) => (
            <div key={index} className="stats-bar__item">
              <dt>{label}</dt>
              <dd>{formatCount(value)}</dd>
            </div>
          ))}
        </dl>
      ))}
    </section>
  );
}
