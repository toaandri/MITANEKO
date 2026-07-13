import { Router, Response } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  authorize,
  validate,
  checkAccountStatus,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';
import {
  assertCommuneScope,
  COMMUNE_STAFF_ROLES,
  resolveCommuneId
} from '@utils/communeScope.js';

const router = Router();

const actionSchema = Joi.object({
  action: Joi.string()
    .valid('approuver', 'supprimer', 'suspendre_auteur', 'ignorer')
    .required(),
  motif: Joi.string().max(2000).allow('', null).optional(),
  duree_jours: Joi.number().integer().min(1).max(365).when('action', {
    is: 'suspendre_auteur',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  duree_mois: Joi.number().integer().min(1).max(24).when('action', {
    is: 'suspendre_auteur',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  bannissement: Joi.boolean().default(false)
});

const sanctionSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  type: Joi.string().valid('avertissement', 'suspension', 'bannissement').required(),
  motif: Joi.string().min(5).max(2000).required(),
  duree_jours: Joi.number().integer().min(1).max(365).optional(),
  duree_mois: Joi.number().integer().min(1).max(24).optional(),
  entity_type: Joi.string().valid('publication', 'commentaire', 'signalement').optional(),
  entity_id: Joi.string().uuid().optional()
});

const reportSchema = Joi.object({
  entity_type: Joi.string().valid('publication', 'commentaire', 'signalement').required(),
  entity_id: Joi.string().uuid().required(),
  raison: Joi.string().min(5).max(2000).required()
});

async function applySanction(
  userId: string,
  communeId: string,
  type: string,
  motif: string,
  sanctionnePar: string,
  dureeJours?: number,
  entityType?: string,
  entityId?: string
): Promise<void> {
  let expireLe: Date | null = null;
  let statusCompte = 'actif';

  if (type === 'suspension') {
    const days = dureeJours || 7;
    expireLe = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    statusCompte = 'suspendu';
  } else if (type === 'bannissement') {
    statusCompte = 'banni';
  }

  await db.tx(async (t) => {
    await t.none(
      `INSERT INTO sanctions (user_id, commune_id, type, duree_jours, expire_le, motif, sanctionne_par, entity_type, entity_id)
       VALUES ($1,$2,$3::sanction_type,$4,$5,$6,$7,$8::moderation_entity_type,$9)`,
      [
        userId,
        communeId,
        type,
        dureeJours || null,
        expireLe,
        motif,
        sanctionnePar,
        entityType || null,
        entityId || null
      ]
    );

    if (type !== 'avertissement') {
      await t.none(
        `UPDATE users SET status_compte = $1, suspendu_jusqu_a = $2, nb_sanctions = nb_sanctions + 1 WHERE id = $3`,
        [statusCompte, expireLe, userId]
      );
    } else {
      await t.none(`UPDATE users SET nb_sanctions = nb_sanctions + 1 WHERE id = $1`, [userId]);
    }
  });
}

/** GET /api/moderation/queue — File de censure (IA + signalements) */
const getQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.query.commune_id as string | undefined);
  await assertCommuneScope(req.user, communeId, db);

  const rows = await db.any(
    `SELECT mq.*,
            CASE mq.entity_type
              WHEN 'publication' THEN (SELECT titre FROM publications WHERE id = mq.entity_id)
              WHEN 'commentaire' THEN (SELECT LEFT(contenu, 100) FROM commentaires WHERE id = mq.entity_id)
              WHEN 'signalement' THEN (SELECT titre FROM signalements WHERE id = mq.entity_id)
            END AS contenu_apercu
     FROM moderation_queue mq
     WHERE mq.commune_id = $1 AND mq.statut = 'en_attente'
     ORDER BY mq.created_at ASC`,
    [communeId]
  );

  const commentaires = await db.any(
    `SELECT c.id, c.contenu, c.created_at, c.signalement_id, u.pseudonyme, u.nom, u.id AS author_id
     FROM commentaires c JOIN users u ON u.id = c.author_id
     WHERE c.is_moderated = FALSE
       AND EXISTS (
         SELECT 1 FROM signalements s WHERE s.id = c.signalement_id AND s.commune_id = $1
       )
     ORDER BY c.created_at ASC`,
    [communeId]
  );

  res.json({
    success: true,
    data: {
      file_ia: rows,
      commentaires_en_attente: commentaires
    }
  });
});

