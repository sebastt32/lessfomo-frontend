import type { TokenSnapshot } from '../../api/types';
import { DateTime } from '../atoms/DateTime';
import { HelpTip } from '../molecules/HelpTip';
import { LiquidityCell } from '../molecules/Liquidity';
import { formatCount, formatPercent } from '../../lib/format';
import { MoneyValue } from '../molecules/MoneyValue';
import { describeMilestone, isEventMilestone } from '../../lib/milestones';
import './TokenSnapshots.css';

export interface TokenSnapshotsProps {
  /** Oldest first, as the API returns them. */
  snapshots: readonly TokenSnapshot[];
  symbol: string;
}

const SOURCE_LABELS: Record<TokenSnapshot['source'], string> = {
  trades: 'Operaciones',
  dexscreener: 'DexScreener',
  rugcheck: 'RugCheck',
  mixed: 'Mixta',
};

const pair = (a: number | null, b: number | null) =>
  a === null && b === null ? '—' : `${formatCount(a)} / ${formatCount(b)}`;

/** The token's state at each milestone (creation, 5 min, 1 h, day 3, migration, ...), oldest first. */
export function TokenSnapshots({ snapshots, symbol }: TokenSnapshotsProps) {
  return (
    <div className="token-snapshots" role="region" aria-label={`Registros de ${symbol}`} tabIndex={0}>
      <table className="token-snapshots__table">
        <caption className="visually-hidden">
          Estado de {symbol} en cada registro, del más viejo al más nuevo. El volumen, las compras, las ventas y los
          compradores cuentan desde el registro anterior.
        </caption>
        <thead>
          <tr>
            <th scope="col">Momento</th>
            <th scope="col">Guardado</th>
            <th scope="col" className="token-snapshots__num">
              Market cap
            </th>
            <th scope="col" className="token-snapshots__num">
              Volumen
            </th>
            <th scope="col" className="token-snapshots__num">
              Compras / ventas
            </th>
            <th scope="col" className="token-snapshots__num">
              Compradores
            </th>
            <th scope="col" className="token-snapshots__num">
              Holders
            </th>
            <th scope="col" className="token-snapshots__num">
              Top 10{' '}
              <HelpTip topic="el Top 10">
                Qué parte del total tienen las 10 wallets con más tokens. Si es alta, pocas wallets pueden hacer caer el
                precio.
              </HelpTip>
            </th>
            <th scope="col" className="token-snapshots__num">
              Creador{' '}
              <HelpTip topic="la columna Creador">Qué parte del total tiene todavía el creador del token.</HelpTip>
            </th>
            <th scope="col" className="token-snapshots__num">
              Liquidez
            </th>
            <th scope="col">Fuente</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={`${snapshot.milestone}|${snapshot.at}`}>
              <th
                scope="row"
                className={
                  isEventMilestone(snapshot.milestone)
                    ? 'token-snapshots__milestone token-snapshots__milestone--event'
                    : 'token-snapshots__milestone'
                }
              >
                {describeMilestone(snapshot.milestone)}
              </th>
              <td>
                <DateTime iso={snapshot.at} layout="stacked" />
              </td>
              <td className="token-snapshots__num">
                <MoneyValue sol={snapshot.marketCapSol} />
              </td>
              <td className="token-snapshots__num">
                <MoneyValue sol={snapshot.volumeSol} />
              </td>
              <td className="token-snapshots__num">{pair(snapshot.buys, snapshot.sells)}</td>
              <td className="token-snapshots__num">{formatCount(snapshot.uniqueBuyers)}</td>
              <td className="token-snapshots__num">{formatCount(snapshot.holders)}</td>
              <td className="token-snapshots__num">{formatPercent(snapshot.top10Pct)}</td>
              <td className="token-snapshots__num">{formatPercent(snapshot.devHoldsPct)}</td>
              <td className="token-snapshots__num">
                <LiquidityCell liquidity={snapshot.liquidity} />
              </td>
              <td className="token-snapshots__source">{SOURCE_LABELS[snapshot.source] ?? snapshot.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
