import { Router, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
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

/** Inscription citoyen via code fokontany (usage unique) */
const registerWithTokenSchema = Joi.object({
  token_code: Joi.string().min(6).max(12).required(),
  telephone: Joi.string().min(8).max(20).required(),
  password: Joi.string().min(8).required(),
  pseudonyme: Joi.string().min(2).max(100).required(),
  nom: Joi.string().max(255).optional(),
  prenom: Joi.string().max(255).allow('', null).optional(),
  email: Joi.string().email().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  telephone: Joi.string().optional(),
  password: Joi.string().required()
}).or('email', 'telephone');

const loginWithTokenSchema = Joi.object({
  uid: Joi.string().uuid().required(),
  password: Joi.string().required()
});

function signTokens(user: {
  id: string;
  email: string | null;
  role: string;
  commune_id: string | null;
  quartier_id: string | null;
}) {
  const tokenPayload = {
    id: user.id,
    email: user.email || '',
    role: user.role,
    commune_id: user.commune_id,
    quartier_id: user.quartier_id
  };

  const accessOpts: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn']
  };
  const refreshOpts: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', accessOpts);
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', refreshOpts);

  return { accessToken, refreshToken };
}

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

  // Generate tokens
  const { accessToken, refreshToken } = signTokens(user);

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

