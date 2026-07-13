import { Router, Response } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  checkAccountStatus,
  validate,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';

const router = Router();

const messageSchema = Joi.object({
  contenu: Joi.string().min(1).max(2000).required()
});

/** GET /api/groupes-entraide/:id */
const getGroupe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const groupe = await db.oneOrNone(
    `SELECT ge.*, p.titre AS publication_titre
     FROM groupes_entraide ge
     JOIN publications p ON p.id = ge.publication_id
     WHERE ge.id = $1 AND ge.is_actif = TRUE`,
    [req.params.id]
  );
  if (!groupe) {
    const err: ApiError = new Error('Groupe introuvable');
    err.statusCode = 404;
    throw err;
  }

  const membre = await db.oneOrNone(
    `SELECT id FROM groupe_entraide_membres WHERE groupe_id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!membre) {
    const err: ApiError = new Error('Accès réservé aux participants');
    err.statusCode = 403;
    throw err;
  }

  const membres = await db.any(
    `SELECT gm.role_membre, gm.joined_at, u.id, u.pseudonyme, u.nom, u.prenom
     FROM groupe_entraide_membres gm JOIN users u ON u.id = gm.user_id
     WHERE gm.groupe_id = $1 ORDER BY gm.joined_at`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...groupe, membres } });
});

/** GET /api/groupes-entraide/:id/messages */
const getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const membre = await db.oneOrNone(
    `SELECT id FROM groupe_entraide_membres WHERE groupe_id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!membre) {
    const err: ApiError = new Error('Accès réservé aux participants');
    err.statusCode = 403;
    throw err;
  }

  const rows = await db.any(
    `SELECT m.id, m.contenu, m.created_at, u.pseudonyme, u.nom, u.prenom
     FROM groupe_entraide_messages m JOIN users u ON u.id = m.author_id
     WHERE m.groupe_id = $1 ORDER BY m.created_at ASC LIMIT 200`,
    [req.params.id]
  );

  res.json({ success: true, data: rows });
});

/** POST /api/groupes-entraide/:id/messages */
const postMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const membre = await db.oneOrNone(
    `SELECT id FROM groupe_entraide_membres WHERE groupe_id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!membre) {
    const err: ApiError = new Error('Accès réservé aux participants');
    err.statusCode = 403;
    throw err;
  }

  const row = await db.one(
    `INSERT INTO groupe_entraide_messages (groupe_id, author_id, contenu) VALUES ($1,$2,$3) RETURNING *`,
    [req.params.id, req.user.id, req.body.contenu]
  );

  res.status(201).json({ success: true, data: row });
});

router.get('/:id', authenticate, checkAccountStatus, getGroupe);
router.get('/:id/messages', authenticate, checkAccountStatus, getMessages);
router.post('/:id/messages', authenticate, checkAccountStatus, validate(messageSchema), postMessage);

export default router;
