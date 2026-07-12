import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { initSockets } from './sockets';
import { startCron } from './jobs/cron';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/routes';
import orgRoutes from './modules/org/routes';
import assetRoutes from './modules/assets/routes';
import allocationRoutes from './modules/allocations/routes';
import bookingRoutes from './modules/bookings/routes';
import maintenanceRoutes from './modules/maintenance/routes';
import auditRoutes from './modules/audits/routes';
import reportRoutes from './modules/reports/routes';
import notificationRoutes from './modules/notifications/routes';
import activityRoutes from './modules/activity/routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Static uploads.
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'assetflow-api', time: new Date().toISOString() }));

const api = express.Router();
api.use('/auth', authRoutes);
api.use('/', orgRoutes);
api.use('/assets', assetRoutes);
api.use('/', allocationRoutes);
api.use('/', bookingRoutes);
api.use('/maintenance', maintenanceRoutes);
api.use('/', auditRoutes);
api.use('/reports', reportRoutes);
api.use('/notifications', notificationRoutes);
api.use('/activity-logs', activityRoutes);

app.use('/api/v1', api);

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
initSockets(server);
startCron();

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  AssetFlow API running on http://localhost:${env.PORT}`);
  console.log(`  Socket.IO ready — CORS origin: ${env.WEB_ORIGIN}\n`);
});
