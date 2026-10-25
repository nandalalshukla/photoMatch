/** Request shapes shared by the organizer and contributor upload endpoints. */
import { z } from 'zod';

/** A SHA-256 fingerprint written as 64 hex characters. */
export const sha256 = z.string().regex(/^[a-f0-9]{64}$/, 'must be a SHA-256 hex string');

export const photosSchema = z.object({
  photos: z
    .array(
      z.object({
        publicId: z.string().min(1).max(300),
        url: z.url().max(1000),
        contentHash: sha256.optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    )
    .min(1)
    .max(100), // the browser sends photos in chunks
});
