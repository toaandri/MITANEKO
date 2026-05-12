import { Router, Response } from 'express';
import Joi from 'joi';
import bcryptjs from 'bcryptjs';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  authorize,
  validate,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';

const router = Router();

const updateProfileSchema = Joi.object({
  nom: Joi.string().min(1).max(255).optional(),
  prenom: Joi.string().min(1).max(255).allow('', null).optional(),
  telephone: Joi.string().max(20).allow('', null).optional(),
  bio: Joi.string().max(2000).allow('', null).optional(),
  anonyme: Joi.boolean().optional(),
  commune_id: Joi.string().uuid().allow(null).optional(),
  quartier_id: Joi.string().uuid().allow(null).optional(),
  preferences_notifications: Joi.object().optional(),
  password: Joi.string().min(8).optional(),
  current_password: Joi.string().when('password', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
}).min(1);

const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const totalRow = await db.one(`SELECT COUNT(*)::int AS total FROM users`, []);
  const rows = await db.any(
    `SELECT id, email, nom, prenom, telephone, role, commune_id, quartier_id, status_compte, verified_email, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    success: true,
    data: rows,
    pagination: {
      page,
      limit,
      total: totalRow.total,
      pages: Math.ceil(totalRow.total / limit) || 1
    }
  });
});

const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const row = await db.oneOrNone(
    `SELECT id, email, nom, prenom, telephone, avatar_url, role, commune_id, quartier_id, bio,
            verified_email, anonyme, preferences_notifications, status_compte, created_at, updated_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!row) {
    const err: ApiError = new Error('Utilisateur introuvable');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, data: row });
});

const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const v = req.body as Record<string, unknown>;

  if (v.password) {
    const u = await db.one(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const ok = await bcryptjs.compare(String(v.current_password), u.password_hash);
    if (!ok) {
      const err: ApiError = new Error('Mot de passe actuel incorrect');
      err.statusCode = 400;
      throw err;
    }
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;

  const fields = [
    'nom',
    'prenom',
    'telephone',
    'bio',
    'anonyme',
    'commune_id',
    'quartier_id',
    'preferences_notifications'
  ] as const;

  for (const f of fields) {
    if (v[f] !== undefined) {
      sets.push(`${f} = $${n++}`);
      vals.push(v[f]);
    }
  }

  if (v.password) {
    sets.push(`password_hash = $${n++}`);
    vals.push(await bcryptjs.hash(String(v.password), 10));
  }

  if (!sets.length) {
    const err: ApiError = new Error('Aucun champ à mettre à jour');
    err.statusCode = 400;
    throw err;
  }

  vals.push(req.user.id);
  const updated = await db.one(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${n}
     RETURNING id, email, nom, prenom, telephone, avatar_url, role, commune_id, quartier_id, bio,
               verified_email, anonyme, preferences_notifications, updated_at`,
    vals
  );

  res.json({ success: true, data: updated });
});

router.get('/', authenticate, authorize('admin_plateforme'), getUsers);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
