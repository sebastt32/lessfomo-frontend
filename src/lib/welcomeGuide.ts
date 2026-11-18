/** Whether this browser already saw the first-visit guide; kept in localStorage. */

export const GUIDE_STORAGE_KEY = 'lessfomo:guide-seen';

/** True once the guide was closed here. Blocked storage counts as seen, so the guide never shows on every page load. */
export function hasSeenGuide(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markGuideSeen(): void {
  try {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, '1');
  } catch {
    // Private mode or blocked storage: the guide simply closes for this visit.
  }
}

export interface GuideStep {
  title: string;
  body: string;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    title: 'Bienvenido a lessfomo',
    body: 'Te mostramos tokens nuevos de pump.fun que compraron wallets con buen historial y que suelen mantener lo que compran. Es información para investigar, no una recomendación de compra.',
  },
  {
    title: 'En vivo',
    body: 'Los tokens más activos en este momento, con su market cap en dólares, su ciclo y cuántas wallets que mantienen los compraron. Toca uno para ver su gráfico y su detalle.',
  },
  {
    title: 'Registro diario',
    body: 'Cada día guardamos todos los tokens que aparecieron y cuántos llegaron al doble de su precio después de aparecer, incluidos los que no lo lograron. También ves el éxito del mes.',
  },
  {
    title: 'Los signos de pregunta',
    body: 'Al lado de cada concepto hay un "?" con una explicación corta. Tócalo cuando tengas dudas. Los resultados pasados no garantizan los futuros.',
  },
];
