import { PipeTransform } from '@nestjs/common';
import { z } from 'zod';

import { badRequest } from './errors.js';

/** Validates and strips request input with a zod schema. Unknown keys are rejected. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw badRequest('validation_failed', {
        fields: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

export const zUuid = z.uuid();

/** Short trimmed text without control characters. */
export const zText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s), 'invalid characters');

export const zPage = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();
