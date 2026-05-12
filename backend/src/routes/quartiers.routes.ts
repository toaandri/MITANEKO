import { Router, Response } from 'express';
import { db } from '@config/database.js';
import { asyncHandler, ApiError, AuthRequest } from '@middleware/errorHandler.js';

const router = Router();

const getQuartiers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const communeId = req.query.commune_id as string | undefined;
  const filters: string[] = ['is_active = TRUE'];
  const params: unknown[] = [];
  let i = 1;

  if (communeId) {
    filters.push(`commune_id = $${i++}`);
    params.push(communeId);
  }

  const where = `WHERE ${filters.join(' AND ')}`;

  const rows = await db.any(
    `SELECT id, commune_id, nom, slug, description, population_estimee, zone_prioritaire, created_at,
            CASE WHEN localisation_centroide IS NULL THEN NULL
                 ELSE ST_AsGeoJSON(localisation_centroide::geometry)::json
            END AS localisation_centroide
     FROM quartiers
     ${where}
     ORDER BY nom ASC`,
    params
  );

  res.json({ success: true, data: rows });
});

const getQuartier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const row = await db.oneOrNone(
    `SELECT q.*,
            CASE WHEN q.localisation_centroide IS NULL THEN NULL
                 ELSE ST_AsGeoJSON(q.localisation_centroide::geometry)::json
            END AS localisation_centroide_geo
     FROM quartiers q WHERE q.id = $1`,
    [id]
  );
  if (!row) {
    const err: ApiError = new Error('Quartier introuvable');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: row });
});

router.get('/', getQuartiers);
router.get('/:id', getQuartier);

export default router;
