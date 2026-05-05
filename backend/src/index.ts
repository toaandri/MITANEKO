import express, { Express, Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Import routes
import authRoutes from '@routes/auth.routes.js';
import signalementRoutes from '@routes/signalements.routes.js';
import voteRoutes from '@routes/votes.routes.js';
import actionRoutes from '@routes/actions.routes.js';
import commentRoutes from '@routes/comments.routes.js';
import communeRoutes from '@routes/communes.routes.js';
import userRoutes from '@routes/users.routes.js';
import quarterRoutes from '@routes/quartiers.routes.js';
import analyticsRoutes from '@routes/analytics.routes.js';

// Import middleware
import { errorHandler } from '@middleware/errorHandler.js';
import { requestLogger } from '@middleware/requestLogger.js';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==========================================
// MIDDLEWARE
// ==========================================

// Security middleware
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
if (NODE_ENV !== 'test') {
  app.use(morgan(process.env.LOG_FORMAT || 'combined'));
}
app.use(requestLogger);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'MITANEKO Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// API ROUTES
// ==========================================

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Signalement routes
app.use('/api/signalements', signalementRoutes);

// Vote routes
app.use('/api/votes', voteRoutes);

// Action routes
app.use('/api/actions', actionRoutes);

// Comment routes
app.use('/api/comments', commentRoutes);

// Commune routes
app.use('/api/communes', communeRoutes);

// Quarter routes
app.use('/api/quartiers', quarterRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(errorHandler);

// ==========================================
// SERVER START
// ==========================================

app.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║     MITANEKO Backend API Running     ║
    ╚═══════════════════════════════════════╝
    
    🚀 Server: http://localhost:${PORT}
    🌍 Environment: ${NODE_ENV}
    📝 Docs: http://localhost:${PORT}/api/docs
    
    ✅ Ready to accept requests...
  `);
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