/** Inscription via code fokontany — obligatoire pour les citoyens */
const registerWithToken = asyncHandler(async (req: Request, res: Response) => {
  const { token_code, telephone, password, pseudonyme, nom, prenom, email } = req.body;
  const code = String(token_code).toUpperCase().trim();

  const token = await db.oneOrNone(
    `SELECT rt.*, q.nom AS fokontany_nom
     FROM registration_tokens rt
     JOIN quartiers q ON q.id = rt.quartier_id
     WHERE rt.token_code = $1`,
    [code]
  );

  if (!token) {
    const err: ApiError = new Error('Code d\'inscription invalide');
    err.statusCode = 400;
    throw err;
  }
  if (token.is_used) {
    const err: ApiError = new Error('Ce code a déjà été utilisé');
    err.statusCode = 400;
    throw err;
  }
  if (new Date(token.expires_at) < new Date()) {
    const err: ApiError = new Error('Ce code a expiré — demandez-en un nouveau au fokontany');
    err.statusCode = 400;
    throw err;
  }

  const existingPhone = await db.oneOrNone(`SELECT id FROM users WHERE telephone = $1`, [telephone]);
  if (existingPhone) {
    const err: ApiError = new Error('Ce numéro de téléphone est déjà enregistré');
    err.statusCode = 409;
    throw err;
  }

  const existingPseudo = await db.oneOrNone(`SELECT id FROM users WHERE pseudonyme = $1`, [pseudonyme]);
  if (existingPseudo) {
    const err: ApiError = new Error('Ce pseudonyme est déjà pris');
    err.statusCode = 409;
    throw err;
  }

  if (token.type === 'migration') {
    if (!token.migration_from_quartier_id) {
      const err: ApiError = new Error('Token de migration mal configuré');
      err.statusCode = 400;
      throw err;
    }
  }

  const hashedPassword = await bcryptjs.hash(password, 10);
  const generatedEmail = email || `${uuidv4()}@citoyen.mitaneko.mg`;
  const displayNom = nom || pseudonyme;

  const user = await db.tx(async (t) => {
    if (token.type === 'migration') {
      const migrating = await t.oneOrNone(
        `SELECT id FROM users WHERE telephone = $1 AND quartier_id = $2 AND role = 'citoyen'`,
        [telephone, token.migration_from_quartier_id]
      );
      if (migrating) {
        const updated = await t.one(
          `UPDATE users SET quartier_id = $1, commune_id = $2, registration_token_id = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING id, email, nom, prenom, pseudonyme, role, commune_id, quartier_id, telephone`,
          [token.quartier_id, token.commune_id, token.id, migrating.id]
        );
        await t.none(
          `UPDATE registration_tokens SET is_used = TRUE, used_by = $1, used_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [migrating.id, token.id]
        );
        return updated;
      }
    }

    const created = await t.one(
      `INSERT INTO users (nom, prenom, email, telephone, password_hash, pseudonyme,
                          commune_id, quartier_id, registration_token_id, role, verified_telephone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
       RETURNING id, email, nom, prenom, pseudonyme, role, commune_id, quartier_id, telephone`,
      [
        displayNom,
        prenom || null,
        generatedEmail,
        telephone,
        hashedPassword,
        pseudonyme,
        token.commune_id,
        token.quartier_id,
        token.id,
        'citoyen'
      ]
    );

    await t.none(
      `UPDATE registration_tokens SET is_used = TRUE, used_by = $1, used_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [created.id, token.id]
    );

    return created;
  });

  const { accessToken, refreshToken } = signTokens(user);

  res.status(201).json({
    success: true,
    message:
      token.type === 'migration'
        ? 'Migration fokontany réussie'
        : 'Compte créé — bienvenue sur MITANEKO',
    data: {
      user: {
        id: user.id,
        uid: user.id,
        telephone: user.telephone,
        pseudonyme: user.pseudonyme,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        commune_id: user.commune_id,
        quartier_id: user.quartier_id,
        fokontany_nom: token.fokontany_nom
      },
      accessToken,
      refreshToken
    }
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, telephone, password } = req.body;

  let user;
  if (email) {
    user = await db.oneOrNone(
      `SELECT id, email, nom, prenom, pseudonyme, password_hash, role, commune_id, quartier_id, telephone
       FROM users WHERE email = $1 AND (status_compte IS NULL OR status_compte = 'actif')`,
      [email]
    );
  } else {
    user = await db.oneOrNone(
      `SELECT id, email, nom, prenom, pseudonyme, password_hash, role, commune_id, quartier_id, telephone
       FROM users WHERE telephone = $1 AND (status_compte IS NULL OR status_compte = 'actif')`,
      [telephone]
    );
  }

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
  const { accessToken, refreshToken } = signTokens(user);

  // Update last access
  await db.none('UPDATE users SET dernier_acces = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        uid: user.id,
        email: user.email,
        telephone: user.telephone,
        pseudonyme: user.pseudonyme,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        commune_id: user.commune_id,
        quartier_id: user.quartier_id
      },
      accessToken,
      refreshToken
    }
  });
});

/** Connexion par UID (uuid) + mot de passe — pratique mobile */
const loginWithUid = asyncHandler(async (req: Request, res: Response) => {
  const { uid, password } = req.body;

  const user = await db.oneOrNone(
    `SELECT id, email, nom, prenom, pseudonyme, password_hash, role, commune_id, quartier_id, telephone
     FROM users WHERE id = $1 AND (status_compte IS NULL OR status_compte = 'actif')`,
    [uid]
  );

  if (!user) {
    const err: ApiError = new Error('Identifiants invalides');
    err.statusCode = 401;
    throw err;
  }

  const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const err: ApiError = new Error('Identifiants invalides');
    err.statusCode = 401;
    throw err;
  }

  const { accessToken, refreshToken } = signTokens(user);
  await db.none('UPDATE users SET dernier_acces = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  res.json({
    success: true,
    message: 'Connexion réussie',
    data: {
      user: {
        id: user.id,
        uid: user.id,
        pseudonyme: user.pseudonyme,
        telephone: user.telephone,
        role: user.role,
        commune_id: user.commune_id,
        quartier_id: user.quartier_id
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
router.post('/register-with-token', validate(registerWithTokenSchema), registerWithToken);
router.post('/login', validate(loginSchema), login);
router.post('/login-uid', validate(loginWithTokenSchema), loginWithUid);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

export default router;
