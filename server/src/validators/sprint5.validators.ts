import { z } from 'zod';

export const depositSchema = z.object({
  amount: z
    .number({
      required_error: 'يجب أن يكون المبلغ رقماً صحيحاً أكبر من الصفر.',
      invalid_type_error: 'يجب أن يكون المبلغ رقماً صحيحاً أكبر من الصفر.',
    })
    .int('يجب أن يكون المبلغ رقماً صحيحاً أكبر من الصفر.')
    .positive('يجب أن يكون المبلغ رقماً صحيحاً أكبر من الصفر.'),
  currency: z.enum(['USD', 'IQD'], {
    required_error: 'العملة غير صحيحة. يُقبل فقط USD أو IQD.',
    invalid_type_error: 'العملة غير صحيحة. يُقبل فقط USD أو IQD.',
  }),
  description: z
    .string({
      required_error: 'وصف العملية مطلوب.',
    })
    .min(1, 'وصف العملية مطلوب.'),
  description_ar: z
    .string({
      required_error: 'وصف العملية مطلوب.',
    })
    .min(1, 'وصف العملية مطلوب.'),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().uuid('معرف المرجع يجب أن يكون UUID صالح.').optional().nullable(),
});

export const deductSchema = depositSchema;

export type DepositInput = z.infer<typeof depositSchema>;
export type DeductInput = z.infer<typeof deductSchema>;
