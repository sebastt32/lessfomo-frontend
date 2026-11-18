import type { ReactNode } from 'react';
import './SectionState.css';

export interface LoadingStateProps {
  children: ReactNode;
}

export function LoadingState({ children }: LoadingStateProps) {
  return (
    <div className="section-state section-state--loading" role="status">
      <span className="section-state__spinner" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  children?: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="section-state section-state--empty">
      <p className="section-state__title">{title}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  children?: ReactNode;
  /** Shows a retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title, children, onRetry, retryLabel = 'Reintentar' }: ErrorStateProps) {
  return (
    <div className="section-state section-state--error" role="alert">
      <p className="section-state__title">{title}</p>
      {children ? <p>{children}</p> : null}
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
