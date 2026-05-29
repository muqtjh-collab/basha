import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/database';
import { env } from '../config/env';
import { TOKEN_EXPIRY } from '../config/constants';
import { AppError } from '../middleware/errorHandler';
import { LoginInput, ChangePasswordInput } from '../validators/auth.validators';
import { AuditService } from './auditService';

export class AuthService {
  /**
   * Authenticate a user and create a session.
   * Returns accessToken, refreshToken, and user info.
   */
  static async login(
    input: LoginInput,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    const { identifier, password } = input;

    // Find user by username or email
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      },
      include: {
        role: true
      }
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    if (user.status === 'suspended') {
      throw new AppError(403, 'USER_SUSPENDED', 'تم تعليق حسابك. يرجى الاتصال بالإدارة.');
    }

    if (user.status === 'deleted') {
      throw new AppError(401, 'USER_DELETED', 'عذراً، هذا الحساب لم يعد متاحاً.');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    // Generate refresh token and hash it
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    // Create session in database
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.REFRESH_MS);
    const session = await db.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      }
    });

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role.name,
        sessionId: session.id,
      },
      env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.ACCESS }
    );

    // Update last login timestamp
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Audit log
    await AuditService.logAction({
      userId: user.id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        fullNameAr: user.fullNameAr,
        role: {
          id: user.role.id,
          name: user.role.name,
          nameAr: user.role.nameAr,
          level: user.role.level,
        },
        branchId: user.branchId,
        geographicScope: user.geographicScope,
      }
    };
  }

  /**
   * Refresh the access and refresh tokens using a valid refresh token.
   */
  static async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new AppError(401, 'REFRESH_TOKEN_REQUIRED', 'رمز التحديث مطلوب.');
    }

    // Hash the raw refresh token to match database
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const session = await db.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    });

    if (!session || new Date() > session.expiresAt) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'رمز التحديث غير صالح أو منتهي الصلاحية.');
    }

    const { user } = session;

    if (user.status !== 'active') {
      throw new AppError(403, 'USER_INACTIVE', 'حساب المستخدم غير نشط حالياً.');
    }

    // Revoke old session (Token Rotation)
    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    // Generate new tokens
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.REFRESH_MS);

    // Create new session
    const newSession = await db.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt,
      }
    });

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role.name,
        sessionId: newSession.id,
      },
      env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.ACCESS }
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        fullNameAr: user.fullNameAr,
        role: {
          id: user.role.id,
          name: user.role.name,
          nameAr: user.role.nameAr,
          level: user.role.level,
        },
        branchId: user.branchId,
        geographicScope: user.geographicScope,
      }
    };
  }

  /**
   * Revoke a specific session (Logout).
   */
  static async logout(sessionId: string, userId: string, ipAddress?: string | null, userAgent?: string | null) {
    await db.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });

    await AuditService.logAction({
      userId,
      action: 'logout',
      entityType: 'session',
      entityId: sessionId,
      ipAddress,
      userAgent
    });
  }

  /**
   * Change user password.
   */
  static async changePassword(
    userId: string,
    input: ChangePasswordInput,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    const { oldPassword, newPassword } = input;

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'المستخدم غير موجود.');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(400, 'INVALID_PASSWORD', 'كلمة المرور القديمة غير صحيحة.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Revoke all other active sessions for security
    await db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date()
      }
    });

    await AuditService.logAction({
      userId,
      action: 'update',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent
    });
  }
}
export default AuthService;
