import { Router, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import Joi from 'joi';
import { db } from '@config/database.js';
import { validate, asyncHandler, ApiError } from '@middleware/errorHandler.js';

const router = Router();

// ==========================================
// Validation Schemas
// ==========================================

const registerSchema = Joi.object({
  nom: Joi.string().required(),
  prenom: Joi.string().required(),
  email: Joi.string().email().required(),
  telephone: Joi.string().optional(),
  password: Joi.string().min(8).required(),
  commune_id: Joi.string().uuid().optional(),
  quartier_id: Joi.string().uuid().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// ==========================================
// Auth Controllers
// ==========================================

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { nom, prenom, email, telephone, password, commune_id, quartier_id } = req.body;

  // Check if user exists
  const existingUser = await db.oneOrNone(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser) {
    const error: ApiError = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcryptjs.hash(password, 10);

  // Create user
  const user = await db.one(
    `INSERT INTO users (nom, prenom, email, telephone, password_hash, commune_id, quartier_id, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, nom, prenom, role, commune_id, quartier_id`,
    [nom, prenom, email, telephone || null, hashedPassword, commune_id || null, quartier_id || null, 'citoyen']
  );

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    commune_id: user.commune_id,
    quartier_id: user.quartier_id
  };

  // Generate tokens
  const accessOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] };
  const refreshOpts: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', accessOpts);

  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', refreshOpts);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role
      },
      accessToken,
      refreshToken
    }
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await db.oneOrNone(
    `SELECT id, email, nom, prenom, password_hash, role, commune_id, quartier_id
     FROM users WHERE email = $1 AND (status_compte IS NULL OR status_compte = 'actif')`,
    [email]
  );

  if (!user) {
    const error: ApiError = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Check password
  const isPasswordValid = await bcryptjs.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error: ApiError = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Generate tokens
  const accessOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] };
  const refreshOpts: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      commune_id: user.commune_id,
      quartier_id: user.quartier_id
    },
    process.env.JWT_SECRET || 'secret',
    accessOpts
  );

  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', refreshOpts);

  // Update last access
  await db.none('UPDATE users SET dernier_acces = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role
      },
      accessToken,
      refreshToken
    }
  });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    const error: ApiError = new Error('No refresh token provided');
    error.statusCode = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as any;
    const user = await db.one(
      `SELECT id, email, role, commune_id, quartier_id FROM users WHERE id = $1
       AND (status_compte IS NULL OR status_compte = 'actif')`,
      [decoded.id]
    );

    const accessOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] };
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        commune_id: user.commune_id,
        quartier_id: user.quartier_id
      },
      process.env.JWT_SECRET || 'secret',
      accessOpts
    );

    res.json({
      success: true,
      data: { accessToken: newAccessToken }
    });
  } catch (error) {
    const err: ApiError = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }
});

// ==========================================
// Routes
// ==========================================

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

export default router;
