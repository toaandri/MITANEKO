import { Router, Response } from 'express';
import { db } from '@config/database.js';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

/** GET /api/public/impact — Stories d'impact publiées (site public) */
const getImpact = asyncHandler(async (_req, res: Response) => {
  const rows = await db.any(
    `SELECT m.id, m.titre, m.contenu, m.indicateurs, m.date_publication, m.created_at,
            c.nom AS commune_nom, c.region
     FROM metriques_publiques m
     LEFT JOIN communes c ON c.id = m.commune_id
     WHERE m.is_visible = TRUE
     ORDER BY m.date_publication DESC NULLS LAST, m.created_at DESC
     LIMIT 50`
  );

  const resume = await db.one(
    `SELECT
       (SELECT COUNT(*)::int FROM metriques_publiques WHERE is_visible = TRUE) AS stories_publiees,
       (SELECT COUNT(*)::int FROM communes WHERE is_active = TRUE) AS communes_partenaires,
       (SELECT COUNT(*)::int FROM signalements WHERE status = 'resolu') AS problemes_resolus,
       (SELECT COUNT(*)::int FROM users WHERE role = 'citoyen' AND status_compte = 'actif') AS citoyens_actifs`
  );

  res.json({
    success: true,
    data: {
      resume,
      stories: rows
    }
  });
});

/** GET /api/public/impact/:id */
const getImpactDetail = asyncHandler(async (req, res: Response) => {
  const row = await db.oneOrNone(
    `SELECT m.*, c.nom AS commune_nom, c.region, c.slug AS commune_slug
     FROM metriques_publiques m
     LEFT JOIN communes c ON c.id = m.commune_id
     WHERE m.id = $1 AND m.is_visible = TRUE`,
    [req.params.id]
  );

  if (!row) {
    return res.status(404).json({ success: false, message: 'Story introuvable' });
  }

  res.json({ success: true, data: row });
});

router.get('/impact', getImpact);
router.get('/impact/:id', getImpactDetail);

export default router;
