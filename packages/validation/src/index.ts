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

export const relaySourceSchema = z.object({
  id: z.string().trim().min(1).max(180),
  title: z.string().trim().min(1).max(500),
  price: moneySchema,
  currency: currencySchema,
  garment_category: garmentCategorySchema
}).strict();

export const relayCandidateSchema = z.object({
  id: z.string().trim().min(1).max(180),
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
    candidate_id: z.string().trim().min(1).max(180),
    score: z.number().int().min(0).max(100),
    reasons: z.array(z.string().trim().min(1).max(500)).max(8),
    cautions: z.array(z.string().trim().min(1).max(500)).max(8)
  }).strict()).max(30),
  summary: z.string().trim().min(1).max(1500)
}).strict();
