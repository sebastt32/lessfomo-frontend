import type { WalletRecord, WalletStyle, WalletTier } from '../api/types';
import { formatCount } from './format';


const MINUS = '−';

export const TIER_LABELS: Record<WalletTier, string> = { elite: 'Élite', good: 'Buen historial', none: 'Sin calificar' };

export const TIER_HINTS: Record<WalletTier, string> = {
  elite: 'Élite: en los últimos 7 días operó al menos 10 tokens, ganó en el 65% y sumó 5 SOL o más de ganancia',
  good: 'Buen historial: en los últimos 7 días operó al menos 5 tokens, ganó en el 55% y terminó con ganancia',
  none: 'No tuvo suficientes buenos resultados en los últimos 7 días para calificarla',
};

export const STYLE_LABELS: Record<WalletStyle, string> = {
  conviction: 'Mantiene',
  flipper: 'Vende rápido',
  mixed: 'Mixta',
  unrated: 'Sin calificar',
};

export const STYLE_HINTS: Record<WalletStyle, string> = {
  conviction: 'Mantiene: vendió antes de 2 minutos en como mucho el 30% de sus tokens recientes; suele quedarse con lo que compra',
  flipper: 'Vende rápido: vendió antes de 2 minutos en el 60% o más de sus tokens recientes; nunca hace público un token',
  mixed: 'Mixta: a veces mantiene y a veces vende antes de 2 minutos; nunca hace público un token',
  unrated: 'Sin calificar: no tiene suficientes buenos resultados para saber cómo opera',
};

/** A "flip" is a token sold within this many seconds of the first buy (decision D7). */
export const FLIP_SECONDS = 120;

/** "4 s", "2 min 5 s", "1 h 3 min" after launch. */
export function formatEntrySeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  if (total < 3600) {
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "+14.24 SOL", "−1.20 SOL", "0.00 SOL". */
export function formatSignedSol(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  if (Number(abs) === 0) return `${(0).toFixed(2)} SOL`;
  return `${value > 0 ? '+' : MINUS}${abs} SOL`;
}

/** Why a wallet counts as good, in one plain sentence built from its record. */
export function describeWalletRecord(record: WalletRecord): string {
  if (record.tokens === 0) return 'Todavía no cerró ningún token en los últimos 7 días';
  const parts = [
    `Ganó en ${formatCount(record.wins)} de ${formatCount(record.tokens)} ${record.tokens === 1 ? 'token' : 'tokens'} (${Math.round(record.winRate)}%) en los últimos 7 días`,
    `resultado neto ${formatSignedSol(record.netPnlSol)}`,
  ];
  if (record.medianEntrySeconds !== null) {
    parts.push(`suele comprar ${formatEntrySeconds(record.medianEntrySeconds)} después del lanzamiento`);
  }
  const holding: string[] = [];
  if (typeof record.medianHoldSeconds === 'number') {
    holding.push(`suele mantener ${formatEntrySeconds(record.medianHoldSeconds)}`);
  }
  if (typeof record.flipRate === 'number') {
    holding.push(
      `vendió antes de ${formatEntrySeconds(FLIP_SECONDS)} en el ${Math.round(record.flipRate)}% de sus tokens`,
    );
  }
  if (holding.length > 0) parts.push(holding.join('; '));
  return parts.join(', ');
}
