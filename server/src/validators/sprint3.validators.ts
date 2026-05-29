import { z } from 'zod';

// Helper for non-negative integers (monetary amounts or year)
const nonNegativeInt = z.number().int({ message: 'يجب أن يكون القيمة عدداً صحيحاً' }).nonnegative({ message: 'يجب أن تكون القيمة أكبر من أو تساوي الصفر' });

// Branches Validation
export const createBranchSchema = z.object({
  name: z.string({ required_error: 'اسم الفرع بالإنجليزية مطلوب' }).min(1, 'اسم الفرع بالإنجليزية لا يمكن أن يكون فارغاً'),
  name_ar: z.string({ required_error: 'اسم الفرع بالعربية مطلوب' }).min(1, 'اسم الفرع بالعربية لا يمكن أن يكون فارغاً'),
  city: z.string().optional().nullable(),
  city_ar: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  region_ar: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional()
});

export const updateBranchSchema = createBranchSchema.partial();

// Customers Validation
export const createCustomerSchema = z.object({
  full_name: z.string({ required_error: 'الاسم الكامل مطلوب' }).min(1, 'الاسم الكامل لا يمكن أن يكون فارغاً'),
  full_name_ar: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('البريد الإلكتروني غير صالح').optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable(),
  city_ar: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  preferred_communication: z.enum(['phone', 'whatsapp', 'email']).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  agent_id: z.string().uuid('معرف الوكيل غير صالح').optional()
});

export const updateCustomerSchema = createCustomerSchema.partial();

// Agents (Users with agent roles) Validation
export const createAgentSchema = z.object({
  username: z.string({ required_error: 'اسم المستخدم مطلوب' }).min(3, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  password: z.string({ required_error: 'كلمة المرور مطلوبة' }).min(6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'),
  full_name: z.string({ required_error: 'الاسم الكامل مطلوب' }).min(1, 'الاسم الكامل لا يمكن أن يكون فارغاً'),
  full_name_ar: z.string({ required_error: 'الاسم الكامل بالعربية مطلوب' }).min(1, 'الاسم الكامل بالعربية لا يمكن أن يكون فارغاً'),
  role_id: z.string({ required_error: 'معرف الدور مطلوب' }).uuid('معرف الدور غير صالح'),
  branch_id: z.string().uuid('معرف الفرع غير صالح').optional().nullable(),
  status: z.enum(['active', 'suspended', 'deleted']).optional()
});

export const updateAgentSchema = z.object({
  username: z.string().min(3, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل').optional(),
  email: z.string().email('البريد الإلكتروني غير صالح').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل').optional(),
  full_name: z.string().min(1, 'الاسم الكامل لا يمكن أن يكون فارغاً').optional(),
  full_name_ar: z.string().min(1, 'الاسم الكامل بالعربية لا يمكن أن يكون فارغاً').optional(),
  role_id: z.string().uuid('معرف الدور غير صالح').optional(),
  branch_id: z.string().uuid('معرف الفرع غير صالح').optional().nullable(),
  status: z.enum(['active', 'suspended', 'deleted']).optional()
});

// Vehicles Validation
export const createVehicleSchema = z.object({
  vin: z.string({ required_error: 'رقم الهيكل VIN مطلوب' }).length(17, 'يجب أن يتكون رقم الهيكل VIN من 17 حرفاً ورقم'),
  make: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  year: nonNegativeInt.optional().nullable(),
  color: z.string().optional().nullable(),
  color_ar: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  auction_source: z.enum(['copart', 'iaai', 'other']).optional().nullable(),
  purchase_price_usd: nonNegativeInt.optional().nullable(),
  purchase_price_iqd: nonNegativeInt.optional().nullable(),
  auction_fees_usd: nonNegativeInt.optional().nullable(),
  shipping_fees_usd: nonNegativeInt.optional().nullable(),
  shipping_fees_iqd: nonNegativeInt.optional().nullable(),
  other_fees_usd: nonNegativeInt.optional().nullable(),
  other_fees_iqd: nonNegativeInt.optional().nullable(),
  agent_id: z.string().uuid('معرف الوكيل غير صالح').optional(),
  customer_id: z.string().uuid('معرف العميل غير صالح').optional().nullable(),
  branch_id: z.string().uuid('معرف الفرع غير صالح').optional().nullable(),
  status: z.enum(['active', 'delivered', 'archived', 'cancelled']).optional(),
  notes: z.string().optional().nullable()
});

export const updateVehicleSchema = createVehicleSchema.partial();
