import { Router, Response } from 'express';
import { db } from '@config/database.js';
import { asyncHandler, authenticate, ApiError, AuthRequest } from '@middleware/errorHandler.js';

const router = Router();

const createVote = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { id: signalementId } = req.params;
  const s = await db.oneOrNone(
    `SELECT id, status FROM signalements WHERE id = $1 AND is_archived = FALSE`,
    [signalementId]
  );
  if (!s) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }

  const voteable = ['en_attente_vote', 'approuve', 'priorise'];
  if (!voteable.includes(s.status)) {
    const err: ApiError = new Error('Les votes ne sont pas ouverts pour ce signalement');
    err.statusCode = 400;
    throw err;
  }

  try {
    const vote = await db.one(
      `INSERT INTO votes (signalement_id, user_id, vote_type)
       VALUES ($1, $2, 'positif')
       RETURNING id, signalement_id, user_id, vote_type, created_at`,
      [signalementId, req.user.id]
    );

    const row = await db.one(
      `SELECT id, priorite_votes, status FROM signalements WHERE id = $1`,
      [signalementId]
    );

    res.status(201).json({
      success: true,
      message: 'Vote enregistré',
      data: { vote, signalement: row }
    });
  } catch (e: unknown) {
    const errObj = e as { code?: string };
    if (errObj.code === '23505') {
      const err: ApiError = new Error('Vous avez déjà voté pour ce signalement');
      err.statusCode = 409;
      throw err;
    }
    throw e;
  }
});

const removeVote = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { id: signalementId } = req.params;
  const r = await db.result(
    `DELETE FROM votes WHERE signalement_id = $1 AND user_id = $2`,
    [signalementId, req.user.id]
  );

  if (r.rowCount === 0) {
    const err: ApiError = new Error('Aucun vote à retirer');
    err.statusCode = 404;
    throw err;
  }

  const row = await db.one(
    `SELECT id, priorite_votes, status FROM signalements WHERE id = $1`,
    [signalementId]
  );

  res.json({ success: true, message: 'Vote retiré', data: { signalement: row } });
});

const getVotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const signalementId = req.query.signalement_id as string | undefined;
  if (!signalementId) {
    const err: ApiError = new Error('Paramètre signalement_id requis');
    err.statusCode = 400;
    throw err;
  }

  const rows = await db.any(
    `SELECT v.id, v.user_id, v.vote_type, v.created_at,
            u.nom, u.prenom
     FROM votes v
     JOIN users u ON u.id = v.user_id
     WHERE v.signalement_id = $1
     ORDER BY v.created_at DESC`,
    [signalementId]
  );

  res.json({ success: true, data: rows });
});

router.get('/', getVotes);
router.post('/signalements/:id/votes', authenticate, createVote);
router.delete('/signalements/:id/votes', authenticate, removeVote);

export default router;
