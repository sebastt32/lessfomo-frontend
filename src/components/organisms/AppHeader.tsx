import type { ConnectionState } from '../../api/stream';
import type { ReactNode } from 'react';
import type { Sources } from '../../api/types';
import { Wordmark } from '../atoms/Wordmark';
import { ConnectionIndicator } from '../molecules/ConnectionIndicator';
import { SourceStatusList } from '../molecules/SourceStatusList';
import './AppHeader.css';

export interface AppHeaderProps {
  connection: ConnectionState;
  sources: Sources | null;
  tokensDetected: number;
  /** Full-width row under the brand, e.g. view navigation and totals. */
  extras?: ReactNode;
}

export function AppHeader({ connection, sources, tokensDetected, extras }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Wordmark />
        <p className="app-header__tagline">Screener en vivo de tokens de pump.fun en Solana, con datos gratuitos.</p>
      </div>
      <div className="app-header__status">
        <ConnectionIndicator state={connection} />
        <SourceStatusList sources={sources} />
        {tokensDetected > 0 ? (
          <p className="app-header__count">
            {tokensDetected === 1 ? '1 token nuevo' : `${tokensDetected} tokens nuevos`} desde que abriste esta página
          </p>
        ) : null}
      </div>
      {extras ? <div className="app-header__extras">{extras}</div> : null}
    </header>
  );
}
