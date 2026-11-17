import type { ReactNode } from 'react';
import { LoginTemplate } from '../components/templates/LoginTemplate';
import { LoginContainer } from '../containers/LoginContainer';
import { ThemeToggleContainer } from '../containers/ThemeToggleContainer';

/** The sign-in page. It never reads or changes the URL, so a shared link still opens its view after signing in. */
export function LoginPage() {
  return (
    <SessionPage footnote="There is no public sign-up. Accounts are created by the administrator.">
      <LoginContainer />
    </SessionPage>
  );
}

export interface SessionPageProps {
  children: ReactNode;
  footnote?: ReactNode;
}

/** The frame shared by the sign-in page and the session-check states, with the color theme toggle. */
export function SessionPage({ children, footnote }: SessionPageProps) {
  return (
    <LoginTemplate tools={<ThemeToggleContainer />} footnote={footnote}>
      {children}
    </LoginTemplate>
  );
}
