import './StatusDot.css';

export type StatusDotTone = 'good' | 'warn' | 'bad';

export interface StatusDotProps {
  tone: StatusDotTone;
}

/** Decorative dot; pair it with a text label. */
export function StatusDot({ tone }: StatusDotProps) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}
