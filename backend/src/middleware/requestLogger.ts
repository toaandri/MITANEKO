import { Request, Response, NextFunction } from 'express';

// ==========================================
// Request Logger Middleware
// ==========================================

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  if (process.env.LOG_LEVEL === 'debug') {
    console.log(`
      📨 [${timestamp}] ${req.method} ${req.path}
      └─ IP: ${req.ip}
      └─ Body: ${JSON.stringify(req.body).substring(0, 200)}
    `);
  }

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '❌' : '✅';

    console.log(`${statusColor} [${timestamp}] ${req.method} ${req.path} - ${statusCode} - ${duration}ms`);
  });

  next();
};
