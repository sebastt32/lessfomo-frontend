import type { ReactNode } from 'react';
import { BackLink } from '../molecules/BackLink';
import './TokenView.css';

export const TOKEN_VIEW_ID = 'token';
export const TOKEN_VIEW_TITLE_ID = 'token-title';

export interface TokenViewProps {
  /** Where "Back" goes: the list the reader came from. */
  back: { href: string; label: string };
  onBack: () => void;
  /** The page heading: the token's symbol. */
  title: string;
  /** The token's full name, next to the heading. */
  subtitle?: string | undefined;
  /** The large price chart. */
  chart?: ReactNode;
  /** The cycle summary, beside the chart on wide screens. */
  cycle?: ReactNode;
  /** Everything else known about the token, under the chart. */
  details?: ReactNode;
  /** Loading, not-found and error messages, instead of the sections above. */
  children?: ReactNode;
}

/** One token as its own page: back link, heading, large chart with the cycle beside it, details below. */
export function TokenView({ back, onBack, title, subtitle, chart, cycle, details, children }: TokenViewProps) {
  return (
    <article id={TOKEN_VIEW_ID} className="token-view" aria-labelledby={TOKEN_VIEW_TITLE_ID}>
      <nav className="token-view__back" aria-label="Volver">
        <BackLink href={back.href} onNavigate={onBack}>
          {back.label}
        </BackLink>
      </nav>
      <header className="token-view__header">
        <h1 id={TOKEN_VIEW_TITLE_ID} className="token-view__title" tabIndex={-1}>
          {title}
        </h1>
        {subtitle ? <p className="token-view__subtitle">{subtitle}</p> : null}
      </header>

      {children}

      {chart || cycle ? (
        <div className="token-view__stage">
          {chart ? <div className="token-view__chart">{chart}</div> : null}
          {cycle ? <div className="token-view__cycle">{cycle}</div> : null}
        </div>
      ) : null}

      {details ? (
        <section className="token-view__details" aria-labelledby="token-details-title">
          <h2 id="token-details-title" className="token-view__section-title">
            Detalles del token
          </h2>
          {details}
        </section>
      ) : null}
    </article>
  );
}
