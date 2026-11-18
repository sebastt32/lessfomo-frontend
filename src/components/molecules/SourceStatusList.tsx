import type { SourceStatus, Sources } from '../../api/types';
import { StatusDot, type StatusDotTone } from '../atoms/StatusDot';
import './SourceStatusList.css';

const SOURCE_LABELS: Record<keyof Sources, string> = {
  pumpportal: 'PumpPortal',
  solanaLogs: 'Logs de Solana',
};

const STATUS_COPY: Record<SourceStatus, { label: string; tone: StatusDotTone }> = {
  connecting: { label: 'conectando', tone: 'warn' },
  connected: { label: 'conectada', tone: 'good' },
  disconnected: { label: 'desconectada', tone: 'bad' },
};

export interface SourceStatusListProps {
  /** null while unknown. */
  sources: Sources | null;
}

export function SourceStatusList({ sources }: SourceStatusListProps) {
  const keys = Object.keys(SOURCE_LABELS) as (keyof Sources)[];
  return (
    <dl className="source-status-list" aria-label="Fuentes de datos">
      {keys.map((key) => {
        const status = sources?.[key];
        const copy = status ? STATUS_COPY[status] : null;
        return (
          <div className="source-status-list__item" key={key}>
            <dt>{SOURCE_LABELS[key]}</dt>
            <dd>
              {copy ? <StatusDot tone={copy.tone} /> : null}
              {copy ? copy.label : 'sin datos'}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
