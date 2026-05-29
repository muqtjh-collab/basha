import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /uploads/*
 *
 * Authenticated file-serving route for all uploaded attachments.
 *
 * Rules:
 * - All requests must include a valid JWT (authenticate middleware).
 * - If the requesting user has role 'customer':
 *     • The attachment MUST exist in the database with isCustomerVisible = true.
 *     • If the attachment is missing from DB or isCustomerVisible = false → HTTP 403.
 * - If the requesting user is any non-customer role (agent, admin, etc.):
 *     • Any file that exists on disk may be served (existing admin access is unchanged).
 * - If the file does not exist on disk → HTTP 404.
 *
 * This replaces the unconditional express.static('/uploads', ...) that was in app.ts.
 */
router.get('/*', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'يرجى تسجيل الدخول للمتابعة.');
    }

    // Build the relative file path as stored in the DB: e.g. "uploads/vehicles/uuid/filename.jpg"
    // req.params[0] is everything after /uploads/ in the URL
    const relativePath = `uploads/${req.params[0]}`;

    // For customer-role users: enforce is_customer_visible check
    if (user.role.name === 'customer') {
      const attachment = await db.vehicleAttachment.findFirst({
        where: { fileUrl: relativePath }
      });

      if (!attachment || !attachment.isCustomerVisible) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message_ar: 'لا تملك صلاحية الوصول إلى هذا الملف.'
          }
        });
      }
    }

    // Resolve absolute disk path.
    // At runtime: __dirname = server/dist/routes
    // Going 3 levels up reaches the project root (d:\xxxxx)
    // uploads folder is at project root: d:\xxxxx\uploads\<rest>
    const absolutePath = path.resolve(__dirname, '../../../uploads', req.params[0]);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message_ar: 'الملف المطلوب غير موجود.'
        }
      });
    }

    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
});

export default router;
