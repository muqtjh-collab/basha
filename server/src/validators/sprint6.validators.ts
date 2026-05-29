import { z } from 'zod';

export const createApprovalSchema = z.object({
  vehicle_id: z.string({
    required_error: 'معرف المركبة مطلوب.',
  }).uuid('معرف المركبة يجب أن يكون UUID صالح.'),
  approval_type: z.enum(['finance', 'operations', 'administration'], {
    required_error: 'نوع الموافقة مطلوب.',
    invalid_type_error: 'نوع الموافقة غير صالح. القيم المسموحة: finance, operations, administration.',
  }),
  note: z
    .string()
    .max(500, 'الملاحظة يجب ألا تتجاوز 500 حرف.')
    .optional()
    .nullable(),
});

export const finalClosureSchema = z.object({
  vehicle_id: z.string({
    required_error: 'معرف المركبة مطلوب.',
  }).uuid('معرف المركبة يجب أن يكون UUID صالح.'),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type FinalClosureInput = z.infer<typeof finalClosureSchema>;
