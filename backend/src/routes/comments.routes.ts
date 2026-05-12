import { Router, Response, NextFunction } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  validate,
  optionalAuthenticate,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';

const router = Router();

const createSchema = Joi.object({
  signalement_id: Joi.string().uuid().required(),
  contenu: Joi.string().min(1).max(5000).required(),
  parent_id: Joi.string().uuid().allow(null).optional(),
  type_commentaire: Joi.string().max(50).default('general')
});

const modRoles = ['moderateur_quartier', 'acteur_communal', 'elu_commune', 'admin_plateforme'];

function requireModQueue(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.query.moderated === 'false') {
    return authenticate(req, res, next);
  }
  next();
}

const getComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const signalementId = req.query.signalement_id as string | undefined;
  if (!signalementId) {
    const err: ApiError = new Error('Paramètre signalement_id requis');
    err.statusCode = 400;
    throw err;
  }

  const wantQueue = req.query.moderated === 'false';

  if (wantQueue) {
    if (!req.user || !modRoles.includes(req.user.role)) {
      const err: ApiError = new Error('Accès réservé aux modérateurs');
      err.statusCode = 403;
      throw err;
    }
  }

  const rows = wantQueue
    ? await db.any(
        `SELECT c.*, u.nom AS author_nom, u.prenom AS author_prenom
         FROM commentaires c
         JOIN users u ON u.id = c.author_id
         WHERE c.signalement_id = $1 AND c.is_moderated = FALSE AND c.is_archived = FALSE
         ORDER BY c.created_at ASC
         LIMIT 500`,
        [signalementId]
      )
    : await db.any(
        `SELECT c.*, u.nom AS author_nom, u.prenom AS author_prenom
         FROM commentaires c
         JOIN users u ON u.id = c.author_id
         WHERE c.signalement_id = $1 AND c.is_moderated = TRUE AND c.is_archived = FALSE
         ORDER BY c.created_at ASC
         LIMIT 500`,
        [signalementId]
      );

  res.json({ success: true, data: rows });
});

const createComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { signalement_id, contenu, parent_id, type_commentaire } = req.body as {
    signalement_id: string;
    contenu: string;
    parent_id?: string | null;
    type_commentaire?: string;
  };

  const s = await db.oneOrNone(
    `SELECT id FROM signalements WHERE id = $1 AND is_archived = FALSE`,
    [signalement_id]
  );
  if (!s) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (parent_id) {
    const parent = await db.oneOrNone(
      `SELECT id FROM commentaires WHERE id = $1 AND signalement_id = $2`,
      [parent_id, signalement_id]
    );
    if (!parent) {
      const err: ApiError = new Error('Commentaire parent invalide');
      err.statusCode = 400;
      throw err;
    }
  }

  const row = await db.one(
    `INSERT INTO commentaires (signalement_id, author_id, contenu, parent_id, type_commentaire, is_moderated)
     VALUES ($1, $2, $3, $4, $5, FALSE)
     RETURNING *`,
    [signalement_id, req.user.id, contenu, parent_id ?? null, type_commentaire ?? 'general']
  );

  res.status(201).json({ success: true, message: 'Commentaire enregistré — en attente de modération', data: row });
});

const approveComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user || !modRoles.includes(req.user.role)) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  const { id } = req.params;
  const updated = await db.oneOrNone(
    `UPDATE commentaires SET is_moderated = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id]
  );
  if (!updated) {
    const err: ApiError = new Error('Commentaire introuvable');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, data: updated });
});

const deleteComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { id } = req.params;
  const row = await db.oneOrNone(
    `SELECT c.id, c.author_id, c.signalement_id, s.quartier_id, s.commune_id
     FROM commentaires c
     JOIN signalements s ON s.id = c.signalement_id
     WHERE c.id = $1`,
    [id]
  );
  if (!row) {
    const err: ApiError = new Error('Commentaire introuvable');
    err.statusCode = 404;
    throw err;
  }

  const isAuthor = row.author_id === req.user.id;
  const isAdmin = req.user.role === 'admin_plateforme';
  let isStaff = false;
  if (modRoles.includes(req.user.role)) {
    if (isAdmin) isStaff = true;
    else if (req.user.role === 'moderateur_quartier') {
      isStaff = !req.user.quartier_id || String(req.user.quartier_id) === String(row.quartier_id);
    } else if (req.user.commune_id) {
      isStaff = String(req.user.commune_id) === String(row.commune_id);
    }
  }

  if (!isAuthor && !isStaff) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  await db.none(`DELETE FROM commentaires WHERE id = $1`, [id]);
  res.json({ success: true, message: 'Commentaire supprimé' });
});

router.get('/', optionalAuthenticate, requireModQueue, getComments);
router.post('/', authenticate, validate(createSchema), createComment);
router.patch('/:id/approve', authenticate, approveComment);
router.delete('/:id', authenticate, deleteComment);

export default router;
