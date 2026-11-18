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
      <ExternalLink href={dexscreenerUrl(mint)} aria-label={`Abrir ${symbol} en DexScreener (pestaña nueva)`}>
        DexScreener
      </ExternalLink>
      <ExternalLink href={pumpFunUrl(mint)} aria-label={`Abrir ${symbol} en pump.fun (pestaña nueva)`}>
        pump.fun
      </ExternalLink>
    </span>
  );
}
