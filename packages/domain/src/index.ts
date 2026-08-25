export const TRY_ON_STATES = [
  'new', 'item_selected', 'garment_validated', 'person_ready',
  'assets_uploaded', 'vto_queued', 'vto_processing', 'vto_ready',
  'vto_failed', 'relay_available', 'session_deleted'
] as const;

export type TryOnState = typeof TRY_ON_STATES[number];
export type GarmentCategory = 'auto' | 'full_body' | 'upper_body' | 'lower_body' | 'shoes' | 'outerwear';

export interface Item {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  price?: number;
  currency?: string;
  imageUrl: string;
  observedAt: string;
  garmentCategory: GarmentCategory;
}

export interface AssetBinding {
  id: string;
  kind: 'person' | 'garment';
  sha256: string;
  providerFileId: string;
}

export interface TryOnBinding {
  sessionId: string;
  itemId: string;
  personAssetId: string;
  garmentAssetId: string;
  providerTaskId: string;
}

export function bindingKey(binding: TryOnBinding): string {
  return [binding.sessionId, binding.itemId, binding.personAssetId, binding.garmentAssetId, binding.providerTaskId].join(':');
}

export function assertSameBinding(expected: TryOnBinding, actual: TryOnBinding): void {
  if (bindingKey(expected) !== bindingKey(actual)) {
    throw new Error('TRY_ON_BINDING_MISMATCH');
  }
}

export const VISUALIZATION_DISCLAIMER =
  'AI visualization only. Actual sizing, material, drape and condition may differ.';
