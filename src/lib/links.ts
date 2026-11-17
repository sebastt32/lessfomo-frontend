export function dexscreenerUrl(mint: string): string {
  return `https://dexscreener.com/solana/${encodeURIComponent(mint)}`;
}

export function pumpFunUrl(mint: string): string {
  return `https://pump.fun/coin/${encodeURIComponent(mint)}`;
}

export function solscanAccountUrl(address: string): string {
  return `https://solscan.io/account/${encodeURIComponent(address)}`;
}
