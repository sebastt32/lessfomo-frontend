import type { ReactNode } from 'react';
import { Wordmark } from '../atoms/Wordmark';
import './LoginTemplate.css';

export interface LoginTemplateProps {
  /** Top-right corner, e.g. the color theme toggle. */
  tools?: ReactNode;
  /** The sign-in form, or the state of the session check. */
  children: ReactNode;
  /** Small print under the content. */
  footnote?: ReactNode;
}

/** Full-screen page shown before anybody is signed in: brand, one column of content. */
export function LoginTemplate({ tools, children, footnote }: LoginTemplateProps) {
  return (
    <div className="login-page">
      {tools ? <div className="login-page__tools">{tools}</div> : null}
      <main className="login-page__main">
        <header className="login-page__brand">
          <Wordmark />
          <p className="login-page__tagline">Live pump.fun screener for Solana, built on free data.</p>
        </header>
        {children}
        {footnote ? <p className="login-page__footnote">{footnote}</p> : null}
      </main>
    </div>
  );
}
