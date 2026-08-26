import { describe, expect, it } from 'vitest';
import {
  normalizedSearchCandidateSchema,
  relayRequestSchema,
  vtoBindingPayloadSchema
} from './index';

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

describe('VTO image evidence URLs', () => {
  const normalizedBase = {
    id: 'candidate-1',
    title: 'Used brown leather jacket',
    source: 'marketplace',
    observedAt: '2026-08-25T20:00:00Z',
    secondHandCondition: 'used'
  };

  it('accepts HTTPS garment image evidence', () => {
    expect(normalizedSearchCandidateSchema.parse({
      ...normalizedBase,
      imageUrl: 'https://example.com/jacket.jpg'
    }).imageUrl).toBe('https://example.com/jacket.jpg');
  });

  it('rejects HTTP garment image evidence while shopping links may remain HTTP', () => {
    expect(() => normalizedSearchCandidateSchema.parse({
      ...normalizedBase,
      productUrl: 'http://example.com/listing',
      imageUrl: 'http://example.com/jacket.jpg'
    })).toThrow();
  });

  it('rejects an HTTP garment URL in a signed VTO binding payload', () => {
    expect(() => vtoBindingPayloadSchema.parse({
      version: 1,
      taskId: 'task-12345678',
      candidateId: 'candidate-1',
      sourceItemId: 'source-1',
      personFileId: 'person-file-1',
      garmentImageUrl: 'http://example.com/jacket.jpg',
      candidateSetObservedAt: '2026-08-25T20:00:00Z',
      createdAt: '2026-08-25T20:01:00Z',
      expiresAt: '2026-08-25T20:16:00Z'
    })).toThrow();
  });
});
