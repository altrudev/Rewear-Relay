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
