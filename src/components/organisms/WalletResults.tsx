import type { WalletTokenResult } from '../../api/types';
import { formatRelativeTime, formatSolAmount, shortenMint } from '../../lib/format';
import { formatEntrySeconds, formatSignedSol } from '../../lib/smartWallets';
import './SmartWallets.css';

export interface WalletResultsProps {
  results: readonly WalletTokenResult[];
  now: number;
  /** Rows shown; the rest are summarized. */
  limit?: number;
}

/** A wallet's recent closed tokens: when it bought, what it put in and took out, and the result. */
export function WalletResults({ results, now, limit = 10 }: WalletResultsProps) {
  if (results.length === 0) {
    return <p className="smart-wallets__note">No closed tokens for this wallet in the last 7 days.</p>;
  }
  const shown = results.slice(0, limit);
  return (
    <div className="wallet-results">
      <div className="wallet-results__scroll" role="region" aria-label="Recent results" tabIndex={0}>
        <table className="wallet-results__table">
          <caption className="visually-hidden">The wallet's most recent closed tokens, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col" className="wallet-results__num">
                Bought after
              </th>
              <th scope="col" className="wallet-results__num">
                In
              </th>
              <th scope="col" className="wallet-results__num">
                Out
              </th>
              <th scope="col" className="wallet-results__num">
                Result
              </th>
              <th scope="col">Closed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((result) => (
              <tr key={`${result.mint}|${result.firstBuyAt}`}>
                <th scope="row" title={result.name || result.mint}>
                  {result.symbol || shortenMint(result.mint)}
                </th>
                <td className="wallet-results__num">{formatEntrySeconds(result.entrySeconds)}</td>
                <td className="wallet-results__num">{formatSolAmount(result.boughtSol)}</td>
                <td className="wallet-results__num">{formatSolAmount(result.soldSol)}</td>
                <td
                  className={`wallet-results__num ${result.pnlSol > 0 ? 'wallet-results__win' : result.pnlSol < 0 ? 'wallet-results__loss' : ''}`}
                >
                  {formatSignedSol(result.pnlSol)}
                </td>
                <td>
                  <time dateTime={result.closedAt} title={result.closedAt}>
                    {formatRelativeTime(result.closedAt, now)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {results.length > shown.length ? (
        <p className="smart-wallets__note">
          Showing the {shown.length} most recent of {results.length} closed tokens.
        </p>
      ) : null}
    </div>
  );
}
