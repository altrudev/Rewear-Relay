import { describe, expect, it } from 'vitest';
import { assertSameBinding, bindingKey, VISUALIZATION_DISCLAIMER, type TryOnBinding } from './index';

const base: TryOnBinding = {
  sessionId: 's1', itemId: 'i1', personAssetId: 'p1', garmentAssetId: 'g1', providerTaskId: 't1'
};

describe('try-on binding', () => {
  it('is deterministic', () => expect(bindingKey(base)).toBe('s1:i1:p1:g1:t1'));
  it('accepts the exact predecessor/result binding', () => expect(() => assertSameBinding(base, {...base})).not.toThrow());
  it('rejects a stale or cross-item result', () => expect(() => assertSameBinding(base, {...base, itemId:'i2'})).toThrow('TRY_ON_BINDING_MISMATCH'));
  it('keeps the physical-fit claim boundary explicit', () => expect(VISUALIZATION_DISCLAIMER.toLowerCase()).toContain('actual sizing'));
});
