import { z } from 'zod';
import { STAGE_SEQUENCE } from '../services/stageService';

export const stageTransitionSchema = z.object({
  to_stage: z.enum(STAGE_SEQUENCE as [string, ...string[]], {
    required_error: 'قيمة المرحلة غير صحيحة.',
    invalid_type_error: 'قيمة المرحلة غير صحيحة.'
  }),
  note: z
    .string()
    .max(500, 'الملاحظة يجب ألا تتجاوز 500 حرف.')
    .optional()
    .nullable()
});
