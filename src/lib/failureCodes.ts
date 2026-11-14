/** Friendly labels for the backend's safety failure codes. Unknown codes are shown as-is. */
const FAILURE_LABELS: Record<string, string> = {
  MINT_AUTHORITY_ACTIVE: 'Mint authority still active',
  FREEZE_AUTHORITY_ACTIVE: 'Freeze authority still active',
  DANGEROUS_EXTENSION: 'Dangerous token extension',
  TOP_HOLDERS_CONCENTRATED: 'Top holders too concentrated',
  CREATOR_HOLDS_TOO_MUCH: 'Creator holds too much',
  INSIDER_NETWORK_DETECTED: 'Insider wallet network',
  NOT_ENOUGH_HOLDERS: 'Not enough holders',
};

export function describeFailureCode(code: string): string {
  return FAILURE_LABELS[code] ?? code;
}
