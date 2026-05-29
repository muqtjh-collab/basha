import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, { message: 'اسم المستخدم أو البريد الإلكتروني يجب أن يكون 3 أحرف على الأقل' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, { message: 'يجب إدخال كلمة المرور القديمة' }),
  newPassword: z.string().min(6, { message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
