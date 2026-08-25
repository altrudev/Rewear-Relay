import { describe, expect, it } from 'vitest';
import {
  signCandidateSet,
  signVtoBinding,
  verifyCandidateSet,
  verifyVtoBinding
} from './candidateSet';

const secret = '0123456789abcdef0123456789abcdef';
const payload = {
  version: 1,
  source: {id: 'source-1'},
  inventory: [{id: 'candidate-1'}],
  observedAt: '2026-08-25T21:00:00Z',
  expiresAt: '2026-08-25T21:15:00Z'
};

describe('scoped signed receipts', () => {
  it('round-trips a candidate-set payload', async () => {
    const token = await signCandidateSet(secret, payload);
    await expect(verifyCandidateSet(secret, token)).resolves.toEqual(payload);
  });

  it('rejects a token after payload tampering', async () => {
    const token = await signCandidateSet(secret, payload);
    const [scope, encoded, signature] = token.split('.');
    const replacement = encoded.endsWith('A') ? `${encoded.slice(0, -1)}B` : `${encoded.slice(0, -1)}A`;
    await expect(verifyCandidateSet(secret, `${scope}.${replacement}.${signature}`))
      .rejects.toThrow('CANDIDATE_SET_TOKEN_INVALID');
  });

  it('does not accept a candidate token as a VTO binding', async () => {
    const token = await signCandidateSet(secret, payload);
    await expect(verifyVtoBinding(secret, token)).rejects.toThrow('VTO_BINDING_TOKEN_INVALID');
  });

  it('does not accept a VTO binding as a candidate token', async () => {
    const token = await signVtoBinding(secret, {version: 1, taskId: 'task-12345678'});
    await expect(verifyCandidateSet(secret, token)).rejects.toThrow('CANDIDATE_SET_TOKEN_INVALID');
  });

  it('rejects short signing keys', async () => {
    await expect(signCandidateSet('short', payload)).rejects.toThrow('SEARCH_SIGNING_KEY_WEAK');
  });
});
