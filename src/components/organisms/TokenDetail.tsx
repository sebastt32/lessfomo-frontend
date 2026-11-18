import type { ReactNode } from 'react';
import type { Lifecycle, Liquidity, TokenDetailResponse } from '../../api/types';
import type { ScorePoint } from '../../state/liveFeed';
import { DateTime } from '../atoms/DateTime';
import { ExternalLink } from '../atoms/ExternalLink';
import { Sparkline } from '../atoms/Sparkline';
import { StatusBadge } from '../atoms/StatusBadge';
import { LifecycleBadge } from '../atoms/Tag';
import { HelpTip } from '../molecules/HelpTip';
import { LiquidityMeter } from '../molecules/Liquidity';
import { TokenLinks } from '../molecules/TokenLinks';
import { describeFailureCode } from '../../lib/failureCodes';
import {
  formatCount,
  formatPercent,
  formatRelativeTime,
  formatScore,
  shortenMint,
} from '../../lib/format';
import { MoneyValue } from '../molecules/MoneyValue';
import './TokenDetail.css';

export interface TokenDetailProps {
  detail: TokenDetailResponse;
  /** Score over time, oldest first (stored history plus live readings). */
  scores: readonly ScorePoint[];
  now: number;
  /** Latest known liquidity (live ranking or newest snapshot); undefined when the backend does not report it. */
  liquidity?: Liquidity | null;
  /** From the snapshots endpoint, when available. */
  lifecycle?: Lifecycle | null;
  /** Slot for the snapshots over time, rendered after the momentum score. */
  snapshots?: ReactNode;
  /** Slot for the good-history wallets that bought the token, rendered right after the key facts. */
  smartWallets?: ReactNode;
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
  if (!first || !last) return 'Todavía no hay lecturas de impulso';
  return `Impulso en ${scores.length} lecturas, de ${formatScore(first.score)} a ${formatScore(last.score)} sobre 100`;
}

export function TokenDetail({
  detail,
  scores,
  now,
  liquidity,
  lifecycle,
  snapshots,
  smartWallets,
}: TokenDetailProps) {
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
          <dt>Dirección del token</dt>
          <dd title={token.mint}>{shortenMint(token.mint)}</dd>
        </div>
        <div>
          <dt>Creador</dt>
          <dd title={token.creator}>{shortenMint(token.creator)}</dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>
            <DateTime iso={token.detectedAt} />
            <span className="token-detail__ago">{formatRelativeTime(token.detectedAt, now)}</span>
          </dd>
        </div>
        <div>
          <dt>
            Primera compra del creador{' '}
            <HelpTip topic="la primera compra del creador">
              Cuánto compró el creador de su propio token al lanzarlo. Si compró mucho, puede vender una parte grande
              después.
            </HelpTip>
          </dt>
          <dd>
            <MoneyValue sol={token.initialBuySol} layout="inline" />
          </dd>
        </div>
        <div>
          <dt>
            Market cap al lanzar{' '}
            <HelpTip topic="el market cap al lanzar">
              Lo que valían todos los tokens juntos cuando el token se creó en pump.fun.
            </HelpTip>
          </dt>
          <dd>
            <MoneyValue sol={token.marketCapSol} layout="inline" />
          </dd>
        </div>
        {isHttpsUrl(token.metadataUri) ? (
          <div>
            <dt>Metadatos</dt>
            <dd>
              <ExternalLink href={token.metadataUri}>Abrir JSON</ExternalLink>
            </dd>
          </div>
        ) : null}
      </dl>

      <LiquidityMeter liquidity={liquidity} />

      {smartWallets ? (
        <section className="token-detail__section" aria-labelledby="token-detail-smart-wallets">
          <div className="token-detail__heading">
            <h3 id="token-detail-smart-wallets" className="token-detail__subtitle">
              Wallets con buen historial
            </h3>
            <HelpTip topic="una wallet con buen historial">
              Una wallet que en los últimos 7 días ganó en la mayoría de los tokens que operó y terminó con ganancia.
            </HelpTip>
          </div>
          {smartWallets}
        </section>
      ) : null}

      <figure className="token-detail__chart">
        <figcaption>
          <span>
            Impulso{' '}
            <HelpTip topic="el impulso">
              Un puntaje de 0 a 100: qué tan rápido crecen los compradores nuevos y el volumen de compra en los últimos
              minutos.
            </HelpTip>
          </span>
          {latest ? <strong>{formatScore(latest.score)}</strong> : null}
        </figcaption>
        {values.length > 1 ? (
          <Sparkline values={values} label={describeSeries(scores)} />
        ) : (
          <p className="token-detail__note">
            {values.length === 1
              ? 'Una lectura por ahora. La línea aparece después del próximo minuto.'
              : 'Todavía no hay lecturas de impulso. Se registra una por minuto mientras el token se opera.'}
          </p>
        )}
      </figure>

      {snapshots ? (
        <section className="token-detail__section" aria-labelledby="token-detail-snapshots">
          <div className="token-detail__heading">
            <h3 id="token-detail-snapshots" className="token-detail__subtitle">
              Registros en el tiempo
            </h3>
            <HelpTip topic="un registro">
              El estado del token guardado en momentos clave: al crearse, a los 5 minutos, a la hora, al migrar y otros.
            </HelpTip>
          </div>
          {snapshots}
        </section>
      ) : null}

      <section className="token-detail__section" aria-labelledby="token-detail-safety">
      <div className="token-detail__heading">
        <h3 id="token-detail-safety" className="token-detail__subtitle">
          Historial de controles de seguridad
        </h3>
        <HelpTip topic="los controles de seguridad">
          Revisan cuánto tienen los 10 mayores holders, cuánto tiene el creador y los permisos del token. Pasarlos no
          significa que el token vaya a subir.
        </HelpTip>
      </div>
      {screenings.length === 0 ? (
        <p className="token-detail__note">Todavía sin revisar. Los controles de seguridad se hacen poco después de detectar el token.</p>
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
                Top 10 {formatPercent(screening.top10Pct)}, creador {formatPercent(screening.creatorPct)},{' '}
                {formatCount(screening.totalHolders)} holders
              </p>
            </li>
          ))}
        </ol>
      )}
      </section>
    </div>
  );
}
