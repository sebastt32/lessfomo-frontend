import type { ReactNode } from 'react';
import './DashboardTemplate.css';

export interface DashboardTemplateProps {
  header: ReactNode;
  /** Page-wide notices such as the offline banner. */
  notice?: ReactNode;
  movers: ReactNode;
  feed: ReactNode;
  footer: ReactNode;
}

export function DashboardTemplate({ header, notice, movers, feed, footer }: DashboardTemplateProps) {
  return (
    <div className="dashboard">
      <a className="skip-link" href="#movers">
        Saltar a Más activos ahora
      </a>
      {header}
      <main className="dashboard__main">
        {notice ? <div className="dashboard__notice">{notice}</div> : null}
        <div className="dashboard__primary">{movers}</div>
        <div className="dashboard__secondary">{feed}</div>
      </main>
      <footer className="dashboard__footer">{footer}</footer>
    </div>
  );
}