/** POST /api/moderation/signaler — Signaler un contenu */
const reportContent = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { entity_type, entity_id, raison } = req.body;
  let communeId: string;

  if (entity_type === 'publication') {
    const p = await db.oneOrNone(`SELECT commune_id FROM publications WHERE id = $1`, [entity_id]);
    if (!p) {
      const err: ApiError = new Error('Publication introuvable');
      err.statusCode = 404;
      throw err;
    }
    communeId = p.commune_id;
  } else if (entity_type === 'commentaire') {
    const c = await db.oneOrNone(
      `SELECT s.commune_id FROM commentaires c JOIN signalements s ON s.id = c.signalement_id WHERE c.id = $1`,
      [entity_id]
    );
    if (!c) {
      const err: ApiError = new Error('Commentaire introuvable');
      err.statusCode = 404;
      throw err;
    }
    communeId = c.commune_id;
  } else {
    const s = await db.oneOrNone(`SELECT commune_id FROM signalements WHERE id = $1`, [entity_id]);
    if (!s) {
      const err: ApiError = new Error('Signalement introuvable');
      err.statusCode = 404;
      throw err;
    }
    communeId = s.commune_id;
  }

  const row = await db.one(
    `INSERT INTO moderation_queue (entity_type, entity_id, commune_id, signale_par, raison, statut)
     VALUES ($1::moderation_entity_type,$2,$3,$4,$5,'en_attente')
     RETURNING *`,
    [entity_type, entity_id, communeId, req.user.id, raison]
  );

  res.status(201).json({ success: true, data: row });
});

/** PATCH /api/moderation/queue/:id — Traiter un élément de la file */
const processQueueItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const item = await db.oneOrNone(`SELECT * FROM moderation_queue WHERE id = $1`, [req.params.id]);
  if (!item) {
    const err: ApiError = new Error('Élément introuvable');
    err.statusCode = 404;
    throw err;
  }
  await assertCommuneScope(req.user, item.commune_id, db);

  const { action, motif, duree_jours, duree_mois, bannissement } = req.body;
  let authorId: string | null = null;

  if (item.entity_type === 'publication') {
    const p = await db.oneOrNone(`SELECT creator_id FROM publications WHERE id = $1`, [item.entity_id]);
    authorId = p?.creator_id || null;
  } else if (item.entity_type === 'commentaire') {
    const c = await db.oneOrNone(`SELECT author_id FROM commentaires WHERE id = $1`, [item.entity_id]);
    authorId = c?.author_id || null;
  } else if (item.entity_type === 'signalement') {
    const s = await db.oneOrNone(`SELECT creator_id FROM signalements WHERE id = $1`, [item.entity_id]);
    authorId = s?.creator_id || null;
  }

  await db.tx(async (t) => {
    if (action === 'supprimer') {
      if (item.entity_type === 'publication') {
        await t.none(
          `UPDATE publications SET is_archived = TRUE, moderation_statut = 'supprime' WHERE id = $1`,
          [item.entity_id]
        );
      } else if (item.entity_type === 'commentaire') {
        await t.none(`DELETE FROM commentaires WHERE id = $1`, [item.entity_id]);
      } else if (item.entity_type === 'signalement') {
        await t.none(
          `UPDATE signalements SET
             status = 'rejete',
             modere = TRUE,
             modere_par = $2,
             date_moderation = CURRENT_TIMESTAMP,
             raison_rejet = $3,
             is_archived = TRUE
           WHERE id = $1`,
          [item.entity_id, req.user!.id, motif || 'Supprimé par modération']
        );
      }
    } else if (action === 'approuver') {
      if (item.entity_type === 'publication') {
        await t.none(`UPDATE publications SET moderation_statut = 'approuve' WHERE id = $1`, [item.entity_id]);
      } else if (item.entity_type === 'commentaire') {
        await t.none(`UPDATE commentaires SET is_moderated = TRUE WHERE id = $1`, [item.entity_id]);
      } else if (item.entity_type === 'signalement') {
        await t.none(
          `UPDATE signalements SET
             status = 'en_attente_vote',
             modere = TRUE,
             modere_par = $2,
             date_moderation = CURRENT_TIMESTAMP,
             raison_rejet = NULL
           WHERE id = $1`,
          [item.entity_id, req.user!.id]
        );
      }
    } else if (action === 'suspendre_auteur' && authorId) {
      const days = bannissement ? undefined : duree_jours || (duree_mois ? duree_mois * 30 : 7);
      const type = bannissement ? 'bannissement' : 'suspension';
      const expireLe = type === 'suspension' && days
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;
      const statusCompte = type === 'bannissement' ? 'banni' : 'suspendu';

      await t.none(
        `INSERT INTO sanctions (user_id, commune_id, type, duree_jours, expire_le, motif, sanctionne_par, entity_type, entity_id)
         VALUES ($1,$2,$3::sanction_type,$4,$5,$6,$7,$8::moderation_entity_type,$9)`,
        [
          authorId,
          item.commune_id,
          type,
          days || null,
          expireLe,
          motif || 'Modération',
          req.user!.id,
          item.entity_type,
          item.entity_id
        ]
      );
      await t.none(
        `UPDATE users SET status_compte = $1, suspendu_jusqu_a = $2, nb_sanctions = nb_sanctions + 1 WHERE id = $3`,
        [statusCompte, expireLe, authorId]
      );
    }

    const statutMap: Record<string, string> = {
      approuver: 'approuve',
      supprimer: 'supprime',
      suspendre_auteur: 'suspendu_auteur',
      ignorer: 'approuve'
    };

    await t.none(
      `UPDATE moderation_queue SET statut = $1::moderation_statut, action_prise = $2,
         traite_par = $3, date_traitement = CURRENT_TIMESTAMP WHERE id = $4`,
      [statutMap[action] || 'approuve', action, req.user!.id, req.params.id]
    );
  });

  res.json({ success: true, message: 'Action de modération appliquée' });
});

