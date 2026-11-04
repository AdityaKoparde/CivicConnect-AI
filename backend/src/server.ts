/** CivicConnect AI — Node/Express API server.
 *
 *  Responsibilities (AI logic lives in the Python service):
 *  - auth, roles, jurisdiction scoping, complaint workflow
 *  - routing validation, notifications, analytics, tracking privacy
 *  - calls the Python service via X-Service-Key for chat understanding */
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import path from 'path';

import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { attachUser } from './middleware/auth';
import { apiLimiter } from './middleware/rateLimit';
import { corsMiddleware, csrfGuard, securityHeaders } from './middleware/security';

import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import complaintsRoutes from './routes/complaints.routes';
import trackingRoutes from './routes/tracking.routes';
import catalogRoutes from './routes/catalog.routes';
import adminRoutes from './routes/admin.routes';
import notificationsRoutes from './routes/notifications.routes';
import uploadRoutes from './routes/upload.routes';

export const createApp = (): express.Express => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser());

  // ---- request logging (no bodies, no secrets) ----
  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      logger.info(`${req.method} ${req.originalUrl} ${_res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  app.use(attachUser);
  app.use(csrfGuard);

  // ---- API routes (rate limits applied inside route modules) ----
  // /api/health with database + AI status lives in catalog.routes.ts
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/complaints', complaintsRoutes);
  app.use('/api', trackingRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api/admin', apiLimiter, adminRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/files', uploadRoutes);

  // ---- 404 ----
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API endpoint not found', details: [] },
    });
  });

  // ---- static uploads (dev convenience; auth enforced per-file) ----
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));

  app.use(errorHandler);
  return app;
};

// Note: auth + catalog rate limiters are applied per-route inside
// routes/auth.routes.ts and routes/catalog.routes.ts.
const port = env.port;
if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(port, () => {
    logger.info(`CivicConnect API listening on http://localhost:${port}`);
    logger.info(`AI service target: ${env.aiServiceUrl}`);
  });
}

export default createApp;
