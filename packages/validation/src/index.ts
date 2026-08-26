import { z } from 'zod';

export const imageTicketSchema = z.object({
  fileName: z.string().min(1).max(180),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  contentType: z.enum(['image/jpeg', 'image/jpg', 'image/png'])
});

export const tryOnSchema = z.object({
  personFileId: z.string().min(1),
  garmentFileId: z.string().min(1),
  garmentCategory: z.enum(['auto', 'full_body', 'upper_body', 'lower_body', 'shoes', 'outerwear']).default('auto')
});

export const taskIdSchema = z.string().min(8).max(512);

const moneySchema = z.number().finite().nonnegative().max(1_000_000).nullable().optional();
const currencySchema = z.string().trim().min(3).max(8).nullable().optional();
const garmentCategorySchema = z.string().trim().min(1).max(64).nullable().optional();
const safeHttpUrlSchema = z.string().max(1024).url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}, 'URL must use http or https').optional();
const safeHttpsUrlSchema = z.string().max(1024).url().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'URL must use https').optional();

export const relaySourceSchema = z.object({
  id: z.string().trim().min(1).max(180),
  title: z.string().trim().min(1).max(500),
  price: moneySchema,
  currency: currencySchema,
  garment_category: garmentCategorySchema
}).strict();

export const relayCandidateSchema = z.object({
  id: z.string().trim().min(1).max(220),
  title: z.string().trim().min(1).max(500),
  price: moneySchema,
  currency: currencySchema,
  source: z.string().trim().min(1).max(180),
  observed_at: z.string().datetime({ offset: true }),
  garment_category: garmentCategorySchema
}).strict();

export const relayRequestSchema = z.object({
  source: relaySourceSchema,
  candidates: z.array(relayCandidateSchema).min(1).max(30),
  intent: z.string().trim().min(1).max(800).nullable().optional()
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  for (const candidate of value.candidates) {
    if (seen.has(candidate.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'candidate ids must be unique',
        path: ['candidates']
      });
      break;
    }
    seen.add(candidate.id);
  }
});

export const relayPlanSchema = z.object({
  source_item_id: z.string().trim().min(1).max(180),
  ranked: z.array(z.object({
    candidate_id: z.string().trim().min(1).max(220),
    score: z.number().int().min(0).max(100),
    reasons: z.array(z.string().trim().min(1).max(500)).max(8),
    cautions: z.array(z.string().trim().min(1).max(500)).max(8)
  }).strict()).max(30),
  summary: z.string().trim().min(1).max(1500)
}).strict();

export const normalizedSearchCandidateSchema = z.object({
  id: z.string().trim().min(1).max(220),
  title: z.string().trim().min(1).max(500),
  source: z.string().trim().min(1).max(180),
  observedAt: z.string().datetime({offset: true}),
  price: moneySchema,
  priceText: z.string().trim().min(1).max(120).optional(),
  currency: currencySchema,
  productUrl: safeHttpUrlSchema,
  imageUrl: safeHttpsUrlSchema,
  secondHandCondition: z.string().trim().min(1).max(120).optional(),
  garmentCategory: z.enum(['auto', 'full_body', 'upper_body', 'lower_body', 'shoes', 'outerwear']).optional()
}).strict();

export const inventorySearchSchema = z.object({
  source: relaySourceSchema,
  query: z.string().trim().min(2).max(300),
  maxResults: z.number().int().min(1).max(12).default(12),
  strictSecondhand: z.boolean().default(true),
  region: z.enum(['ca', 'us']).default('ca')
}).strict();

export const candidateSetPayloadSchema = z.object({
  version: z.literal(1),
  provider: z.enum(['fixture', 'serpapi']),
  query: z.string().min(1).max(300),
  providerQuery: z.string().min(1).max(500),
  observedAt: z.string().datetime({offset: true}),
  receivedAt: z.string().datetime({offset: true}),
  expiresAt: z.string().datetime({offset: true}),
  source: relaySourceSchema,
  inventory: z.array(normalizedSearchCandidateSchema).min(1).max(12)
}).strict();

export const relayRankInputSchema = z.object({
  candidateSetToken: z.string().min(20).max(60_000),
  intent: z.string().trim().min(1).max(800).nullable().optional()
}).strict();

export const candidateTryOnSchema = z.object({
  candidateSetToken: z.string().min(20).max(60_000),
  candidateId: z.string().trim().min(1).max(220),
  personFileId: z.string().trim().min(1).max(512),
  garmentCategory: z.enum(['auto', 'full_body', 'upper_body', 'lower_body', 'shoes', 'outerwear']).optional()
}).strict();

export const vtoBindingPayloadSchema = z.object({
  version: z.literal(1),
  taskId: taskIdSchema,
  candidateId: z.string().trim().min(1).max(220),
  sourceItemId: z.string().trim().min(1).max(180),
  personFileId: z.string().trim().min(1).max(512),
  garmentImageUrl: safeHttpsUrlSchema.unwrap(),
  candidateSetObservedAt: z.string().datetime({offset: true}),
  createdAt: z.string().datetime({offset: true}),
  expiresAt: z.string().datetime({offset: true})
}).strict();

export const candidateTaskActionSchema = z.object({
  taskId: taskIdSchema,
  bindingToken: z.string().min(20).max(30_000)
}).strict();
