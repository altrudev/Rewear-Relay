import { describe, expect, it } from 'vitest';
import { signCandidateSet, verifyCandidateSet } from './candidateSet';

const secret = '0123456789abcdef0123456789abcdef';
const payload = {
  version: 1,
  source: {id: 'source-1'},
  inventory: [{id: 'candidate-1'}],
  observedAt: '2026-08-25T21:00:00Z',
  expiresAt: '2026-08-25T21:15:00Z'
};

describe('candidate set receipts', () => {
  it('round-trips a signed payload', async () => {
    const token = await signCandidateSet(secret, payload);
    await expect(verifyCandidateSet(secret, token)).resolves.toEqual(payload);
  });

  it('rejects a token after payload tampering', async () => {
    const token = await signCandidateSet(secret, payload);
    const [version, encoded, signature] = token.split('.');
    const replacement = encoded.endsWith('A') ? `${encoded.slice(0, -1)}B` : `${encoded.slice(0, -1)}A`;
    await expect(verifyCandidateSet(secret, `${version}.${replacement}.${signature}`))
      .rejects.toThrow('CANDIDATE_SET_TOKEN_INVALID');
  });

  it('rejects short signing keys', async () => {
    await expect(signCandidateSet('short', payload)).rejects.toThrow('SEARCH_SIGNING_KEY_WEAK');
  });
});
