import type { TryOnBinding } from '@rewear/domain';

export interface PreviewReceipt {
  binding: TryOnBinding;
  provider: 'perfect-corp';
  transformation: 'ai-clothes-vto';
  physicalFitVerified: false;
  userImageRetainedByRewear: false;
  createdAt: string;
}

export function createPreviewReceipt(binding: TryOnBinding): PreviewReceipt {
  return {
    binding,
    provider: 'perfect-corp',
    transformation: 'ai-clothes-vto',
    physicalFitVerified: false,
    userImageRetainedByRewear: false,
    createdAt: new Date().toISOString()
  };
}
