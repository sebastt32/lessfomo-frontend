/** Plain Spanish labels for the backend's safety failure codes. Unknown codes are shown as-is. */
const FAILURE_LABELS: Record<string, string> = {
  MINT_AUTHORITY_ACTIVE: 'El creador todavía puede crear más tokens',
  FREEZE_AUTHORITY_ACTIVE: 'El creador todavía puede congelar tokens',
  DANGEROUS_EXTENSION: 'El token tiene una función peligrosa',
  TOP_HOLDERS_CONCENTRATED: 'Los 10 mayores holders tienen demasiado',
  CREATOR_HOLDS_TOO_MUCH: 'El creador tiene demasiado',
  INSIDER_NETWORK_DETECTED: 'Red de wallets relacionadas con el creador',
  NOT_ENOUGH_HOLDERS: 'Muy pocos holders',
};

export function describeFailureCode(code: string): string {
  return FAILURE_LABELS[code] ?? code;
}
