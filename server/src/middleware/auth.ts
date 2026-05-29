import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';
import { AppError } from './errorHandler';

interface JwtPayload {
  userId: string;
  role: string;
  sessionId: string;
}

// Extend Express Request interface to include user and session info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string | null;
        email: string | null;
        fullName: string;
        fullNameAr: string;
        status: string;
        role: {
          id: string;
          name: string;
          nameAr: string;
          level: number;
          defaultPermissions: any;
        };
        branchId: string | null;
        geographicScope: string[] | null;
        customPermissions: any;
      };
      sessionId?: string;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
    }

    const token = authHeader.split(' ')[1];
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'TOKEN_EXPIRED', 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
      }
      throw new AppError(401, 'INVALID_TOKEN', 'رمز التفويض غير صالح. يرجى إعادة تسجيل الدخول.');
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'المستخدم غير موجود في النظام.');
    }

    if (user.status === 'suspended') {
      throw new AppError(403, 'USER_SUSPENDED', 'تم تعليق حسابك. يرجى الاتصال بالإدارة.');
    }

    if (user.status === 'deleted') {
      throw new AppError(401, 'USER_DELETED', 'عذراً، هذا الحساب لم يعد متاحاً.');
    }

    // Verify session is still valid in database
    const session = await db.session.findUnique({
      where: { id: decoded.sessionId }
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new AppError(401, 'SESSION_INVALID', 'الجلسة غير صالحة أو تم تسجيل الخروج منها.');
    }

    // Map database properties safely to Request user object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      fullNameAr: user.fullNameAr,
      status: user.status,
      role: {
        id: user.role.id,
        name: user.role.name,
        nameAr: user.role.nameAr,
        level: user.role.level,
        defaultPermissions: user.role.defaultPermissions,
      },
      branchId: user.branchId,
      geographicScope: user.geographicScope as string[] | null,
      customPermissions: user.customPermissions,
    };
    req.sessionId = decoded.sessionId;

    next();
  } catch (error) {
    next(error);
  }
};
