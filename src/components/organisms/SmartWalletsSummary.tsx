import type { ReactNode } from 'react';
import type { SmartWalletInToken } from '../../api/types';
import { DEFAULT_MIN_CONVICTION_WALLETS } from '../../lib/smartWalletFilter';
import { HelpTip } from '../molecules/HelpTip';
import './SmartWallets.css';

export interface SmartWalletsSummaryProps {
  wallets: readonly SmartWalletInToken[];
  /** The list of SmartWalletItem elements. */
  children: ReactNode;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Headline counts for a token's good-history wallets, the list itself and honest caveats. */
export function SmartWalletsSummary({ wallets, children }: SmartWalletsSummaryProps) {
  const elite = wallets.filter((w) => w.tierAtEntry === 'elite').length;
  const holding = wallets.filter((w) => w.stillHolding).length;
  // A backend that predates trading styles sends no styleAtEntry at all.
  const styleKnown = wallets.some((w) => w.styleAtEntry !== undefined);
  const conviction = wallets.filter((w) => w.styleAtEntry === 'conviction').length;
  const flippers = wallets.filter((w) => w.styleAtEntry === 'flipper').length;
  const goodWallets = `${wallets.length} ${plural(wallets.length, 'wallet con buen historial', 'wallets con buen historial')}`;
  const stillHolds = `${holding} todavía lo ${plural(holding, 'tiene', 'tienen')}`;
  return (
    <div className="smart-wallets">
      <p className="smart-wallets__summary">
        {styleKnown ? (
          <>
            <strong>
              {conviction} {plural(conviction, 'wallet que mantiene', 'wallets que mantienen')}
            </strong>
            <HelpTip topic="una wallet que mantiene">
              Una wallet con buen historial en los últimos 7 días que suele quedarse con lo que compra en lugar de
              venderlo antes de 2 minutos. Un token aparece en lessfomo solo cuando lo compraron al menos{' '}
              {DEFAULT_MIN_CONVICTION_WALLETS}.
            </HelpTip>{' '}
            de {goodWallets} que compraron este token ({flippers} {plural(flippers, 'vende', 'venden')} rápido
            <HelpTip topic="una wallet que vende rápido">
              Una wallet que suele vender antes de 2 minutos. Comprar justo después de ella suele significar comprarle lo
              que está vendiendo.
            </HelpTip>
            , {elite} élite al comprar); {stillHolds}.
          </>
        ) : (
          <>
            <strong>{goodWallets}</strong> {plural(wallets.length, 'compró', 'compraron')} este token ({elite} élite al
            comprar); {stillHolds}.
          </>
        )}
      </p>
      <p className="smart-wallets__note" role="note">
        {styleKnown ? (
          <>
            <strong>Mantiene o vende rápido.</strong>
            <HelpTip topic="el estilo">
              Cómo suele operar una wallet: si mantiene lo que compra, si vende rápido (antes de 2 minutos) o si es
              mixta.
            </HelpTip>{' '}
            Una wallet que mantiene tiene buen historial y suele quedarse con lo que compra: vendió antes de 2 minutos
            en como mucho el 30% de sus tokens recientes. Una que vende rápido lo hizo en el 60% o más. Solo las wallets
            que mantienen hacen público un token (al menos {DEFAULT_MIN_CONVICTION_WALLETS}); las que venden rápido se
            muestran aquí pero nunca cuentan, porque comprar justo después de ellas suele significar comprarles lo que
            están vendiendo.
          </>
        ) : (
          <>
            Todavía no está disponible el estilo de operación: esta API del screener no informa si estas wallets suelen
            mantener o vender rápido. Aparecerá cuando se actualice el backend.
          </>
        )}
      </p>
      <ul className="smart-wallets__list">{children}</ul>
      <p className="smart-wallets__note">
        Los resultados pasados no garantizan los futuros. El historial de una wallet solo cubre los tokens que lessfomo
        observó en los últimos 7 días, y su nivel y su estilo al comprar usan solo resultados que ya habían cerrado
        antes de que comprara.
      </p>
    </div>
  );
}
