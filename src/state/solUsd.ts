import { createContext, use } from 'react';

/**
 * The live SOL/USD price, shared with every place that shows money so dollars can be the main figure.
 * null while unknown (or outside a provider, e.g. in a component test): amounts are then shown in SOL.
 */
export const SolUsdContext = createContext<number | null>(null);

export function useSolUsd(): number | null {
  return use(SolUsdContext);
}
