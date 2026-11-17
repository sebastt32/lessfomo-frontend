import { useId, useState, type ReactNode } from 'react';
import type { SmartWalletInToken } from '../../api/types';
import { CopyButton } from '../atoms/CopyButton';
import { ExternalLink } from '../atoms/ExternalLink';
import { BotBadge, WalletTierBadge } from '../atoms/Tag';
import { formatSolAmount, shortenMint } from '../../lib/format';
import { solscanAccountUrl } from '../../lib/links';
import { describeWalletRecord, formatEntrySeconds } from '../../lib/smartWallets';
import './SmartWallets.css';

export interface SmartWalletItemProps {
  wallet: SmartWalletInToken;
  /** The wallet's recent results; mounted only while expanded so it can load on demand. */
  children?: ReactNode;
}

function tradeSummary(wallet: SmartWalletInToken): string {
  const bought = `Bought ${formatSolAmount(wallet.boughtSol)} ${formatEntrySeconds(wallet.entrySeconds)} after launch`;
  if (wallet.stillHolding) {
    return wallet.soldSol > 0 ? `${bought}, sold ${formatSolAmount(wallet.soldSol)}, still holding` : `${bought}, still holding`;
  }
  return `${bought}, sold ${formatSolAmount(wallet.soldSol)}, no longer holding`;
}

/** One good-history wallet in a token: who it is, what it did here, and why its record is good. */
export function SmartWalletItem({ wallet, children }: SmartWalletItemProps) {
  const [open, setOpen] = useState(false);
  const resultsId = useId();
  const { record } = wallet;

  return (
    <li className="smart-wallet">
      <div className="smart-wallet__top">
        <span className="smart-wallet__address" title={wallet.address}>
          {shortenMint(wallet.address)}
        </span>
        <CopyButton value={wallet.address} label={`Copy wallet address ${wallet.address}`} />
        <ExternalLink
          href={solscanAccountUrl(wallet.address)}
          className="smart-wallet__link"
          aria-label={`Open wallet ${shortenMint(wallet.address)} on Solscan (new tab)`}
        >
          Solscan
        </ExternalLink>
        <span className="smart-wallet__badges">
          <WalletTierBadge tier={wallet.tierAtEntry} prefix="At entry" />
          <WalletTierBadge tier={record.tier} prefix="Now" />
          {record.isBot ? <BotBadge /> : null}
        </span>
      </div>
      <p className="smart-wallet__trade">
        <span className={wallet.stillHolding ? 'smart-wallet__holding' : 'smart-wallet__sold'}>
          {wallet.stillHolding ? 'Holding' : 'Sold'}
        </span>{' '}
        {tradeSummary(wallet)}.
      </p>
      <p className="smart-wallet__why">
        <span className="smart-wallet__why-label">Why it counts as good: </span>
        {describeWalletRecord(record)}.
      </p>
      <button
        type="button"
        className="button button--quiet button--small smart-wallet__toggle"
        aria-expanded={open}
        aria-controls={resultsId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide recent results' : 'Show recent results'}
      </button>
      <div id={resultsId} hidden={!open}>
        {open ? children : null}
      </div>
    </li>
  );
}
