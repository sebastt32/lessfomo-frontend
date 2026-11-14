import { ExternalLink } from '../atoms/ExternalLink';
import { dexscreenerUrl, pumpFunUrl } from '../../lib/links';
import './TokenLinks.css';

export interface TokenLinksProps {
  mint: string;
  symbol: string;
}

export function TokenLinks({ mint, symbol }: TokenLinksProps) {
  return (
    <span className="token-links">
      <ExternalLink href={dexscreenerUrl(mint)} aria-label={`Open ${symbol} on DexScreener (new tab)`}>
        DexScreener
      </ExternalLink>
      <ExternalLink href={pumpFunUrl(mint)} aria-label={`Open ${symbol} on pump.fun (new tab)`}>
        pump.fun
      </ExternalLink>
    </span>
  );
}
