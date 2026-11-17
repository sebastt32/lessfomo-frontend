import type { ReactNode } from 'react';
import './HistoryTemplate.css';

export interface HistoryTemplateProps {
  header: ReactNode;
  notice?: ReactNode;
  list: ReactNode;
  /** Token detail; shown beside the list on wide screens, under it on narrow ones. */
  detail?: ReactNode;
  footer: ReactNode;
  /** Target and text of the skip link; defaults to the token history panel. */
  skipLink?: { href: string; label: string };
}

const HISTORY_SKIP_LINK = { href: '#history', label: 'Skip to token history' };

export function HistoryTemplate({ header, notice, list, detail, footer, skipLink = HISTORY_SKIP_LINK }: HistoryTemplateProps) {
  return (
    <div className="history-page">
      <a className="skip-link" href={skipLink.href}>
        {skipLink.label}
      </a>
      {header}
      <main className={detail ? 'history-page__main history-page__main--with-detail' : 'history-page__main'}>
        {notice ? <div className="history-page__notice">{notice}</div> : null}
        <div className="history-page__list">{list}</div>
        {detail ? <div className="history-page__detail">{detail}</div> : null}
      </main>
      <footer className="history-page__footer">{footer}</footer>
    </div>
  );
}
