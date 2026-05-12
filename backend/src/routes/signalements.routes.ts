import { Router, Response } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  validate,
  authenticate,
  authorize,
  optionalAuthenticate,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';
import { conditionalSignalementPhotos, publicUploadUrl } from '@utils/upload.js';

const router = Router();

const CATEGORIES = [
  'proprete',
  'securite',
  'infrastructure',
  'sante',
  'lien_social',
  'autre'
] as const;

const VOTEABLE = ['en_attente_vote', 'approuve', 'priorise'];

const createBodySchema = Joi.object({
  titre: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).required(),
  categorie: Joi.string()
    .valid(...CATEGORIES)
    .required(),
  quartier_id: Joi.string().uuid().required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  adresse: Joi.string().max(500).allow('', null).optional(),
  visibilite: Joi.string().valid('publique', 'anonyme').default('publique')
});

const updateBodySchema = Joi.object({
  titre: Joi.string().min(3).max(200).optional(),
  description: Joi.string().min(10).optional(),
  categorie: Joi.string()
    .valid(...CATEGORIES)
    .optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  adresse: Joi.string().max(500).allow('', null).optional(),
  visibilite: Joi.string().valid('publique', 'anonyme').optional()
}).min(1);

const moderationSchema = Joi.object({
  decision: Joi.string().valid('approve', 'reject').required(),
  raison_rejet: Joi.string().max(2000).allow('', null).when('decision', {
    is: 'reject',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

function mapLocation(row: { location_geojson?: unknown }): { type: 'Point'; coordinates: [number, number] } | null {
  if (!row.location_geojson) return null;
  const g = typeof row.location_geojson === 'string' ? JSON.parse(row.location_geojson) : row.location_geojson;
  if (g?.type === 'Point' && Array.isArray(g.coordinates)) {
    return { type: 'Point', coordinates: [g.coordinates[0], g.coordinates[1]] };
  }
  return null;
}

function stripCreator(row: Record<string, unknown>, visibilite: string) {
  if (visibilite === 'anonyme') {
    const { creator_nom, creator_email, creator_id, ...rest } = row;
    return { ...rest, creator_id: null, creator_nom: null, creator_email: null };
  }
  return row;
}

const getSignalements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const filters: string[] = ['s.is_archived = FALSE'];
  const params: unknown[] = [];
  let i = 1;

  if (req.query.commune_id) {
    filters.push(`s.commune_id = $${i++}`);
    params.push(req.query.commune_id);
  }
  if (req.query.quartier_id) {
    filters.push(`s.quartier_id = $${i++}`);
    params.push(req.query.quartier_id);
  }
  if (req.query.status) {
    filters.push(`s.status = $${i++}::signalement_status`);
    params.push(req.query.status);
  }
  if (req.query.categorie) {
    filters.push(`s.categorie = $${i++}::categorie_probleme`);
    params.push(req.query.categorie);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countRow = await db.one(
    `SELECT COUNT(*)::int AS total FROM signalements s ${where}`,
    params
  );

  params.push(limit, offset);
  const rows = await db.any(
    `SELECT s.id, s.commune_id, s.quartier_id, s.creator_id, s.titre, s.description, s.categorie,
            s.status, s.visibilite, s.priorite_votes, s.modere, s.photo_principale_url, s.adresse,
            s.created_at, s.updated_at,
            ST_AsGeoJSON(s.localisation::geometry)::json AS location_geojson,
            c.nom AS commune_nom, q.nom AS quartier_nom,
            u.nom AS creator_nom, u.email AS creator_email
     FROM signalements s
     JOIN communes c ON c.id = s.commune_id
     JOIN quartiers q ON q.id = s.quartier_id
     JOIN users u ON u.id = s.creator_id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );

  const data = rows.map((r) => {
    const base = {
      ...r,
      localisation: mapLocation(r),
      location_geojson: undefined
    };
    const cleaned = stripCreator(base as Record<string, unknown>, String(r.visibilite));
    delete (cleaned as { location_geojson?: unknown }).location_geojson;
    return cleaned;
  });

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: countRow.total,
      pages: Math.ceil(countRow.total / limit) || 1
    }
  });
});

const getSignalement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const row = await db.oneOrNone(
    `SELECT s.*, ST_AsGeoJSON(s.localisation::geometry)::json AS location_geojson,
            c.nom AS commune_nom, q.nom AS quartier_nom,
            u.nom AS creator_nom, u.email AS creator_email
     FROM signalements s
     JOIN communes c ON c.id = s.commune_id
     JOIN quartiers q ON q.id = s.quartier_id
     JOIN users u ON u.id = s.creator_id
     WHERE s.id = $1`,
    [id]
  );

  if (!row) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }

  const photos = await db.any(
    `SELECT id, url, nom_fichier, position, created_at FROM signalement_photos
     WHERE signalement_id = $1 ORDER BY position ASC, created_at ASC`,
    [id]
  );

  const base = {
    ...row,
    localisation: mapLocation(row),
    photos,
    location_geojson: undefined
  };
  const cleaned = stripCreator(base as Record<string, unknown>, String(row.visibilite));

  res.json({ success: true, data: cleaned });
});

const createSignalement = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  let body = req.body as Record<string, unknown>;
  if (req.is('multipart/form-data')) {
    body = { ...req.body };
    if (body.latitude !== undefined) body.latitude = parseFloat(String(body.latitude));
    if (body.longitude !== undefined) body.longitude = parseFloat(String(body.longitude));
  }

  const { error, value } = createBodySchema.validate(body);
  if (error) {
    const err: ApiError = new Error('Validation échouée');
    err.statusCode = 400;
    err.details = error.details;
    throw err;
  }

  const q = await db.oneOrNone(
    `SELECT id, commune_id FROM quartiers WHERE id = $1 AND is_active = TRUE`,
    [value.quartier_id]
  );
  if (!q) {
    const err: ApiError = new Error('Quartier invalide');
    err.statusCode = 400;
    throw err;
  }

  const files = (req.files as { filename: string; originalname: string; size: number; mimetype: string }[] | undefined) || [];
  let photoPrincipale: string | null = null;
  if (files.length > 0) {
    photoPrincipale = publicUploadUrl(files[0].filename);
  }

  const created = await db.tx(async (t) => {
    const s = await t.one(
      `
      INSERT INTO signalements (
        commune_id, quartier_id, creator_id, titre, description, categorie,
        localisation, adresse, status, visibilite, photo_principale_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6::categorie_probleme,
        ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography,
        $9, 'cree', $10, $11
      )
      RETURNING id, commune_id, quartier_id, creator_id, titre, description, categorie, status, visibilite,
                priorite_votes, photo_principale_url, adresse, created_at, updated_at,
                ST_AsGeoJSON(localisation::geometry)::json AS location_geojson
      `,
      [
        q.commune_id,
        value.quartier_id,
        req.user!.id,
        value.titre,
        value.description,
        value.categorie,
        value.latitude,
        value.longitude,
        value.adresse ?? null,
        value.visibilite,
        photoPrincipale
      ]
    );

    let pos = 0;
    for (const f of files) {
      const url = publicUploadUrl(f.filename);
      await t.none(
        `INSERT INTO signalement_photos (signalement_id, url, nom_fichier, taille_bytes, mime_type, position, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [s.id, url, f.originalname || f.filename, f.size, f.mimetype, pos++, req.user!.id]
      );
    }

    return s;
  });

  res.status(201).json({
    success: true,
    message: 'Signalement créé',
    data: {
      ...created,
      localisation: mapLocation(created),
      location_geojson: undefined
    }
  });
});

const updateSignalement = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { id } = req.params;
  const { error, value } = updateBodySchema.validate(req.body);
  if (error) {
    const err: ApiError = new Error('Validation échouée');
    err.statusCode = 400;
    err.details = error.details;
    throw err;
  }

  const existing = await db.oneOrNone(
    `SELECT id, creator_id, status FROM signalements WHERE id = $1 AND is_archived = FALSE`,
    [id]
  );
  if (!existing) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }
  if (existing.creator_id !== req.user.id) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }
  if (existing.status !== 'cree') {
    const err: ApiError = new Error('Modification impossible pour ce statut');
    err.statusCode = 400;
    throw err;
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;

  if (value.titre !== undefined) {
    sets.push(`titre = $${n++}`);
    vals.push(value.titre);
  }
  if (value.description !== undefined) {
    sets.push(`description = $${n++}`);
    vals.push(value.description);
  }
  if (value.categorie !== undefined) {
    sets.push(`categorie = $${n++}::categorie_probleme`);
    vals.push(value.categorie);
  }
  if (value.adresse !== undefined) {
    sets.push(`adresse = $${n++}`);
    vals.push(value.adresse);
  }
  if (value.visibilite !== undefined) {
    sets.push(`visibilite = $${n++}`);
    vals.push(value.visibilite);
  }
  if (value.latitude !== undefined && value.longitude !== undefined) {
    sets.push(`localisation = ST_SetSRID(ST_MakePoint($${n}, $${n + 1}), 4326)::geography`);
    vals.push(value.longitude, value.latitude);
    n += 2;
  }

  if (!sets.length) {
    const err: ApiError = new Error('Aucun champ à mettre à jour');
    err.statusCode = 400;
    throw err;
  }

  vals.push(id);
  const updated = await db.one(
    `UPDATE signalements SET ${sets.join(', ')}
     WHERE id = $${n}
     RETURNING id, titre, description, categorie, status, visibilite, adresse, priorite_votes, photo_principale_url,
               created_at, updated_at,
               ST_AsGeoJSON(localisation::geometry)::json AS location_geojson`,
    vals
  );

  res.json({
    success: true,
    data: { ...updated, localisation: mapLocation(updated), location_geojson: undefined }
  });
});

