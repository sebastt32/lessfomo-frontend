import type { ReactNode } from 'react';
import './DashboardTemplate.css';

export interface DashboardTemplateProps {
  header: ReactNode;
  /** Page-wide notices such as the offline banner. */
  notice?: ReactNode;
  movers: ReactNode;
  /** Token detail; rendered above the feed when present. */
  detail?: ReactNode;
  feed: ReactNode;
  footer: ReactNode;
}

export function DashboardTemplate({ header, notice, movers, detail, feed, footer }: DashboardTemplateProps) {
  return (
    <div className="dashboard">
      <a className="skip-link" href="#movers">
        Skip to top movers
      </a>
      {header}
      <main className="dashboard__main">
        {notice ? <div className="dashboard__notice">{notice}</div> : null}
        <div className="dashboard__primary">{movers}</div>
        <div className="dashboard__secondary">
          {detail}
          {feed}
        </div>
      </main>
      <footer className="dashboard__footer">{footer}</footer>
    </div>
  );
}
