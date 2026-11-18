import type { WalletTokenResult } from '../../api/types';
import { formatRelativeTime, shortenMint } from '../../lib/format';
import { MoneyValue } from '../molecules/MoneyValue';
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
    return <p className="smart-wallets__note">Esta wallet no cerró ningún token en los últimos 7 días.</p>;
  }
  const shown = results.slice(0, limit);
  return (
    <div className="wallet-results">
      <div className="wallet-results__scroll" role="region" aria-label="Resultados recientes" tabIndex={0}>
        <table className="wallet-results__table">
          <caption className="visually-hidden">Los tokens cerrados más recientes de la wallet, del más nuevo al más viejo</caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col" className="wallet-results__num">
                Compró después de
              </th>
              <th scope="col" className="wallet-results__num">
                Puso
              </th>
              <th scope="col" className="wallet-results__num">
                Sacó
              </th>
              <th scope="col" className="wallet-results__num">
                Resultado
              </th>
              <th scope="col">Cerrado</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((result) => (
              <tr key={`${result.mint}|${result.firstBuyAt}`}>
                <th scope="row" title={result.name || result.mint}>
                  {result.symbol || shortenMint(result.mint)}
                </th>
                <td className="wallet-results__num">{formatEntrySeconds(result.entrySeconds)}</td>
                <td className="wallet-results__num">
                  <MoneyValue sol={result.boughtSol} />
                </td>
                <td className="wallet-results__num">
                  <MoneyValue sol={result.soldSol} />
                </td>
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
          Mostrando los {shown.length} más recientes de {results.length} tokens cerrados.
        </p>
      ) : null}
    </div>
  );
}
