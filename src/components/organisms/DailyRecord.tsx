import { useId } from 'react';
import type { DailyRecordData } from '../../hooks/useDailyRecord';
import { formatMultiple } from '../../lib/cycle';
import { OUTCOME_HINTS, OUTCOME_LABELS, recordOutcome, type SuccessSummary } from '../../lib/dailyRecord';
import { formatPercent, formatTimeWithSeconds } from '../../lib/format';
import { MoneyValue } from '../molecules/MoneyValue';
import { TokenName } from '../molecules/TokenName';
import { marketCapSol } from '../../lib/money';
import './DailyRecord.css';
import './TokenHistoryTable.css';

export interface DailyRecordProps {
  /** "November 17, 2026". */
  dayLabel: string;
  /** "November 2026". */
  monthLabel: string;
  data: DailyRecordData;
  /** Reference time (ms since epoch): tokens younger than 24 hours are still tracked. */
  now: number;
  onSelect: (mint: string) => void;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

interface SuccessCardProps {
  title: string;
  summary: SuccessSummary;
  note?: string | undefined;
}

function SuccessCard({ title, summary, note }: SuccessCardProps) {
  const titleId = useId();
  return (
    <div className="daily-record__card" role="group" aria-labelledby={titleId}>
      <p id={titleId} className="daily-record__card-title">
        {title}
      </p>
      <p className="daily-record__pct">{formatPercent(summary.pct)}</p>
      <p className="daily-record__count">
        {summary.hits} of {plural(summary.tokens, 'token')} reached 2× after appearing
      </p>
      {note ? <p className="daily-record__note">{note}</p> : null}
    </div>
  );
}

/** One day of tokens that appeared in lessfomo, what each one did next, and the day's and month's success. */
export function DailyRecord({ dayLabel, monthLabel, data, now, onSelect }: DailyRecordProps) {
  const outcomes = data.tokens.map((item) => recordOutcome(item.cycle, now));
  const tracking = outcomes.filter((outcome) => outcome === 'tracking').length;
  const trackingNote =
    tracking === 0
      ? undefined
      : `${plural(tracking, 'token')} ${tracking === 1 ? 'is' : 'are'} still being tracked, so this share can still go up.`;

  return (
    <div className="daily-record">
      <div className="daily-record__cards">
        <SuccessCard title={`Success on ${dayLabel}`} summary={data.day} note={trackingNote} />
        <SuccessCard title={`Success in ${monthLabel}`} summary={data.month} />
      </div>
      <p className="daily-record__definition">
        Success means the price reached at least twice what it was when the token appeared in lessfomo. Every
        token that appeared is counted, the ones that failed included. Past results do not predict future ones.
      </p>

      {data.tokens.length === 0 ? (
        <p className="daily-record__empty">No token appeared in lessfomo on this day.</p>
      ) : (
        <div className="history-table__scroll" tabIndex={0} role="region" aria-label={`Tokens of ${dayLabel}`}>
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Appeared</th>
                <th scope="col">Token</th>
                <th scope="col" className="history-table__num" title="Market cap when the token appeared in lessfomo">
                  Entry market cap
                </th>
                <th scope="col" className="history-table__num" title="Highest price after the 2×, over the appearance price">
                  Peak
                </th>
                <th scope="col" className="history-table__num" title="Last known price, over the appearance price">
                  Last
                </th>
                <th scope="col">Result</th>
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
                        aria-label={`Show details for ${token.symbol || token.mint}`}
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
