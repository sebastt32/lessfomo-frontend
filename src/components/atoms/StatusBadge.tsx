import type { SafetyStatus } from '../../api/types';
import './StatusBadge.css';

const LABELS: Record<SafetyStatus, string> = {
  pending: 'Pendiente',
  passed: 'Aprobado',
  failed: 'Rechazado',
  unverified: 'Sin verificar',
};

/** Glyphs give a non-color cue for each status. */
const GLYPHS: Record<SafetyStatus, string> = {
  pending: '…',
  passed: '✓',
  failed: '✕',
  unverified: '?',
};

export interface StatusBadgeProps {
  status: SafetyStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-badge__glyph" aria-hidden="true">
        {GLYPHS[status]}
      </span>
      {LABELS[status]}
    </span>
  );
}
