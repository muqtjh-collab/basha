import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { validate as isUuid } from 'uuid';

const TRACKING_STAGE_MAP: Record<string, string> = {
  PURCHASED: 'تم الشراء',
  PICKUP: 'قيد الاستلام',
  WAREHOUSE: 'في المستودع',
  PORT: 'في الميناء',
  SHIPPING: 'قيد الشحن',
  IRAQ_ARRIVAL: 'وصول العراق',
  CUSTOMS: 'التخليص الجمركي',
  DELIVERED: 'تم التسليم'
};

const INTERNAL_STAGE_TO_TRACKING_MAP: Record<string, string> = {
  AUCTION_PURCHASED: 'PURCHASED',
  VEHICLE_RELEASED: 'PURCHASED',
  CARRIER_PICKUP: 'PICKUP',
  INLAND_TRANSPORT: 'PICKUP',
  WAREHOUSE_ARRIVAL: 'WAREHOUSE',
  INITIAL_INSPECTION: 'WAREHOUSE',
  EXPORT_PREPARATION: 'WAREHOUSE',
  TITLE_PROCESSING: 'WAREHOUSE',
  PORT_DELIVERY_ORIGIN: 'PORT',
  PORT_TERMINAL_HANDLING: 'PORT',
  OCEAN_SHIPPING: 'SHIPPING',
  IRAQ_PORT_ARRIVAL: 'IRAQ_ARRIVAL',
  CUSTOMS_CLEARANCE: 'CUSTOMS',
  LOCAL_TRANSPORT: 'CUSTOMS',
  FINAL_DELIVERY: 'DELIVERED',
  POST_DELIVERY_ARCHIVE: 'DELIVERED'
};

export class CustomerPortalController {
  // Validate that user is customer and retrieve linked customer profile
  private static async getCustomerProfile(req: Request) {
    const user = req.user;
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'يرجى تسجيل الدخول للمتابعة.');
    }

    if (user.role.name !== 'customer') {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
    }

    const customer = await db.customer.findUnique({
      where: { userId: user.id }
    });

    if (!customer) {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
    }

    return customer;
  }

  static getVehicles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await CustomerPortalController.getCustomerProfile(req);

      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const cappedLimit = Math.min(limit, 50);
      const skip = (page - 1) * cappedLimit;

      const [vehicles, total] = await Promise.all([
        db.vehicle.findMany({
          where: { customerId: customer.id },
          skip,
          take: cappedLimit,
          orderBy: { createdAt: 'desc' }
        }),
        db.vehicle.count({ where: { customerId: customer.id } })
      ]);

      const formatted = vehicles.map(v => ({
        id: v.id,
        vin: v.vin,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        color_ar: v.colorAr,
        lot_number: v.lotNumber,
        auction_source: v.auctionSource,
        user_tracking_stage: v.userTrackingStage,
        user_tracking_stage_label: TRACKING_STAGE_MAP[v.userTrackingStage] || 'غير معروف',
        status: v.status,
        created_at: v.createdAt
      }));

      res.status(200).json({
        success: true,
        data: formatted,
        pagination: {
          page,
          limit: cappedLimit,
          total,
          pages: Math.ceil(total / cappedLimit)
        }
      });
    } catch (error) {
      next(error);
    }
  };

  static getVehicleDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await CustomerPortalController.getCustomerProfile(req);
      const { id } = req.params;

      if (!id || !isUuid(id)) {
        throw new AppError(400, 'BAD_REQUEST', 'معرّف المركبة غير صحيح.');
      }

      const vehicle = await db.vehicle.findUnique({
        where: { id }
      });

      // Data Isolation/Leak prevention: fail with 403 on ownership check failure
      if (!vehicle || vehicle.customerId !== customer.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه المركبة.');
      }

      res.status(200).json({
        success: true,
        data: {
          id: vehicle.id,
          vin: vehicle.vin,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          color_ar: vehicle.colorAr,
          lot_number: vehicle.lotNumber,
          auction_source: vehicle.auctionSource,
          user_tracking_stage: vehicle.userTrackingStage,
          user_tracking_stage_label: TRACKING_STAGE_MAP[vehicle.userTrackingStage] || 'غير معروف',
          status: vehicle.status,
          created_at: vehicle.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  };

  static getTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await CustomerPortalController.getCustomerProfile(req);
      const { id } = req.params;

      if (!id || !isUuid(id)) {
        throw new AppError(400, 'BAD_REQUEST', 'معرّف المركبة غير صحيح.');
      }

      const vehicle = await db.vehicle.findUnique({
        where: { id }
      });

      if (!vehicle || vehicle.customerId !== customer.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه المركبة.');
      }

      const transitions = await db.vehicleStageTransition.findMany({
        where: { vehicleId: id },
        orderBy: { createdAt: 'asc' }
      });

      const timeline = transitions.map(t => {
        const trackingStage = INTERNAL_STAGE_TO_TRACKING_MAP[t.toStage] || 'PURCHASED';
        const label = TRACKING_STAGE_MAP[trackingStage] || 'غير معروف';
        return {
          user_tracking_stage_label: label,
          created_at: t.createdAt
        };
      });

      res.status(200).json({
        success: true,
        data: timeline
      });
    } catch (error) {
      next(error);
    }
  };

  static getPhotos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await CustomerPortalController.getCustomerProfile(req);
      const { id } = req.params;

      if (!id || !isUuid(id)) {
        throw new AppError(400, 'BAD_REQUEST', 'معرّف المركبة غير صحيح.');
      }

      const vehicle = await db.vehicle.findUnique({
        where: { id }
      });

      if (!vehicle || vehicle.customerId !== customer.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه المركبة.');
      }

      const photos = await db.vehicleAttachment.findMany({
        where: {
          vehicleId: id,
          isCustomerVisible: true
        },
        orderBy: { uploadedAt: 'desc' }
      });

      const formatted = photos.map(p => ({
        id: p.id,
        file_url: p.fileUrl,
        file_name: p.fileName,
        uploaded_at: p.uploadedAt
      }));

      res.status(200).json({
        success: true,
        data: formatted
      });
    } catch (error) {
      next(error);
    }
  };
}
