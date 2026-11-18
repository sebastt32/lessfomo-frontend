import type { ConnectionState } from '../../api/stream';
import { StatusDot, type StatusDotTone } from '../atoms/StatusDot';
import './ConnectionIndicator.css';

const COPY: Record<ConnectionState, { label: string; tone: StatusDotTone }> = {
  connecting: { label: 'Conectando con los datos en vivo', tone: 'warn' },
  connected: { label: 'Conectado', tone: 'good' },
  reconnecting: { label: 'Reconectando', tone: 'warn' },
  offline: { label: 'Sin conexión', tone: 'bad' },
};

export interface ConnectionIndicatorProps {
  state: ConnectionState;
}

export function ConnectionIndicator({ state }: ConnectionIndicatorProps) {
  const { label, tone } = COPY[state];
  return (
    <p className="connection-indicator" role="status" aria-live="polite">
      <StatusDot tone={tone} />
      <span>{label}</span>
    </p>
  );
}