/** POST /api/moderation/sanctions — Appliquer une sanction directement */
const createSanction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.body.commune_id);
  await assertCommuneScope(req.user, communeId, db);

  const { user_id, type, motif, duree_jours, duree_mois, entity_type, entity_id } = req.body;

  const target = await db.oneOrNone(`SELECT id, nb_sanctions FROM users WHERE id = $1`, [user_id]);
  if (!target) {
    const err: ApiError = new Error('Utilisateur introuvable');
    err.statusCode = 404;
    throw err;
  }

  let finalType = type;
  if (type === 'suspension' && (target.nb_sanctions || 0) >= 2) {
    finalType = 'bannissement';
  }

  const days = duree_jours || (duree_mois ? duree_mois * 30 : undefined);
  await applySanction(user_id, communeId, finalType, motif, req.user.id, days, entity_type, entity_id);

  res.status(201).json({
    success: true,
    message: finalType === 'bannissement' ? 'Utilisateur banni' : 'Sanction appliquée',
    data: { type: finalType }
  });
});

/** GET /api/moderation/sanctions */
const listSanctions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.query.commune_id as string | undefined);
  await assertCommuneScope(req.user, communeId, db);

  const rows = await db.any(
    `SELECT s.*, u.pseudonyme, u.nom, u.prenom
     FROM sanctions s JOIN users u ON u.id = s.user_id
     WHERE s.commune_id = $1 ORDER BY s.created_at DESC LIMIT 100`,
    [communeId]
  );

  res.json({ success: true, data: rows });
});

router.get('/queue', authenticate, checkAccountStatus, authorize(...COMMUNE_STAFF_ROLES), getQueue);
router.post('/signaler', authenticate, checkAccountStatus, validate(reportSchema), reportContent);
router.patch(
  '/queue/:id',
  authenticate,
  checkAccountStatus,
  authorize(...COMMUNE_STAFF_ROLES),
  validate(actionSchema),
  processQueueItem
);
router.post(
  '/sanctions',
  authenticate,
  checkAccountStatus,
  authorize(...COMMUNE_STAFF_ROLES),
  validate(sanctionSchema),
  createSanction
);
router.get('/sanctions', authenticate, checkAccountStatus, authorize(...COMMUNE_STAFF_ROLES), listSanctions);

export default router;
