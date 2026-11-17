import type { ReactNode } from 'react';
import './HistoryTemplate.css';

export interface HistoryTemplateProps {
  header: ReactNode;
  notice?: ReactNode;
  /** The page's content, full width: a list, panels or one token. */
  list: ReactNode;
  footer: ReactNode;
  /** Target and text of the skip link; defaults to the token history panel. */
  skipLink?: { href: string; label: string };
}

const HISTORY_SKIP_LINK = { href: '#history', label: 'Skip to token history' };

/** Header, notices and one full-width column: the history list, the insights panels or a token's own view. */
export function HistoryTemplate({ header, notice, list, footer, skipLink = HISTORY_SKIP_LINK }: HistoryTemplateProps) {
  return (
    <div className="history-page">
      <a className="skip-link" href={skipLink.href}>
        {skipLink.label}
      </a>
      {header}
      <main className="history-page__main">
        {notice ? <div className="history-page__notice">{notice}</div> : null}
        <div className="history-page__list">{list}</div>
      </main>
      <footer className="history-page__footer">{footer}</footer>
    </div>
  );
}
