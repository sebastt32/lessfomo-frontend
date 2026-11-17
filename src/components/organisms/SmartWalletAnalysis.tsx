import type { SmartWalletAnalysisResponse } from '../../api/types';
import { DateTime } from '../atoms/DateTime';
import { analysisRows } from '../../lib/smartWallets';
import './SmartWalletAnalysis.css';

export interface SmartWalletAnalysisProps {
  data: SmartWalletAnalysisResponse;
}

/** Buckets with fewer tokens than this are flagged: their percentages swing a lot. */
export const SMALL_SAMPLE = 30;

function signClass(value: number): string {
  if (value > 0) return 'analysis__up';
  if (value < 0) return 'analysis__down';
  return '';
}

/** How success changes with the number of good-history wallets that bought a token. Presentational. */
export function SmartWalletAnalysis({ data }: SmartWalletAnalysisProps) {
  const rows = analysisRows(data.buckets);
  const costPct = `${(data.costRoundTrip * 100).toFixed(1).replace(/\.0$/, '')}%`;

  if (rows.length === 0) {
    return <p className="analysis__note">No token closed its live window in this period yet.</p>;
  }

  return (
    <div className="analysis">
      <p className="analysis__intro">
        Tokens created from <DateTime iso={data.from} /> to <DateTime iso={data.to} />, grouped by how many
        good-history wallets bought them while lessfomo tracked them live. Each simulated trade enters right after the
        last of those wallets bought, then exits at 2× or after 10 minutes, paying a {costPct} round-trip cost.
      </p>

      <div className="analysis__scroll" role="region" aria-label="Success by number of good wallets" tabIndex={0}>
        <table className="analysis__table">
          <caption className="visually-hidden">
            Success rates by number of good-history wallets that bought the token, from none to five or more
          </caption>
          <thead>
            <tr>
              <th scope="col">Good wallets</th>
              <th scope="col" className="analysis__num">
                Tokens
              </th>
              <th scope="col" className="analysis__bar-col">
                Reached 2×
              </th>
              <th scope="col" className="analysis__num">
                vs none
              </th>
              <th scope="col" className="analysis__num">
                Avg return
              </th>
              <th scope="col" className="analysis__num">
                Median return
              </th>
              <th scope="col" className="analysis__num">
                Winners
              </th>
              <th scope="col" className="analysis__num">
                Median peak
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
                  const small = row.tokenCount < SMALL_SAMPLE;
                  return (
                    <tr key={row.key}>
                      <th scope="row">{row.label}</th>
                      <td className="analysis__num">
                        {row.tokens}
                        {small ? (
                          <span className="analysis__small" title={`Fewer than ${SMALL_SAMPLE} tokens: treat with care`}>
                            {' '}
                            (small sample)
                          </span>
                        ) : null}
                      </td>
                      <td className="analysis__bar-col">
                        <span className="analysis__bar-cell">
                          <span className="analysis__track" aria-hidden="true">
                            <span className="analysis__bar" style={{ inlineSize: `${row.barPct}%` }} />
                          </span>
                          <span className="analysis__value">{row.reached2x}</span>
                        </span>
                      </td>
                      <td className="analysis__num">{row.lift ?? '—'}</td>
                      <td className={`analysis__num ${signClass(row.avgReturnPct)}`}>{row.avgReturn}</td>
                      <td className={`analysis__num ${signClass(row.medianReturnPct)}`}>{row.medianReturn}</td>
                      <td className="analysis__num">{row.winners}</td>
                      <td className="analysis__num">{row.medianPeak}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <p className="analysis__note">
        "Reached 2×" is the share of tokens whose price doubled after the entry; "Winners" is the share of simulated
        trades that made money after costs. These are results on past tokens lessfomo observed, not a promise about
        the next one.
      </p>
    </div>
  );
}
