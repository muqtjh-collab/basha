import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { loginSchema, changePasswordSchema } from '../validators/auth.validators';
import { TOKEN_EXPIRY } from '../config/constants';
import { env } from '../config/env';

export class AuthController {
  static login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = await loginSchema.parseAsync(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login(validatedInput, ipAddress, userAgent);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRY.REFRESH_MS,
        path: '/api/auth'
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  static refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract refresh token from cookies
      const refreshToken = req.cookies.refreshToken;
      
      const result = await AuthService.refreshTokens(refreshToken);

      // Rotate cookie with new refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRY.REFRESH_MS,
        path: '/api/auth'
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  static logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionId;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      if (sessionId && userId) {
        await AuthService.logout(sessionId, userId, ipAddress, userAgent);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth'
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  static changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = await changePasswordSchema.parseAsync(req.body);
      const userId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await AuthService.changePassword(userId, validatedInput, ipAddress, userAgent);

      // Clear refresh token cookie since all other sessions are revoked
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth'
      });

      res.status(200).json({
        success: true,
        data: {
          message_ar: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى باستخدام كلمة المرور الجديدة.'
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
export default AuthController;
