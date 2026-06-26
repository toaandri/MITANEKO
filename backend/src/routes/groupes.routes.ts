import { Router, Response } from 'express';
import { db } from '@config/database.js';
import { asyncHandler, optionalAuthenticate, AuthRequest } from '@middleware/errorHandler.js';

const router = Router();

/** GET /api/groupes-communaute — Groupes communautaires (filtrés par commune de l'utilisateur) */
const listGroupes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filters: string[] = ['gc.is_active = TRUE'];
  const params: unknown[] = [];
  let i = 1;

  if (req.query.commune_id) {
    filters.push(`gc.commune_id = $${i++}`);
    params.push(req.query.commune_id);
  } else if (req.user?.commune_id) {
    filters.push(`gc.commune_id = $${i++}`);
    params.push(req.user.commune_id);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await db.any(
    `SELECT gc.id, gc.commune_id, gc.nom, gc.slug, gc.description, gc.created_at,
            c.nom AS commune_nom
     FROM groupe_communautes gc
     JOIN communes c ON c.id = gc.commune_id
     ${where}
     ORDER BY gc.nom ASC`,
    params
  );

  res.json({ success: true, data: rows });
});

router.get('/', optionalAuthenticate, listGroupes);

export default router;