const deleteSignalement = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { id } = req.params;
  const existing = await db.oneOrNone(
    `SELECT id, creator_id, status FROM signalements WHERE id = $1 AND is_archived = FALSE`,
    [id]
  );
  if (!existing) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }

  const isAdmin = req.user.role === 'admin_plateforme';
  if (existing.creator_id !== req.user.id && !isAdmin) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }
  if (existing.status !== 'cree' && !isAdmin) {
    const err: ApiError = new Error('Suppression impossible pour ce statut');
    err.statusCode = 400;
    throw err;
  }

  await db.none(`UPDATE signalements SET is_archived = TRUE WHERE id = $1`, [id]);
  res.json({ success: true, message: 'Signalement archivé' });
});

const moderateSignalement = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { id } = req.params;
  const { decision, raison_rejet } = req.body as { decision: string; raison_rejet?: string };

  const row = await db.oneOrNone(
    `SELECT s.id, s.status, s.quartier_id, s.commune_id
     FROM signalements s WHERE s.id = $1 AND s.is_archived = FALSE`,
    [id]
  );
  if (!row) {
    const err: ApiError = new Error('Signalement introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (row.status !== 'cree') {
    const err: ApiError = new Error('Ce signalement ne peut plus être modéré');
    err.statusCode = 400;
    throw err;
  }

  const modRoles = ['moderateur_quartier', 'acteur_communal', 'elu_commune', 'admin_plateforme'];
  if (!modRoles.includes(req.user.role)) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  if (req.user.role === 'moderateur_quartier') {
    if (req.user.quartier_id && String(req.user.quartier_id) !== String(row.quartier_id)) {
      const err: ApiError = new Error('Hors périmètre de votre quartier');
      err.statusCode = 403;
      throw err;
    }
  } else if (req.user.role !== 'admin_plateforme') {
    if (req.user.commune_id && String(req.user.commune_id) !== String(row.commune_id)) {
      const err: ApiError = new Error('Hors périmètre de votre commune');
      err.statusCode = 403;
      throw err;
    }
  }

  if (decision === 'approve') {
    const updated = await db.one(
      `UPDATE signalements SET
        status = 'en_attente_vote',
        modere = TRUE,
        modere_par = $2,
        date_moderation = CURRENT_TIMESTAMP,
        raison_rejet = NULL
       WHERE id = $1
       RETURNING id, status, modere, date_moderation`,
      [id, req.user.id]
    );
    res.json({ success: true, message: 'Signalement approuvé — ouvert aux votes', data: updated });
    return;
  }

  const updated = await db.one(
    `UPDATE signalements SET
      status = 'rejete',
      modere = TRUE,
      modere_par = $2,
      date_moderation = CURRENT_TIMESTAMP,
      raison_rejet = $3
     WHERE id = $1
     RETURNING id, status, raison_rejet, date_moderation`,
    [id, req.user.id, raison_rejet ?? null]
  );
  res.json({ success: true, message: 'Signalement rejeté', data: updated });
});

