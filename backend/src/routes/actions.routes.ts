import { Router, Response } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  validate,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';

const router = Router();

const createSchema = Joi.object({
  signalement_id: Joi.string().uuid().required(),
  titre: Joi.string().min(3).max(255).required(),
  description: Joi.string().allow('', null).optional(),
  equipe_responsable: Joi.string().max(255).allow('', null).optional(),
  responsable_id: Joi.string().uuid().allow(null).optional(),
  date_cible: Joi.date().allow(null).optional(),
  budget_estime: Joi.number().allow(null).optional(),
  priorite: Joi.number().integer().min(0).optional()
});

const updateSchema = Joi.object({
  titre: Joi.string().min(3).max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  equipe_responsable: Joi.string().max(255).allow('', null).optional(),
  responsable_id: Joi.string().uuid().allow(null).optional(),
  date_cible: Joi.date().allow(null).optional(),
  date_debut: Joi.date().allow(null).optional(),
  date_fin: Joi.date().allow(null).optional(),
  budget_estime: Joi.number().allow(null).optional(),
  priorite: Joi.number().integer().min(0).optional(),
  photo_avant_url: Joi.string().max(2048).allow('', null).optional(),
  photo_apres_url: Joi.string().max(2048).allow('', null).optional(),
  notes_progression: Joi.string().allow('', null).optional(),
  ressources_allouees: Joi.string().max(500).allow('', null).optional()
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid('assignee', 'en_attente', 'en_cours', 'resolu', 'annulee').required()
});

const actorRoles = ['acteur_communal', 'elu_commune', 'admin_plateforme'];

function assertActor(req: AuthRequest) {
  if (!req.user || !actorRoles.includes(req.user.role)) {
    const err: ApiError = new Error('Accès réservé aux acteurs communaux');
    err.statusCode = 403;
    throw err;
  }
}

const getActions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filters: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (req.query.commune_id) {
    filters.push(`a.commune_id = $${i++}`);
    params.push(req.query.commune_id);
  }
  if (req.query.signalement_id) {
    filters.push(`a.signalement_id = $${i++}`);
    params.push(req.query.signalement_id);
  }
  if (req.query.status) {
    filters.push(`a.status = $${i++}::action_status`);
    params.push(req.query.status);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await db.any(
    `SELECT a.*, s.titre AS signalement_titre, c.nom AS commune_nom
     FROM actions a
     JOIN signalements s ON s.id = a.signalement_id
     JOIN communes c ON c.id = a.commune_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT 200`,
    params
  );

  res.json({ success: true, data: rows });
});

const createAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertActor(req);
  if (!req.user) return;

  const { signalement_id, titre, description, equipe_responsable, responsable_id, date_cible, budget_estime, priorite } =
    req.body as Record<string, unknown>;

  const s = await db.oneOrNone(
    `SELECT id, commune_id, status FROM signalements WHERE id = $1 AND is_archived = FALSE`,
    [signalement_id]
  );
  if (!s) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }

  const allowed = ['priorise', 'approuve', 'en_attente_vote'];
  if (!allowed.includes(s.status)) {
    const err: ApiError = new Error('Ce signalement ne peut pas recevoir d’action pour l’instant');
    err.statusCode = 400;
    throw err;
  }

  if (req.user.role !== 'admin_plateforme' && req.user.commune_id && String(req.user.commune_id) !== String(s.commune_id)) {
    const err: ApiError = new Error('Hors périmètre de votre commune');
    err.statusCode = 403;
    throw err;
  }

  const open = await db.oneOrNone(
    `SELECT id FROM actions WHERE signalement_id = $1 AND status NOT IN ('resolu', 'annulee')`,
    [signalement_id]
  );
  if (open) {
    const err: ApiError = new Error('Une action est déjà en cours pour ce signalement');
    err.statusCode = 409;
    throw err;
  }

  const created = await db.tx(async (t) => {
    const a = await t.one(
      `
      INSERT INTO actions (
        signalement_id, commune_id, titre, description, status,
        equipe_responsable, responsable_id, date_cible, budget_estime, priorite, created_by
      ) VALUES (
        $1, $2, $3, $4, 'assignee',
        $5, $6, $7, $8, $9, $10
      )
      RETURNING *
      `,
      [
        signalement_id,
        s.commune_id,
        titre,
        description ?? null,
        equipe_responsable ?? null,
        responsable_id ?? null,
        date_cible ?? null,
        budget_estime ?? null,
        priorite ?? 0,
        req.user!.id
      ]
    );

    await t.none(
      `UPDATE signalements SET status = 'en_cours', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [signalement_id]
    );

    return a;
  });

  res.status(201).json({ success: true, message: 'Action créée', data: created });
});

const updateAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertActor(req);
  if (!req.user) return;

  const { id } = req.params;
  const existing = await db.oneOrNone(`SELECT id, commune_id FROM actions WHERE id = $1`, [id]);
  if (!existing) {
    const err: ApiError = new Error('Action introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (req.user.role !== 'admin_plateforme' && req.user.commune_id && String(req.user.commune_id) !== String(existing.commune_id)) {
    const err: ApiError = new Error('Hors périmètre');
    err.statusCode = 403;
    throw err;
  }

  const v = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;

  const map: [string, string][] = [
    ['titre', 'titre'],
    ['description', 'description'],
    ['equipe_responsable', 'equipe_responsable'],
    ['responsable_id', 'responsable_id'],
    ['date_cible', 'date_cible'],
    ['date_debut', 'date_debut'],
    ['date_fin', 'date_fin'],
    ['budget_estime', 'budget_estime'],
    ['priorite', 'priorite'],
    ['photo_avant_url', 'photo_avant_url'],
    ['photo_apres_url', 'photo_apres_url'],
    ['notes_progression', 'notes_progression'],
    ['ressources_allouees', 'ressources_allouees']
  ];

  for (const [key, col] of map) {
    if (v[key] !== undefined) {
      sets.push(`${col} = $${n++}`);
      vals.push(v[key]);
    }
  }

  if (!sets.length) {
    const err: ApiError = new Error('Aucun champ à mettre à jour');
    err.statusCode = 400;
    throw err;
  }

  vals.push(id);
  const updated = await db.one(
    `UPDATE actions SET ${sets.join(', ')} WHERE id = $${n} RETURNING *`,
    vals
  );

  res.json({ success: true, data: updated });
});

const patchStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  assertActor(req);
  if (!req.user) return;

  const { id } = req.params;
  const { status } = req.body as { status: string };

  const row = await db.oneOrNone(
    `SELECT a.id, a.signalement_id, a.commune_id, a.status AS current_status
     FROM actions a WHERE a.id = $1`,
    [id]
  );
  if (!row) {
    const err: ApiError = new Error('Action introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (req.user.role !== 'admin_plateforme' && req.user.commune_id && String(req.user.commune_id) !== String(row.commune_id)) {
    const err: ApiError = new Error('Hors périmètre');
    err.statusCode = 403;
    throw err;
  }

  const updated = await db.tx(async (t) => {
    const a = await t.one(
      `UPDATE actions SET status = $1::action_status, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (status === 'resolu') {
      await t.none(
        `UPDATE signalements SET status = 'resolu', date_resolution = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.signalement_id]
      );
    }

    if (status === 'annulee') {
      await t.none(
        `UPDATE signalements SET status = 'ferme', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.signalement_id]
      );
    }

    return a;
  });

  res.json({ success: true, data: updated });
});

router.get('/', getActions);
router.post('/', authenticate, validate(createSchema), createAction);
router.put('/:id', authenticate, validate(updateSchema), updateAction);
router.patch('/:id/status', authenticate, validate(statusSchema), patchStatus);

export default router;
