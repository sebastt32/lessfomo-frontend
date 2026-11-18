import { useId, useState, type ReactNode } from 'react';
import type { SmartWalletInToken } from '../../api/types';
import { CopyButton } from '../atoms/CopyButton';
import { ExternalLink } from '../atoms/ExternalLink';
import { BotBadge, WalletStyleBadge, WalletTierBadge } from '../atoms/Tag';
import { formatSolAmount, shortenMint } from '../../lib/format';
import { solscanAccountUrl } from '../../lib/links';
import { describeWalletRecord, formatEntrySeconds } from '../../lib/smartWallets';
import { formatUsdCompact, solToUsd } from '../../lib/money';
import { useSolUsd } from '../../state/solUsd';
import './SmartWallets.css';

export interface SmartWalletItemProps {
  wallet: SmartWalletInToken;
  /** The wallet's recent results; mounted only while expanded so it can load on demand. */
  children?: ReactNode;
}

/** "$120 (0.80 SOL)", or the SOL amount alone while the SOL/USD price is unknown. */
function money(sol: number, solUsd: number | null): string {
  const usd = solToUsd(sol, solUsd);
  return usd === null ? formatSolAmount(sol) : `${formatUsdCompact(usd)} (${formatSolAmount(sol)})`;
}

function tradeSummary(wallet: SmartWalletInToken, solUsd: number | null): string {
  const bought = `Compró ${money(wallet.boughtSol, solUsd)} ${formatEntrySeconds(wallet.entrySeconds)} después del lanzamiento`;
  if (wallet.stillHolding) {
    return wallet.soldSol > 0
      ? `${bought}, vendió ${money(wallet.soldSol, solUsd)}, todavía lo tiene`
      : `${bought}, todavía lo tiene`;
  }
  return `${bought}, vendió ${money(wallet.soldSol, solUsd)}, ya no lo tiene`;
}

/** One good-history wallet in a token: who it is, what it did here, how it trades and why its record is good. */
export function SmartWalletItem({ wallet, children }: SmartWalletItemProps) {
  const [open, setOpen] = useState(false);
  const resultsId = useId();
  const solUsd = useSolUsd();
  const { record } = wallet;

  return (
    <li className="smart-wallet">
      <div className="smart-wallet__top">
        <span className="smart-wallet__address" title={wallet.address}>
          {shortenMint(wallet.address)}
        </span>
        <CopyButton value={wallet.address} label={`Copiar la dirección de la wallet ${wallet.address}`} />
        <ExternalLink
          href={solscanAccountUrl(wallet.address)}
          className="smart-wallet__link"
          aria-label={`Abrir la wallet ${shortenMint(wallet.address)} en Solscan (pestaña nueva)`}
        >
          Solscan
        </ExternalLink>
        <span className="smart-wallet__badges">
          <WalletTierBadge tier={wallet.tierAtEntry} prefix="Al comprar" />
          <WalletTierBadge tier={record.tier} prefix="Ahora" />
          {wallet.styleAtEntry ? <WalletStyleBadge style={wallet.styleAtEntry} prefix="Estilo al comprar" /> : null}
          {record.style ? <WalletStyleBadge style={record.style} prefix="Estilo ahora" /> : null}
          {record.isBot ? <BotBadge /> : null}
        </span>
      </div>
      <p className="smart-wallet__trade">
        <span className={wallet.stillHolding ? 'smart-wallet__holding' : 'smart-wallet__sold'}>
          {wallet.stillHolding ? 'Lo tiene' : 'Vendió'}
        </span>{' '}
        {tradeSummary(wallet, solUsd)}.
      </p>
      <p className="smart-wallet__why">
        <span className="smart-wallet__why-label">Por qué tiene buen historial: </span>
        {describeWalletRecord(record)}.
      </p>
      <button
        type="button"
        className="button button--quiet button--small smart-wallet__toggle"
        aria-expanded={open}
        aria-controls={resultsId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Ocultar resultados recientes' : 'Ver resultados recientes'}
      </button>
      <div id={resultsId} hidden={!open}>
        {open ? children : null}
      </div>
    </li>
  );
}