const getGeoJSON = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filters: string[] = ['s.is_archived = FALSE'];
  const params: unknown[] = [];
  let i = 1;

  if (req.query.commune_id) {
    filters.push(`s.commune_id = $${i++}`);
    params.push(req.query.commune_id);
  }
  if (req.query.quartier_id) {
    filters.push(`s.quartier_id = $${i++}`);
    params.push(req.query.quartier_id);
  }
  if (req.query.status) {
    filters.push(`s.status = $${i++}::signalement_status`);
    params.push(req.query.status);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await db.any(
    `SELECT s.id, s.titre, s.status::text AS status, s.categorie::text AS categorie, s.priorite_votes,
            ST_AsGeoJSON(s.localisation::geometry)::json AS geometry
     FROM signalements s
     ${where}`,
    params
  );

  const features = rows.map((r) => ({
    type: 'Feature' as const,
    geometry:
      typeof r.geometry === 'string' ? JSON.parse(r.geometry as string) : r.geometry,
    properties: {
      id: r.id,
      titre: r.titre,
      status: r.status,
      categorie: r.categorie,
      priorite_votes: r.priorite_votes
    }
  }));

  res.json({
    success: true,
    type: 'FeatureCollection',
    features
  });
});

router.get('/', optionalAuthenticate, getSignalements);
router.get('/map/geojson', optionalAuthenticate, getGeoJSON);
router.get('/:id', optionalAuthenticate, getSignalement);

router.post(
  '/',
  authenticate,
  conditionalSignalementPhotos,
  createSignalement
);

router.put('/:id', authenticate, validate(updateBodySchema), updateSignalement);
router.delete('/:id', authenticate, deleteSignalement);
router.patch('/:id/moderation', authenticate, validate(moderationSchema), moderateSignalement);

export default router;
