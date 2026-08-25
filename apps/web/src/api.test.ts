import { afterEach, describe, expect, it, vi } from 'vitest';
import { pollCandidateTryOn } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('candidate-bound VTO polling', () => {
  it('rejects provider success when candidate binding does not match the expected candidate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 'success',
      resultUrl: 'https://results.example.test/result.jpg',
      binding: {candidateId: 'candidate-wrong', sourceItemId: 'source-1'}
    }), {status: 200, headers: {'content-type': 'application/json'}})));

    await expect(pollCandidateTryOn(
      'task-12345678',
      'vto-v1.payload.signature',
      'candidate-expected',
      'source-1'
    )).rejects.toThrow('CANDIDATE_VTO_BINDING_MISMATCH');
  });

  it('rejects provider success when source predecessor binding does not match', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 'success',
      resultUrl: 'https://results.example.test/result.jpg',
      binding: {candidateId: 'candidate-1', sourceItemId: 'wrong-source'}
    }), {status: 200, headers: {'content-type': 'application/json'}})));

    await expect(pollCandidateTryOn(
      'task-12345678',
      'vto-v1.payload.signature',
      'candidate-1',
      'source-1'
    )).rejects.toThrow('CANDIDATE_VTO_BINDING_MISMATCH');
  });

  it('returns the result only when candidate and source bindings match', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      status: 'success',
      resultUrl: 'https://results.example.test/result.jpg',
      binding: {candidateId: 'candidate-1', sourceItemId: 'source-1'}
    }), {status: 200, headers: {'content-type': 'application/json'}})));

    await expect(pollCandidateTryOn(
      'task-12345678',
      'vto-v1.payload.signature',
      'candidate-1',
      'source-1'
    )).resolves.toBe('https://results.example.test/result.jpg');
  });
});
