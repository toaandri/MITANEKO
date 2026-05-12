import { Router, Response } from 'express';
import { db } from '@config/database.js';
import { asyncHandler, authenticate, ApiError, AuthRequest } from '@middleware/errorHandler.js';

const router = Router();

const staffRoles = ['acteur_communal', 'elu_commune', 'admin_plateforme'];

const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const communeId = req.query.commune_id as string | undefined;
  if (!communeId) {
    const err: ApiError = new Error('Paramètre commune_id requis');
    err.statusCode = 400;
    throw err;
  }

  const overview = await db.one(
    `SELECT
       (SELECT COUNT(*)::int FROM signalements WHERE commune_id = $1 AND is_archived = FALSE) AS signalements_total,
       (SELECT COUNT(*)::int FROM signalements WHERE commune_id = $1 AND status = 'resolu' AND is_archived = FALSE) AS resolus,
       (SELECT COALESCE(SUM(priorite_votes),0)::int FROM signalements WHERE commune_id = $1 AND is_archived = FALSE) AS votes_cumules,
       (SELECT COUNT(*)::int FROM votes v JOIN signalements s ON s.id = v.signalement_id WHERE s.commune_id = $1) AS votes_lignes,
       (SELECT COUNT(*)::int FROM actions WHERE commune_id = $1) AS actions_total`,
    [communeId]
  );

  const categories = await db.any(
    `SELECT categorie::text AS categorie, COUNT(*)::int AS total
     FROM signalements WHERE commune_id = $1 AND is_archived = FALSE
     GROUP BY categorie`,
    [communeId]
  );

  const statusMix = await db.any(
    `SELECT status::text AS status, COUNT(*)::int AS total
     FROM signalements WHERE commune_id = $1 AND is_archived = FALSE
     GROUP BY status`,
    [communeId]
  );

  res.json({
    success: true,
    data: {
      commune_id: communeId,
      overview,
      categories,
      status_mix: statusMix
    }
  });
});

const getReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const communeId = req.query.commune_id as string | undefined;
  if (!communeId) {
    const err: ApiError = new Error('Paramètre commune_id requis');
    err.statusCode = 400;
    throw err;
  }

  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const isAdmin = req.user.role === 'admin_plateforme';
  const isStaff = staffRoles.includes(req.user.role);
  const sameCommune = req.user.commune_id && String(req.user.commune_id) === String(communeId);

  if (!isAdmin && !(isStaff && sameCommune)) {
    const err: ApiError = new Error('Accès réservé aux élus et acteurs communaux');
    err.statusCode = 403;
    throw err;
  }

  const rows = await db.any(
    `SELECT * FROM statistiques_commune WHERE commune_id = $1 ORDER BY date DESC LIMIT 90`,
    [communeId]
  );

  res.json({ success: true, data: rows });
});

router.get('/', getAnalytics);
router.get('/reports', authenticate, getReports);

export default router;
