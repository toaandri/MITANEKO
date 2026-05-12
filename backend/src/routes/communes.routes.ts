import { Router, Response } from 'express';
import { db } from '@config/database.js';
import { asyncHandler, ApiError, AuthRequest } from '@middleware/errorHandler.js';

const router = Router();

const getCommunes = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const rows = await db.any(
    `SELECT id, nom, slug, code_commune, region, description, statut_partenariat, population_estimee,
            nb_quartiers, is_active, created_at,
            CASE WHEN localisation IS NULL THEN NULL
                 ELSE ST_AsGeoJSON(localisation::geometry)::json
            END AS localisation
     FROM communes
     WHERE is_active = TRUE
     ORDER BY nom ASC`
  );
  res.json({ success: true, data: rows });
});

const getCommune = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const row = await db.oneOrNone(
    `SELECT *, CASE WHEN localisation IS NULL THEN NULL
                    ELSE ST_AsGeoJSON(localisation::geometry)::json
               END AS localisation_geo
     FROM communes WHERE id = $1`,
    [id]
  );
  if (!row) {
    const err: ApiError = new Error('Commune introuvable');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: row });
});

const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const counts = await db.one(
    `SELECT
       (SELECT COUNT(*)::int FROM signalements WHERE commune_id = $1 AND is_archived = FALSE) AS signalements_total,
       (SELECT COUNT(*)::int FROM signalements WHERE commune_id = $1 AND status = 'resolu' AND is_archived = FALSE) AS signalements_resolus,
       (SELECT COUNT(*)::int FROM signalements WHERE commune_id = $1 AND status = 'en_cours' AND is_archived = FALSE) AS signalements_en_cours,
       (SELECT COUNT(*)::int FROM actions WHERE commune_id = $1) AS actions_total,
       (SELECT COUNT(*)::int FROM actions WHERE commune_id = $1 AND status = 'resolu') AS actions_resolues,
       (SELECT COUNT(*)::int FROM users WHERE commune_id = $1) AS utilisateurs`,
    [id]
  );

  const byCategory = await db.any(
    `SELECT categorie::text AS categorie, COUNT(*)::int AS total
     FROM signalements
     WHERE commune_id = $1 AND is_archived = FALSE
     GROUP BY categorie
     ORDER BY total DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      commune_id: id,
      counts,
      signalements_par_categorie: byCategory
    }
  });
});

const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const rows = await db.any(
    `SELECT * FROM statistiques_commune WHERE commune_id = $1 ORDER BY date DESC LIMIT 30`,
    [id]
  );
  res.json({ success: true, data: rows });
});

router.get('/', getCommunes);
router.get('/:id/dashboard', getDashboard);
router.get('/:id/stats', getStats);
router.get('/:id', getCommune);

export default router;
