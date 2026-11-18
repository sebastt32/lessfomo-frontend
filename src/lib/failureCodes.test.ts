import { describe, expect, it } from 'vitest';
import { describeFailureCode } from './failureCodes';

describe('describeFailureCode', () => {
  it('says in plain Spanish which safety check failed', () => {
    expect(describeFailureCode('MINT_AUTHORITY_ACTIVE')).toBe('El creador todavía puede crear más tokens');
    expect(describeFailureCode('FREEZE_AUTHORITY_ACTIVE')).toBe('El creador todavía puede congelar tokens');
    expect(describeFailureCode('DANGEROUS_EXTENSION')).toBe('El token tiene una función peligrosa');
    expect(describeFailureCode('TOP_HOLDERS_CONCENTRATED')).toBe('Los 10 mayores holders tienen demasiado');
    expect(describeFailureCode('CREATOR_HOLDS_TOO_MUCH')).toBe('El creador tiene demasiado');
    expect(describeFailureCode('INSIDER_NETWORK_DETECTED')).toBe('Red de wallets relacionadas con el creador');
    expect(describeFailureCode('NOT_ENOUGH_HOLDERS')).toBe('Muy pocos holders');
  });

  it('shows an unknown code as it is', () => {
    expect(describeFailureCode('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});
