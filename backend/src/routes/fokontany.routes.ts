import { Router, Response } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  authorize,
  validate,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';
import { generateTokenCode } from '@utils/tokens.js';

const router = Router();

const FOKONTANY_ROLES = ['moderateur_quartier', 'acteur_communal', 'elu_commune', 'admin_plateforme'];

const createTokenSchema = Joi.object({
  type: Joi.string().valid('inscription', 'migration').default('inscription'),
  quartier_id: Joi.string().uuid().optional(),
  migration_from_quartier_id: Joi.string().uuid().when('type', {
    is: 'migration',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  expires_in_hours: Joi.number().integer().min(1).max(720).default(72),
  notes: Joi.string().max(500).allow('', null).optional()
});

async function assertFokontanyScope(
  user: NonNullable<AuthRequest['user']>,
  quartierId: string,
  communeId: string
): Promise<void> {
  if (user.role === 'admin_plateforme') return;

  if (user.role === 'moderateur_quartier') {
    if (user.quartier_id !== quartierId) {
      const err: ApiError = new Error('Vous ne gérez que les citoyens de votre fokontany');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  if (user.role === 'acteur_communal' || user.role === 'elu_commune') {
    if (user.commune_id !== communeId) {
      const err: ApiError = new Error('Hors périmètre communal');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const err: ApiError = new Error('Permissions insuffisantes');
  err.statusCode = 403;
  throw err;
}

/** POST /api/fokontany/tokens — Créer un code d'inscription ou de migration */
const createToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { type, migration_from_quartier_id, expires_in_hours, notes } = req.body;
  let quartierId = req.body.quartier_id as string | undefined;

  if (!quartierId) {
    if (req.user.role === 'moderateur_quartier') {
      if (!req.user.quartier_id) {
        const err: ApiError = new Error('Aucun fokontany associé à votre compte');
        err.statusCode = 400;
        throw err;
      }
      quartierId = req.user.quartier_id;
    } else {
      const err: ApiError = new Error('quartier_id requis');
      err.statusCode = 400;
      throw err;
    }
  }

  const quartier = await db.oneOrNone(
    `SELECT q.id, q.commune_id, q.nom, c.nom AS commune_nom
     FROM quartiers q
     JOIN communes c ON c.id = q.commune_id
     WHERE q.id = $1 AND q.is_active = TRUE`,
    [quartierId]
  );

  if (!quartier) {
    const err: ApiError = new Error('Fokontany introuvable');
    err.statusCode = 404;
    throw err;
  }

  await assertFokontanyScope(req.user, quartier.id, quartier.commune_id);

  if (type === 'migration' && migration_from_quartier_id) {
    const fromQ = await db.oneOrNone(`SELECT id, commune_id FROM quartiers WHERE id = $1`, [
      migration_from_quartier_id
    ]);
    if (!fromQ) {
      const err: ApiError = new Error('Fokontany source introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (fromQ.id === quartier.id) {
      const err: ApiError = new Error('Le fokontany source et destination sont identiques');
      err.statusCode = 400;
      throw err;
    }
  }

  let tokenCode = generateTokenCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await db.oneOrNone(
      `SELECT id FROM registration_tokens WHERE token_code = $1`,
      [tokenCode]
    );
    if (!exists) break;
    tokenCode = generateTokenCode();
  }

  const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

  const token = await db.one(
    `INSERT INTO registration_tokens
       (token_code, type, quartier_id, commune_id, created_by, migration_from_quartier_id, expires_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, token_code, type, quartier_id, commune_id, migration_from_quartier_id,
               expires_at, is_used, notes, created_at`,
    [
      tokenCode,
      type,
      quartier.id,
      quartier.commune_id,
      req.user.id,
      type === 'migration' ? migration_from_quartier_id : null,
      expiresAt,
      notes || null
    ]
  );

  res.status(201).json({
    success: true,
    message:
      type === 'migration'
        ? 'Code de migration fokontany créé'
        : 'Code d\'inscription créé — remettez-le au citoyen',
    data: {
      ...token,
      fokontany_nom: quartier.nom,
      commune_nom: quartier.commune_nom
    }
  });
});

/** GET /api/fokontany/tokens — Lister les tokens du fokontany géré */
const listTokens = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const filters: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (req.user.role === 'moderateur_quartier') {
    if (!req.user.quartier_id) {
      res.json({ success: true, data: [] });
      return;
    }
    filters.push(`rt.quartier_id = $${i++}`);
    params.push(req.user.quartier_id);
  } else if (req.user.role === 'acteur_communal' || req.user.role === 'elu_commune') {
    if (!req.user.commune_id) {
      res.json({ success: true, data: [] });
      return;
    }
    filters.push(`rt.commune_id = $${i++}`);
    params.push(req.user.commune_id);
  } else if (req.user.role !== 'admin_plateforme') {
    const err: ApiError = new Error('Permissions insuffisantes');
    err.statusCode = 403;
    throw err;
  }

  if (req.query.quartier_id) {
    filters.push(`rt.quartier_id = $${i++}`);
    params.push(req.query.quartier_id);
  }
  if (req.query.is_used === 'true') {
    filters.push('rt.is_used = TRUE');
  } else if (req.query.is_used === 'false') {
    filters.push('rt.is_used = FALSE');
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await db.any(
    `SELECT rt.id, rt.token_code, rt.type, rt.quartier_id, rt.commune_id,
            rt.migration_from_quartier_id, rt.expires_at, rt.is_used, rt.used_at,
            rt.notes, rt.created_at,
            q.nom AS fokontany_nom, qf.nom AS migration_from_nom,
            u.nom AS used_by_nom, u.pseudonyme AS used_by_pseudonyme
     FROM registration_tokens rt
     JOIN quartiers q ON q.id = rt.quartier_id
     LEFT JOIN quartiers qf ON qf.id = rt.migration_from_quartier_id
     LEFT JOIN users u ON u.id = rt.used_by
     ${where}
     ORDER BY rt.created_at DESC
     LIMIT 100`,
    params
  );

  res.json({ success: true, data: rows });
});

/** GET /api/fokontany/members — Citoyens du fokontany géré */
const listMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  let quartierId = req.query.quartier_id as string | undefined;

  if (req.user.role === 'moderateur_quartier') {
    quartierId = req.user.quartier_id || undefined;
  } else if (!quartierId && req.user.role !== 'admin_plateforme') {
    if (req.user.commune_id) {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
      const offset = (page - 1) * limit;

      const countRow = await db.one(
        `SELECT COUNT(*)::int AS total FROM users
         WHERE quartier_id IN (SELECT id FROM quartiers WHERE commune_id = $1)
           AND role = 'citoyen' AND status_compte = 'actif'`,
        [req.user.commune_id]
      );

      const rows = await db.any(
        `SELECT u.id, u.telephone, u.nom, u.prenom, u.pseudonyme, u.commune_id, u.quartier_id,
                u.status_compte, u.created_at, u.dernier_acces,
                q.nom AS fokontany_nom
         FROM users u
         LEFT JOIN quartiers q ON q.id = u.quartier_id
         WHERE u.quartier_id IN (SELECT id FROM quartiers WHERE commune_id = $1)
           AND u.role = 'citoyen'
         ORDER BY u.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.commune_id, limit, offset]
      );

      res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total: countRow.total,
          pages: Math.ceil(countRow.total / limit) || 1
        }
      });
      return;
    }
  }

  if (!quartierId) {
    const err: ApiError = new Error('quartier_id requis');
    err.statusCode = 400;
    throw err;
  }

  const quartier = await db.oneOrNone(`SELECT id, commune_id, nom FROM quartiers WHERE id = $1`, [
    quartierId
  ]);
  if (!quartier) {
    const err: ApiError = new Error('Fokontany introuvable');
    err.statusCode = 404;
    throw err;
  }

  await assertFokontanyScope(req.user, quartier.id, quartier.commune_id);

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const countRow = await db.one(
    `SELECT COUNT(*)::int AS total FROM users
     WHERE quartier_id = $1 AND role = 'citoyen'`,
    [quartierId]
  );

  const rows = await db.any(
    `SELECT u.id, u.telephone, u.nom, u.prenom, u.pseudonyme, u.commune_id, u.quartier_id,
            u.status_compte, u.created_at, u.dernier_acces
     FROM users u
     WHERE u.quartier_id = $1 AND u.role = 'citoyen'
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [quartierId, limit, offset]
  );

  res.json({
    success: true,
    data: rows,
    pagination: {
      page,
      limit,
      total: countRow.total,
      pages: Math.ceil(countRow.total / limit) || 1
    }
  });
});

/** DELETE /api/fokontany/tokens/:id — Révoquer un token non utilisé */
const revokeToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const token = await db.oneOrNone(
    `SELECT id, quartier_id, commune_id, is_used FROM registration_tokens WHERE id = $1`,
    [req.params.id]
  );

  if (!token) {
    const err: ApiError = new Error('Token introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (token.is_used) {
    const err: ApiError = new Error('Ce token a déjà été utilisé');
    err.statusCode = 400;
    throw err;
  }

  await assertFokontanyScope(req.user, token.quartier_id, token.commune_id);

  await db.none(`DELETE FROM registration_tokens WHERE id = $1`, [req.params.id]);

  res.json({ success: true, message: 'Token révoqué' });
});

/** GET /api/fokontany/verify/:code — Vérifier un code (public, sans révéler trop d'infos) */
const verifyToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const code = String(req.params.code || '').toUpperCase().trim();

  const token = await db.oneOrNone(
    `SELECT rt.type, rt.expires_at, rt.is_used, q.nom AS fokontany_nom, c.nom AS commune_nom
     FROM registration_tokens rt
     JOIN quartiers q ON q.id = rt.quartier_id
     JOIN communes c ON c.id = rt.commune_id
     WHERE rt.token_code = $1`,
    [code]
  );

  if (!token) {
    res.json({ success: true, data: { valid: false, reason: 'Code invalide' } });
    return;
  }

  if (token.is_used) {
    res.json({ success: true, data: { valid: false, reason: 'Code déjà utilisé' } });
    return;
  }

  if (new Date(token.expires_at) < new Date()) {
    res.json({ success: true, data: { valid: false, reason: 'Code expiré' } });
    return;
  }

  res.json({
    success: true,
    data: {
      valid: true,
      type: token.type,
      fokontany_nom: token.fokontany_nom,
      commune_nom: token.commune_nom,
      expires_at: token.expires_at
    }
  });
});

router.post('/tokens', authenticate, authorize(...FOKONTANY_ROLES), validate(createTokenSchema), createToken);
router.get('/tokens', authenticate, authorize(...FOKONTANY_ROLES), listTokens);
router.delete('/tokens/:id', authenticate, authorize(...FOKONTANY_ROLES), revokeToken);
router.get('/members', authenticate, authorize(...FOKONTANY_ROLES), listMembers);
router.get('/verify/:code', verifyToken);

export default router;
