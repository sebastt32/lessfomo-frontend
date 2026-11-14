import type { ConnectionState } from '../../api/stream';
import type { Sources } from '../../api/types';
import { ConnectionIndicator } from '../molecules/ConnectionIndicator';
import { SourceStatusList } from '../molecules/SourceStatusList';
import './AppHeader.css';

export interface AppHeaderProps {
  connection: ConnectionState;
  sources: Sources | null;
  tokensDetected: number;
}

export function AppHeader({ connection, sources, tokensDetected }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__wordmark">lessfomo</h1>
        <p className="app-header__tagline">Live pump.fun screener for Solana, built on free data.</p>
      </div>
      <div className="app-header__status">
        <ConnectionIndicator state={connection} />
        <SourceStatusList sources={sources} />
        {tokensDetected > 0 ? (
          <p className="app-header__count">
            {tokensDetected === 1 ? '1 new token' : `${tokensDetected} new tokens`} since you opened this page
          </p>
        ) : null}
      </div>
    </header>
  );
}
