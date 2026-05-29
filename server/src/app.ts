import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import roleRoutes from './routes/role.routes';
import auditRoutes from './routes/audit.routes';
import userRoutes from './routes/user.routes';
import branchRoutes from './routes/branch.routes';
import customerRoutes from './routes/customer.routes';
import agentRoutes from './routes/agent.routes';
import vehicleRoutes from './routes/vehicle.routes';
import walletRoutes from './routes/wallet.routes';
import closureRoutes from './routes/closure.routes';
import customerPortalRoutes from './routes/customerPortal.routes';
import uploadsRoutes from './routes/uploads.routes';

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading uploaded resources (images/videos)
}));

app.use(cors({
  origin: env.NODE_ENV === 'development' ? true : false, // In prod, we proxy or serve from same host
  credentials: true
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Authenticated file serving for uploads — replaces unauthenticated express.static.
// All upload requests require a valid JWT. Customer-role users are blocked from
// private attachments (is_customer_visible = false).
app.use('/uploads', uploadsRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit-log', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/closures', closureRoutes);
app.use('/api/customer', customerPortalRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      time: new Date(),
      env: env.NODE_ENV
    }
  });
});

// Fallback 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message_ar: 'المورد المطلوب غير موجود.'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
