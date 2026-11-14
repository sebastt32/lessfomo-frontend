import type { ReactNode } from 'react';
import './Panel.css';

export interface PanelProps {
  /** id used by aria-labelledby; must be unique on the page. */
  id: string;
  title: ReactNode;
  /** Short line under the title. */
  description?: ReactNode;
  /** Controls aligned with the title, e.g. a close button. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ id, title, description, actions, children, className }: PanelProps) {
  const headingId = `${id}-title`;
  return (
    <section className={className ? `panel ${className}` : 'panel'} aria-labelledby={headingId} id={id}>
      <header className="panel__header">
        <div className="panel__heading">
          <h2 id={headingId} className="panel__title" tabIndex={-1}>
            {title}
          </h2>
          {description ? <p className="panel__description">{description}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}
