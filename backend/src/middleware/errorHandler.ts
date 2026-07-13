import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ==========================================
// Error Handler Middleware
// ==========================================

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const environment = process.env.NODE_ENV;

  console.error('Error:', {
    status: statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: environment === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(environment === 'development' && { details: err.details, stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

// ==========================================
// Async Error Wrapper
// ==========================================

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==========================================
// Authentication Middleware
// ==========================================

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    commune_id?: string | null;
    quartier_id?: string | null;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      const error: ApiError = new Error('No token provided');
      error.statusCode = 401;
      throw error;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string;
      email: string;
      role: string;
      commune_id?: string | null;
      quartier_id?: string | null;
    };
    req.user = decoded;
    next();
  } catch (error) {
    const err: ApiError = new Error('Invalid token');
    err.statusCode = 401;
    res.status(401).json({ success: false, message: err.message });
  }
};

/** Bloque les comptes suspendus ou bannis (à placer après authenticate) */
export const checkAccountStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    next();
    return;
  }

  try {
    const { db } = await import('@config/database.js');
    const row = await db.oneOrNone(
      `SELECT status_compte, suspendu_jusqu_a FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!row) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    if (row.status_compte === 'banni') {
      return res.status(403).json({ success: false, message: 'Compte banni définitivement' });
    }

    if (row.status_compte === 'suspendu') {
      if (row.suspendu_jusqu_a && new Date(row.suspendu_jusqu_a) <= new Date()) {
        await db.none(
          `UPDATE users SET status_compte = 'actif', suspendu_jusqu_a = NULL WHERE id = $1`,
          [req.user.id]
        );
        next();
        return;
      }
      return res.status(403).json({
        success: false,
        message: 'Compte suspendu',
        suspendu_jusqu_a: row.suspendu_jusqu_a
      });
    }

    next();
  } catch {
    next();
  }
};

// ==========================================
// Authorization Middleware
// ==========================================

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/** Sets req.user when Authorization Bearer is valid; otherwise continues without user */
export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      next();
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string;
      email: string;
      role: string;
      commune_id?: string | null;
      quartier_id?: string | null;
    };
    req.user = decoded;
    next();
  } catch {
    next();
  }
};

// ==========================================
// Request Logger Middleware
// ==========================================

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

// ==========================================
// Validation Middleware
// ==========================================

export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const err: ApiError = new Error('Validation failed');
      err.statusCode = 400;
      err.details = error.details.map((d: any) => ({
        field: d.path.join('.'),
        message: d.message
      }));
      return res.status(400).json({
        success: false,
        message: err.message,
        details: err.details
      });
    }

    req.body = value;
    next();
  };
};

// ==========================================
// Not Found Middleware
// ==========================================

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path
  });
};
