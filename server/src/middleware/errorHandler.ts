import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly messageAr: string;
  public readonly details: any[];

  constructor(statusCode: number, code: string, messageAr: string, details: any[] = []) {
    super(messageAr);
    this.statusCode = statusCode;
    this.code = code;
    this.messageAr = messageAr;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let messageAr = err.messageAr || 'حدث خطأ غير متوقع في النظام. يرجى المحاولة لاحقاً.';
  let details = err.details || [];

  // Log error details in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.path} - Code: ${code}, Status: ${statusCode}`);
    console.error(err);
  }

  // Handle specific Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    messageAr = 'البيانات المرسلة غير صالحة. يرجى التحقق من الحقول.';
    details = err.errors.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. vin or email already exists)
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT_ERROR';
      const targets = err.meta?.target as string[] | undefined;
      const targetStr = targets ? targets.join(', ') : '';
      messageAr = `عذراً، هذا السجل موجود بالفعل في النظام (${targetStr}).`;
    }
    // Foreign key constraint failure
    else if (err.code === 'P2003') {
      statusCode = 400;
      code = 'REFERENCE_ERROR';
      messageAr = 'فشلت العملية لأنها تشير إلى سجل غير موجود في النظام.';
    }
    // Record not found
    else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND_ERROR';
      messageAr = 'السجل المطلوب غير موجود أو تم حذفه.';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message_ar: messageAr,
      details
    }
  });
};
