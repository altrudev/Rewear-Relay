import { describe, expect, it } from 'vitest';
import { relayRequestSchema } from './index';

const candidate = {
  id: 'candidate-1',
  title: 'Vintage brown leather jacket',
  price: 72,
  currency: 'USD',
  source: 'marketplace',
  observed_at: '2026-08-25T20:00:00Z',
  garment_category: 'outerwear'
};

const source = {
  id: 'source-1',
  title: 'Brown leather jacket',
  price: 80,
  currency: 'USD',
  garment_category: 'outerwear'
};

describe('relayRequestSchema', () => {
  it('accepts a bounded normalized candidate set', () => {
    expect(relayRequestSchema.parse({ source, candidates: [candidate], intent: 'similar look under $90' }))
      .toMatchObject({ source: { id: 'source-1' }, candidates: [{ id: 'candidate-1' }] });
  });

  it('rejects duplicate candidate ids before Rig execution', () => {
    expect(() => relayRequestSchema.parse({
      source,
      candidates: [candidate, { ...candidate, title: 'Different title' }]
    })).toThrow();
  });

  it('rejects more than thirty candidates before Rig execution', () => {
    const candidates = Array.from({ length: 31 }, (_, index) => ({
      ...candidate,
      id: `candidate-${index}`
    }));
    expect(() => relayRequestSchema.parse({ source, candidates })).toThrow();
  });
});
