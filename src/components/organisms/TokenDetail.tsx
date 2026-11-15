import type { ReactNode } from 'react';
import type { Lifecycle, Liquidity, TokenDetailResponse } from '../../api/types';
import type { ScorePoint } from '../../state/liveFeed';
import { DateTime } from '../atoms/DateTime';
import { ExternalLink } from '../atoms/ExternalLink';
import { Sparkline } from '../atoms/Sparkline';
import { StatusBadge } from '../atoms/StatusBadge';
import { LifecycleBadge } from '../atoms/Tag';
import { LiquidityMeter } from '../molecules/Liquidity';
import { TokenLinks } from '../molecules/TokenLinks';
import { describeFailureCode } from '../../lib/failureCodes';
import {
  formatCount,
  formatPercent,
  formatRelativeTime,
  formatScore,
  formatSol,
  shortenMint,
} from '../../lib/format';
import './TokenDetail.css';

export interface TokenDetailProps {
  detail: TokenDetailResponse;
  /** Score over time, oldest first (stored history plus live readings). */
  scores: readonly ScorePoint[];
  now: number;
  /** Slot for the live price chart, rendered above the momentum score and safety history. */
  chart?: ReactNode;
  /** Latest known liquidity (live ranking or newest snapshot); undefined when the backend does not report it. */
  liquidity?: Liquidity | null;
  /** From the snapshots endpoint, when available. */
  lifecycle?: Lifecycle | null;
  /** Slot for the snapshots over time, rendered after the momentum score. */
  snapshots?: ReactNode;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function describeSeries(scores: readonly ScorePoint[]): string {
  const first = scores[0];
  const last = scores.at(-1);
  if (!first || !last) return 'No score readings yet';
  return `Momentum score over ${scores.length} readings, from ${formatScore(first.score)} to ${formatScore(last.score)} out of 100`;
}

export function TokenDetail({ detail, scores, now, chart, liquidity, lifecycle, snapshots }: TokenDetailProps) {
  const { token, status, screenings } = detail;
  const values = scores.map((point) => point.score);
  const latest = scores.at(-1);

  return (
    <div className="token-detail">
      <div className="token-detail__summary">
        <StatusBadge status={status} />
        {lifecycle ? <LifecycleBadge lifecycle={lifecycle} /> : null}
        <TokenLinks mint={token.mint} symbol={token.symbol} />
      </div>

      <dl className="token-detail__facts">
        <div>
          <dt>Mint</dt>
          <dd title={token.mint}>{shortenMint(token.mint)}</dd>
        </div>
        <div>
          <dt>Creator</dt>
          <dd title={token.creator}>{shortenMint(token.creator)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <DateTime iso={token.detectedAt} />
            <span className="token-detail__ago">{formatRelativeTime(token.detectedAt, now)}</span>
          </dd>
        </div>
        <div>
          <dt>Creator's first buy</dt>
          <dd>{formatSol(token.initialBuySol)}</dd>
        </div>
        <div>
          <dt>Market cap at launch</dt>
          <dd>{formatSol(token.marketCapSol)}</dd>
        </div>
        {isHttpsUrl(token.metadataUri) ? (
          <div>
            <dt>Metadata</dt>
            <dd>
              <ExternalLink href={token.metadataUri}>Open JSON</ExternalLink>
            </dd>
          </div>
        ) : null}
      </dl>

      <LiquidityMeter liquidity={liquidity} />

      {chart}

      <figure className="token-detail__chart">
        <figcaption>
          <span>Momentum score</span>
          {latest ? <strong>{formatScore(latest.score)}</strong> : null}
        </figcaption>
        {values.length > 1 ? (
          <Sparkline values={values} label={describeSeries(scores)} />
        ) : (
          <p className="token-detail__note">
            {values.length === 1
              ? 'One reading so far. The line appears after the next minute.'
              : 'No momentum readings yet. Scores are recorded once a minute while the token trades.'}
          </p>
        )}
      </figure>

      {snapshots ? (
        <section className="token-detail__section" aria-labelledby="token-detail-snapshots">
          <h3 id="token-detail-snapshots" className="token-detail__subtitle">
            Snapshots over time
          </h3>
          {snapshots}
        </section>
      ) : null}

      <h3 className="token-detail__subtitle">Safety check history</h3>
      {screenings.length === 0 ? (
        <p className="token-detail__note">Not checked yet. Safety checks run shortly after a token is detected.</p>
      ) : (
        <ol className="token-detail__history">
          {screenings.map((screening) => (
            <li key={screening.evaluatedAt}>
              <div className="token-detail__history-top">
                <StatusBadge status={screening.status} />
                <time dateTime={screening.evaluatedAt} title={screening.evaluatedAt}>
                  {formatRelativeTime(screening.evaluatedAt, now)}
                </time>
              </div>
              {screening.failureCodes.length > 0 ? (
                <p className="token-detail__codes">{screening.failureCodes.map(describeFailureCode).join(', ')}</p>
              ) : null}
              {screening.reason ? <p className="token-detail__reason">{screening.reason}</p> : null}
              <p className="token-detail__stats">
                Top 10 {formatPercent(screening.top10Pct)}, creator {formatPercent(screening.creatorPct)},{' '}
                {formatCount(screening.totalHolders)} holders
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
