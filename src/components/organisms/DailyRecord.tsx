import { useId } from 'react';
import type { DailyRecordData } from '../../hooks/useDailyRecord';
import { formatMultiple } from '../../lib/cycle';
import { OUTCOME_HINTS, OUTCOME_LABELS, recordOutcome, type SuccessSummary } from '../../lib/dailyRecord';
import { formatPercent, formatTimeWithSeconds } from '../../lib/format';
import { HelpTip } from '../molecules/HelpTip';
import { MoneyValue } from '../molecules/MoneyValue';
import { TokenName } from '../molecules/TokenName';
import { marketCapSol } from '../../lib/money';
import './DailyRecord.css';
import './DataTable.css';

export interface DailyRecordProps {
  /** "17 de noviembre de 2026". */
  dayLabel: string;
  /** "noviembre de 2026". */
  monthLabel: string;
  data: DailyRecordData;
  /** Reference time (ms since epoch): tokens younger than 24 hours are still tracked. */
  now: number;
  onSelect: (mint: string) => void;
  /** table on wide screens; cards with the essentials on small ones. */
  layout?: 'table' | 'cards';
}

const tokenCount = (count: number) => `${count} ${count === 1 ? 'token' : 'tokens'}`;

const SUCCESS_HELP =
  'Un token tiene éxito si su precio llegó a 2× (el doble) del que tenía cuando apareció en lessfomo, en cualquier momento después de aparecer.';

interface SuccessCardProps {
  title: string;
  summary: SuccessSummary;
  note?: string | undefined;
}

function SuccessCard({ title, summary, note }: SuccessCardProps) {
  const titleId = useId();
  return (
    <div className="daily-record__card" role="group" aria-labelledby={titleId}>
      <div className="daily-record__card-head">
        <p id={titleId} className="daily-record__card-title">
          {title}
        </p>
        <HelpTip topic="el éxito">{SUCCESS_HELP}</HelpTip>
      </div>
      <p className="daily-record__pct">{formatPercent(summary.pct)}</p>
      <p className="daily-record__count">
        {summary.tokens === 1
          ? `${summary.hits} de 1 token llegó a 2× después de aparecer`
          : `${summary.hits} de ${summary.tokens} tokens llegaron a 2× después de aparecer`}
      </p>
      {note ? <p className="daily-record__note">{note}</p> : null}
    </div>
  );
}

/** One day of tokens that appeared in lessfomo, what each one did next, and the day's and month's success. */
export function DailyRecord({ dayLabel, monthLabel, data, now, onSelect, layout = 'table' }: DailyRecordProps) {
  const outcomes = data.tokens.map((item) => recordOutcome(item.cycle, now));
  const tracking = outcomes.filter((outcome) => outcome === 'tracking').length;
  const trackingNote =
    tracking === 0
      ? undefined
      : `${tokenCount(tracking)} todavía ${tracking === 1 ? 'está' : 'están'} en seguimiento, así que este porcentaje todavía puede subir.`;

  return (
    <div className="daily-record">
      <div className="daily-record__cards">
        <SuccessCard title={`Éxito el ${dayLabel}`} summary={data.day} note={trackingNote} />
        <SuccessCard title={`Éxito en ${monthLabel}`} summary={data.month} />
      </div>
      <p className="daily-record__definition">
        Éxito significa que el precio llegó al menos al doble del que tenía cuando el token apareció en lessfomo. Se
        cuentan todos los tokens que aparecieron, también los que no llegaron. Los resultados pasados no predicen los
        futuros.
      </p>

      {data.tokens.length === 0 ? (
        <p className="daily-record__empty">Ningún token apareció en lessfomo este día.</p>
      ) : layout === 'cards' ? (
        <ul className="record-cards" aria-label={`Tokens del ${dayLabel}`}>
          {data.tokens.map((item, index) => {
            const { token, cycle } = item;
            const outcome = outcomes[index]!;
            return (
              <li key={token.mint} className="record-card">
                <button
                  type="button"
                  className="record-card__button"
                  aria-label={`Ver detalle de ${token.symbol || token.mint}`}
                  onClick={() => onSelect(token.mint)}
                >
                  <span className="record-card__top">
                    <TokenName symbol={token.symbol} name={token.name} />
                    <span className={`daily-record__outcome daily-record__outcome--${outcome}`} title={OUTCOME_HINTS[outcome]}>
                      {OUTCOME_LABELS[outcome]}
                    </span>
                  </span>
                  <span className="record-card__facts">
                    <span>
                      <span className="record-card__label">Apareció</span>
                      {cycle ? formatTimeWithSeconds(cycle.appearedAt) : '—'}
                    </span>
                    <span>
                      <span className="record-card__label">Al aparecer</span>
                      <MoneyValue sol={marketCapSol(cycle?.appearedPriceSol)} layout="inline" />
                    </span>
                    <span>
                      <span className="record-card__label">Pico</span>
                      {formatMultiple(cycle?.peakX)}
                    </span>
                    <span>
                      <span className="record-card__label">Último</span>
                      {formatMultiple(cycle?.lastPriceX)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="history-table__scroll" tabIndex={0} role="region" aria-label={`Tokens del ${dayLabel}`}>
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Apareció</th>
                <th scope="col">Token</th>
                <th scope="col" className="history-table__num">
                  Market cap al aparecer
                  <HelpTip topic="el market cap al aparecer">
                    Lo que valían todos los tokens juntos cuando el token apareció en lessfomo.
                  </HelpTip>
                </th>
                <th scope="col" className="history-table__num">
                  Pico
                  <HelpTip topic="el pico">
                    El precio más alto después de llegar a 2×, como múltiplo del precio al aparecer. Queda vacío si no
                    llegó a 2×.
                  </HelpTip>
                </th>
                <th scope="col" className="history-table__num">
                  Último
                  <HelpTip topic="el último precio">
                    El último precio conocido, como múltiplo del precio al aparecer (1× es el mismo precio).
                  </HelpTip>
                </th>
                <th scope="col">
                  Resultado
                  <HelpTip topic="el resultado">
                    Llegó a 2× si en algún momento duplicó su precio al aparecer. En seguimiento si apareció hace menos de
                    24 horas y todavía no llegó. No llegó si pasaron 24 horas sin llegar.
                  </HelpTip>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.tokens.map((item, index) => {
                const { token, cycle } = item;
                const outcome = outcomes[index]!;
                return (
                  <tr key={token.mint} className="history-table__row" onClick={() => onSelect(token.mint)}>
                    <td className="history-table__muted">
                      {cycle ? (
                        <time dateTime={cycle.appearedAt} title={cycle.appearedAt}>
                          {formatTimeWithSeconds(cycle.appearedAt)}
                        </time>
                      ) : (
                        '—'
                      )}
                    </td>
                    <th scope="row" className="history-table__token">
                      <button
                        type="button"
                        className="token-button"
                        aria-label={`Ver detalle de ${token.symbol || token.mint}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(token.mint);
                        }}
                      >
                        <TokenName symbol={token.symbol} name={token.name} />
                      </button>
                    </th>
                    <td className="history-table__num">
                      <MoneyValue sol={marketCapSol(cycle?.appearedPriceSol)} />
                    </td>
                    <td className="history-table__num">{formatMultiple(cycle?.peakX)}</td>
                    <td className="history-table__num">{formatMultiple(cycle?.lastPriceX)}</td>
                    <td>
                      <span className={`daily-record__outcome daily-record__outcome--${outcome}`} title={OUTCOME_HINTS[outcome]}>
                        {OUTCOME_LABELS[outcome]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
