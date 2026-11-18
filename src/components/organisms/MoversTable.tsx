import type { MouseEvent } from 'react';
import type { Mover } from '../../api/types';
import { PriceDelta } from '../atoms/PriceDelta';
import { ScoreBar } from '../atoms/ScoreBar';
import { DateTime } from '../atoms/DateTime';
import { StatusBadge } from '../atoms/StatusBadge';
import { CycleCell } from '../molecules/CycleCell';
import { HelpTip } from '../molecules/HelpTip';
import { LiquidityCell } from '../molecules/Liquidity';
import { MoneyValue } from '../molecules/MoneyValue';
import { marketCapSol } from '../../lib/money';
import { SmartWalletCount } from '../molecules/SmartWalletCount';
import { TokenLinks } from '../molecules/TokenLinks';
import { TokenName } from '../molecules/TokenName';
import { formatComponent, formatCount } from '../../lib/format';
import './MoversTable.css';

export interface MoversTableProps {
  movers: readonly Mover[];
  /** The token shown as selected; omit it when selecting opens the token's own view. */
  selectedMint?: string | null;
  onSelect: (mint: string) => void;
  /** Reference time (ms since epoch) for the cycle of tokens that are still stable. */
  now?: number;
}

export function MoversTable({ movers, selectedMint, onSelect, now = Date.now() }: MoversTableProps) {
  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, mint: string) {
    // Links open their own page; the token button already bubbles a click here.
    if ((event.target as Element).closest('a')) return;
    onSelect(mint);
  }

  return (
    <div className="movers-table__scroll" role="region" aria-label="Tabla de más activos ahora" tabIndex={0}>
      <table className="movers-table">
        <caption className="visually-hidden">Más activos ahora, ordenados por impulso, de mayor a menor</caption>
        <thead>
          <tr>
            <th scope="col" className="movers-table__rank">
              #
            </th>
            <th scope="col">Token</th>
            <th scope="col" className="movers-table__num">
              Market cap
              <HelpTip topic="el market cap">
                Lo que valen todos los tokens juntos al precio actual. En dólares, con el valor en SOL debajo.
              </HelpTip>
            </th>
            <th scope="col">Creado</th>
            <th scope="col">
              Impulso
              <HelpTip topic="el impulso">
                Un puntaje de 0 a 100 que mide qué tan rápido crecen los compradores nuevos y el volumen de compra en
                los últimos minutos.
              </HelpTip>
            </th>
            <th scope="col">
              Ciclo
              <HelpTip topic="el ciclo">
                El camino del token después de aparecer en lessfomo: estable, se duplica (2× el precio al aparecer),
                pico y caída. Debajo, el tiempo para comprar antes de la subida fuerte.
              </HelpTip>
            </th>
            <th scope="col" className="movers-table__num">
              Wallets que mantienen
              <HelpTip topic="una wallet que mantiene">
                Una wallet con buen historial en los últimos 7 días que suele quedarse con lo que compra, en vez de
                venderlo en menos de 2 minutos. Debajo: cuántas wallets con buen historial lo compraron y cuántas
                todavía lo tienen.
              </HelpTip>
            </th>
            <th scope="col" className="movers-table__num">
              Compradores 1 min / 5 min
              <HelpTip topic="el conteo de compradores">
                Cuántas wallets distintas compraron en el último minuto y en los últimos 5 minutos.
              </HelpTip>
            </th>
            <th scope="col" className="movers-table__num">
              Aceleración
              <HelpTip topic="la aceleración">
                Si las compras llegan cada vez más rápido: compara el último minuto con los anteriores. Va de 0 a 1;
                más alto es más rápido.
              </HelpTip>
            </th>
            <th scope="col" className="movers-table__num">
              Presión compradora
              <HelpTip topic="la presión compradora">
                Qué parte del volumen reciente son compras y no ventas. Va de 0 a 1; más alto significa más compras.
              </HelpTip>
            </th>
            <th scope="col" className="movers-table__num">
              Cambio 5 min
              <HelpTip topic="el cambio 5 min">Cuánto cambió el precio en los últimos 5 minutos.</HelpTip>
            </th>
            <th scope="col" className="movers-table__num">
              Liquidez
              <HelpTip topic="la liquidez">
                El dinero disponible en el mercado del token para comprar y vender. Con poca liquidez, una venta grande
                hace caer mucho el precio.
              </HelpTip>
            </th>
            <th scope="col">
              Seguridad
              <HelpTip topic="un control de seguridad">
                Revisa cuánto tienen los 10 mayores holders, cuánto tiene el creador y los permisos del token. Pasarlo
                no significa que el token vaya a subir.
              </HelpTip>
            </th>
            <th scope="col">Enlaces</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((mover, index) => {
            const selected = mover.mint === selectedMint;
            return (
              <tr
                key={mover.mint}
                className={selected ? 'movers-table__row movers-table__row--selected' : 'movers-table__row'}
                onClick={(event) => handleRowClick(event, mover.mint)}
              >
                <td className="movers-table__rank">{index + 1}</td>
                <th scope="row" className="movers-table__token">
                  <button
                    type="button"
                    className="token-button"
                    aria-pressed={selectedMint === undefined ? undefined : selected}
                    aria-label={`Ver detalle de ${mover.symbol}`}
                  >
                    <TokenName symbol={mover.symbol} name={mover.name} />
                  </button>
                </th>
                <td className="movers-table__num">
                  <MoneyValue sol={marketCapSol(mover.metrics.lastPriceSol)} />
                </td>
                <td>
                  <DateTime iso={mover.detectedAt} layout="stacked" />
                </td>
                <td>
                  <ScoreBar score={mover.score} />
                </td>
                <td>
                  <CycleCell cycle={mover.cycle} now={now} />
                </td>
                <td className="movers-table__num">
                  <SmartWalletCount counts={mover.smartWallets} />
                </td>
                <td className="movers-table__num">
                  {formatCount(mover.metrics.uniqueBuyers1m)} / {formatCount(mover.metrics.uniqueBuyers5m)}
                </td>
                <td className="movers-table__num">{formatComponent(mover.components.acceleration)}</td>
                <td className="movers-table__num">{formatComponent(mover.components.buyPressure)}</td>
                <td className="movers-table__num">
                  <PriceDelta value={mover.metrics.priceChange5mPct} />
                </td>
                <td className="movers-table__num">
                  <LiquidityCell liquidity={mover.liquidity} />
                </td>
                <td>
                  <StatusBadge status={mover.status} />
                </td>
                <td>
                  <TokenLinks mint={mover.mint} symbol={mover.symbol} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
