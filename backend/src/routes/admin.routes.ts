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

const router = Router();

const metriqueSchema = Joi.object({
  titre: Joi.string().min(3).max(255).required(),
  contenu: Joi.string().min(10).required(),
  commune_id: Joi.string().uuid().allow(null).optional(),
  rapport_id: Joi.string().uuid().allow(null).optional(),
  indicateurs: Joi.object().default({}),
  publier: Joi.boolean().default(false)
});

/** GET /api/admin/dashboard — Vue nationale (sans classement) */
const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [global, parCommune, rapportsEnAttente] = await Promise.all([
    db.one(
      `SELECT
         (SELECT COUNT(*)::int FROM communes WHERE is_active = TRUE) AS nb_communes,
         (SELECT COUNT(*)::int FROM users WHERE role = 'citoyen' AND status_compte = 'actif') AS nb_citoyens,
         (SELECT COUNT(*)::int FROM publications WHERE is_archived = FALSE) AS nb_publications,
         (SELECT COUNT(*)::int FROM signalements WHERE status = 'resolu') AS signalements_resolus,
         (SELECT COUNT(*)::int FROM rapports_performance WHERE statut = 'soumis') AS rapports_a_traiter`
    ),
    db.any(
      `SELECT c.id, c.nom, c.region,
         (SELECT COUNT(*)::int FROM users u WHERE u.commune_id = c.id AND u.role = 'citoyen') AS nb_citoyens,
         (SELECT COUNT(*)::int FROM publications p WHERE p.commune_id = c.id AND p.is_archived = FALSE) AS nb_publications,
         (SELECT COUNT(*)::int FROM signalements s WHERE s.commune_id = c.id AND s.status = 'resolu') AS nb_resolus
       FROM communes c WHERE c.is_active = TRUE
       ORDER BY c.nom`
    ),
    db.any(
      `SELECT rp.*, c.nom AS commune_nom
       FROM rapports_performance rp JOIN communes c ON c.id = rp.commune_id
       WHERE rp.statut = 'soumis' ORDER BY rp.created_at ASC`
    )
  ]);

  res.json({
    success: true,
    data: {
      global,
      communes: parCommune,
      rapports_en_attente: rapportsEnAttente
    }
  });
});

/** GET /api/admin/rapports */
const listRapports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const statut = req.query.statut as string | undefined;
  const filters = statut ? `WHERE rp.statut = $1::rapport_statut` : '';
  const params = statut ? [statut] : [];

  const rows = await db.any(
    `SELECT rp.*, c.nom AS commune_nom, u.nom AS soumis_par_nom
     FROM rapports_performance rp
     JOIN communes c ON c.id = rp.commune_id
     LEFT JOIN users u ON u.id = rp.soumis_par
     ${filters}
     ORDER BY rp.created_at DESC`,
    params
  );

  res.json({ success: true, data: rows });
});

/** PATCH /api/admin/rapports/:id/publier — Valider et créer métrique publique */
const publishRapport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const rapport = await db.oneOrNone(`SELECT * FROM rapports_performance WHERE id = $1`, [req.params.id]);
  if (!rapport) {
    const err: ApiError = new Error('Rapport introuvable');
    err.statusCode = 404;
    throw err;
  }

  const result = await db.tx(async (t) => {
    await t.none(
      `UPDATE rapports_performance SET statut = 'publie', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );

    const metrique = await t.one(
      `INSERT INTO metriques_publiques
         (titre, contenu, commune_id, rapport_id, indicateurs, publie_par, is_visible, date_publication)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        rapport.titre,
        rapport.contenu || `Résultats MITANEKO — ${rapport.titre}`,
        rapport.commune_id,
        rapport.id,
        rapport.indicateurs,
        req.user!.id
      ]
    );

    return metrique;
  });

  res.json({
    success: true,
    message: 'Rapport publié sur le site public',
    data: result
  });
});

/** PATCH /api/admin/rapports/:id/rejeter */
const rejectRapport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await db.oneOrNone(
    `UPDATE rapports_performance SET statut = 'rejete', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!updated) {
    const err: ApiError = new Error('Rapport introuvable');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: updated });
});

/** GET /api/admin/metriques */
const listMetriques = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.any(
    `SELECT m.*, c.nom AS commune_nom
     FROM metriques_publiques m
     LEFT JOIN communes c ON c.id = m.commune_id
     ORDER BY m.created_at DESC`
  );
  res.json({ success: true, data: rows });
});

/** POST /api/admin/metriques — Créer une story d'impact manuelle */
const createMetrique = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { titre, contenu, commune_id, rapport_id, indicateurs, publier } = req.body;

  const row = await db.one(
    `INSERT INTO metriques_publiques
       (titre, contenu, commune_id, rapport_id, indicateurs, publie_par, is_visible, date_publication)
     VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $7 THEN CURRENT_TIMESTAMP ELSE NULL END)
     RETURNING *`,
    [
      titre,
      contenu,
      commune_id || null,
      rapport_id || null,
      JSON.stringify(indicateurs || {}),
      req.user.id,
      publier
    ]
  );

  res.status(201).json({ success: true, data: row });
});

/** PATCH /api/admin/metriques/:id/publier */
const publishMetrique = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await db.oneOrNone(
    `UPDATE metriques_publiques SET is_visible = TRUE, date_publication = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!updated) {
    const err: ApiError = new Error('Métrique introuvable');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: updated });
});

/** PATCH /api/admin/metriques/:id/masquer */
const hideMetrique = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await db.oneOrNone(
    `UPDATE metriques_publiques SET is_visible = FALSE WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!updated) {
    const err: ApiError = new Error('Métrique introuvable');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: updated });
});

router.use(authenticate, checkAccountStatus, authorize('admin_plateforme'));

router.get('/dashboard', getDashboard);
router.get('/rapports', listRapports);
router.patch('/rapports/:id/publier', publishRapport);
router.patch('/rapports/:id/rejeter', rejectRapport);
router.get('/metriques', listMetriques);
router.post('/metriques', validate(metriqueSchema), createMetrique);
router.patch('/metriques/:id/publier', publishMetrique);
router.patch('/metriques/:id/masquer', hideMetrique);

export default router;
