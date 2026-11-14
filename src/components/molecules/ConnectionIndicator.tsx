import type { ConnectionState } from '../../api/stream';
import { StatusDot, type StatusDotTone } from '../atoms/StatusDot';
import './ConnectionIndicator.css';

const COPY: Record<ConnectionState, { label: string; tone: StatusDotTone }> = {
  connecting: { label: 'Connecting to live feed', tone: 'warn' },
  connected: { label: 'Live', tone: 'good' },
  reconnecting: { label: 'Reconnecting', tone: 'warn' },
  offline: { label: 'Offline', tone: 'bad' },
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
