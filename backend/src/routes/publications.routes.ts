import { Router, Response } from 'express';
import Joi from 'joi';
import { db } from '@config/database.js';
import {
  asyncHandler,
  authenticate,
  optionalAuthenticate,
  validate,
  checkAccountStatus,
  ApiError,
  AuthRequest
} from '@middleware/errorHandler.js';
import { conditionalPublicationPhoto, publicUploadUrl } from '@utils/upload.js';
import { displayName, mapLocation } from '@utils/tokens.js';

const router = Router();

const CATEGORIES = ['securite', 'entraide', 'hygiene', 'communaute', 'conseil', 'autre'] as const;
const PORTEES = ['fokontany', 'commune', 'securite_zone'] as const;

/** Rayon (m) pour publications sécurité visibles aux visiteurs dans la zone */
const SECURITE_ZONE_RADIUS_M = Number(process.env.SECURITE_ZONE_RADIUS_M || 2000);

const createSchema = Joi.object({
  titre: Joi.string().min(3).max(200).required(),
  contenu: Joi.string().min(5).required(),
  categorie: Joi.string()
    .valid(...CATEGORIES)
    .required(),
  portee: Joi.string()
    .valid(...PORTEES)
    .required(),
  quartier_id: Joi.string().uuid().when('portee', {
    is: Joi.valid('fokontany', 'securite_zone'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  commune_id: Joi.string().uuid().optional(),
  groupe_communaute_id: Joi.string().uuid().allow(null).optional(),
  latitude: Joi.number().min(-90).max(90).when('portee', {
    is: 'securite_zone',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  longitude: Joi.number().min(-180).max(180).when('portee', {
    is: 'securite_zone',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  adresse: Joi.string().max(500).allow('', null).optional()
});

function resolvePorteeFromCategorie(categorie: string, portee: string): string {
  if (categorie === 'securite') return 'securite_zone';
  if (portee === 'commune') return 'commune';
  return 'fokontany';
}

/** Construit la clause WHERE pour filtrer les publications visibles */
function buildVisibilityFilter(
  req: AuthRequest,
  latitude?: number,
  longitude?: number
): { clause: string; params: unknown[]; paramIndex: number } {
  const params: unknown[] = [];
  let i = 1;
  const parts: string[] = ['p.is_archived = FALSE'];

  const userQuartier = req.user?.quartier_id;
  const userCommune = req.user?.commune_id;

  const visibilityParts: string[] = [];

  if (userQuartier) {
    visibilityParts.push(
      `(p.portee = 'fokontany' AND p.quartier_id = $${i})`
    );
    params.push(userQuartier);
    i++;
  }

  if (userCommune) {
    visibilityParts.push(`(p.portee = 'commune' AND p.commune_id = $${i})`);
    params.push(userCommune);
    i++;

    visibilityParts.push(
      `(p.groupe_communaute_id IS NOT NULL AND p.commune_id = $${i})`
    );
    params.push(userCommune);
    i++;
  }

  if (latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
    visibilityParts.push(`(
      p.portee = 'securite_zone'
      AND (
        ST_DWithin(
          p.localisation,
          ST_SetSRID(ST_MakePoint($${i + 1}, $${i}), 4326)::geography,
          ${SECURITE_ZONE_RADIUS_M}
        )
        OR EXISTS (
          SELECT 1 FROM quartiers qz
          WHERE qz.id = p.quartier_id
            AND qz.localisation_polygone IS NOT NULL
            AND ST_Contains(
              qz.localisation_polygone::geometry,
              ST_SetSRID(ST_MakePoint($${i + 1}, $${i}), 4326)
            )
        )
      )
    )`);
    params.push(latitude, longitude);
    i += 2;
  }

  if (visibilityParts.length === 0) {
    parts.push('FALSE');
  } else {
    parts.push(`(${visibilityParts.join(' OR ')})`);
  }

  return { clause: parts.join(' AND '), params, paramIndex: i };
}

const listPublications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const latitude = req.query.latitude != null ? parseFloat(String(req.query.latitude)) : undefined;
  const longitude = req.query.longitude != null ? parseFloat(String(req.query.longitude)) : undefined;

  const { clause, params, paramIndex } = buildVisibilityFilter(req, latitude, longitude);

  const extraFilters: string[] = [clause];
  let i = paramIndex;

  if (req.query.categorie) {
    extraFilters.push(`p.categorie = $${i++}::publication_categorie`);
    params.push(req.query.categorie);
  }
  if (req.query.portee) {
    extraFilters.push(`p.portee = $${i++}::publication_portee`);
    params.push(req.query.portee);
  }
  if (req.query.quartier_id) {
    extraFilters.push(`p.quartier_id = $${i++}`);
    params.push(req.query.quartier_id);
  }
  if (req.query.groupe_communaute_id) {
    extraFilters.push(`p.groupe_communaute_id = $${i++}`);
    params.push(req.query.groupe_communaute_id);
  }

  const where = `WHERE ${extraFilters.join(' AND ')}`;

  const countRow = await db.one(
    `SELECT COUNT(*)::int AS total FROM publications p ${where}`,
    params
  );

  params.push(limit, offset);
  const rows = await db.any(
    `SELECT p.id, p.titre, p.contenu, p.categorie, p.portee, p.quartier_id, p.commune_id,
            p.groupe_communaute_id, p.adresse, p.photo_url, p.created_at, p.updated_at,
            ST_AsGeoJSON(p.localisation::geometry)::json AS location_geojson,
            q.nom AS fokontany_nom, c.nom AS commune_nom,
            gc.nom AS groupe_communaute_nom,
            u.id AS creator_id, u.pseudonyme, u.nom AS creator_nom, u.prenom AS creator_prenom, u.anonyme
     FROM publications p
     LEFT JOIN quartiers q ON q.id = p.quartier_id
     LEFT JOIN communes c ON c.id = p.commune_id
     LEFT JOIN groupe_communautes gc ON gc.id = p.groupe_communaute_id
     LEFT JOIN users u ON u.id = p.creator_id
     ${where}
     ORDER BY p.is_epinglee DESC NULLS LAST, p.epinglee_at DESC NULLS LAST, p.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );

  const data = rows.map((row: Record<string, unknown>) => ({
    ...row,
    localisation: mapLocation(row as { location_geojson?: unknown }),
    location_geojson: undefined,
    auteur: displayName(row as Parameters<typeof displayName>[0]),
    creator_nom: undefined,
    creator_prenom: undefined,
    pseudonyme: undefined
  }));

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

const getPublication = asyncHandler(async (req: AuthRequest, res: Response) => {
  const latitude = req.query.latitude != null ? parseFloat(String(req.query.latitude)) : undefined;
  const longitude = req.query.longitude != null ? parseFloat(String(req.query.longitude)) : undefined;

  const row = await db.oneOrNone(
    `SELECT p.id, p.titre, p.contenu, p.categorie, p.portee, p.quartier_id, p.commune_id,
            p.groupe_communaute_id, p.adresse, p.photo_url, p.created_at, p.updated_at,
            ST_AsGeoJSON(p.localisation::geometry)::json AS location_geojson,
            q.nom AS fokontany_nom, c.nom AS commune_nom,
            gc.nom AS groupe_communaute_nom,
            u.id AS creator_id, u.pseudonyme, u.nom AS creator_nom, u.prenom AS creator_prenom, u.anonyme
     FROM publications p
     LEFT JOIN quartiers q ON q.id = p.quartier_id
     LEFT JOIN communes c ON c.id = p.commune_id
     LEFT JOIN groupe_communautes gc ON gc.id = p.groupe_communaute_id
     LEFT JOIN users u ON u.id = p.creator_id
     WHERE p.id = $1 AND p.is_archived = FALSE`,
    [req.params.id]
  );

  if (!row) {
    const err: ApiError = new Error('Publication introuvable');
    err.statusCode = 404;
    throw err;
  }

  const { clause, params } = buildVisibilityFilter(req, latitude, longitude);
  const visible = await db.oneOrNone(
    `SELECT p.id FROM publications p WHERE p.id = $${params.length + 1} AND ${clause}`,
    [...params, req.params.id]
  );

  if (!visible) {
    const err: ApiError = new Error('Publication non accessible dans votre périmètre');
    err.statusCode = 403;
    throw err;
  }

  res.json({
    success: true,
    data: {
      ...row,
      localisation: mapLocation(row),
      location_geojson: undefined,
      auteur: displayName(row),
      creator_nom: undefined,
      creator_prenom: undefined,
      pseudonyme: undefined
    }
  });
});

const createPublication = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const body = req.body as Record<string, unknown>;
  let { titre, contenu, categorie, portee, quartier_id, commune_id, groupe_communaute_id, latitude, longitude, adresse } =
    body;

  portee = resolvePorteeFromCategorie(String(categorie), String(portee));

  if (!commune_id) {
    commune_id = req.user.commune_id;
  }
  if (!commune_id) {
    const err: ApiError = new Error('commune_id requis ou profil incomplet');
    err.statusCode = 400;
    throw err;
  }

  if (portee === 'fokontany' || portee === 'securite_zone') {
    if (!quartier_id) {
      quartier_id = req.user.quartier_id;
    }
    if (!quartier_id) {
      const err: ApiError = new Error('quartier_id requis pour cette publication');
      err.statusCode = 400;
      throw err;
    }
  }

  if (portee === 'fokontany' && quartier_id !== req.user.quartier_id && req.user.role === 'citoyen') {
    const err: ApiError = new Error('Vous ne pouvez publier que dans votre fokontany');
    err.statusCode = 403;
    throw err;
  }

  const quartier = quartier_id
    ? await db.oneOrNone(`SELECT id, commune_id FROM quartiers WHERE id = $1`, [quartier_id])
    : null;

  if (quartier && quartier.commune_id !== commune_id) {
    const err: ApiError = new Error('Quartier et commune incohérents');
    err.statusCode = 400;
    throw err;
  }

  if (groupe_communaute_id) {
    const groupe = await db.oneOrNone(
      `SELECT id, commune_id FROM groupe_communautes WHERE id = $1 AND is_active = TRUE`,
      [groupe_communaute_id]
    );
    if (!groupe) {
      const err: ApiError = new Error('Groupe communauté introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (groupe.commune_id !== commune_id) {
      const err: ApiError = new Error('Ce groupe n\'appartient pas à cette commune');
      err.statusCode = 400;
      throw err;
    }
    if (req.user.commune_id && req.user.commune_id !== groupe.commune_id && req.user.role === 'citoyen') {
      const err: ApiError = new Error('Vous n\'êtes pas membre de cette communauté');
      err.statusCode = 403;
      throw err;
    }
  }

  let photoUrl: string | null = null;
  const files = req.files as Express.Multer.File[] | undefined;
  if (files?.length) {
    photoUrl = publicUploadUrl(files[0]!.filename);
  }

  const lat = latitude != null ? Number(latitude) : null;
  const lon = longitude != null ? Number(longitude) : null;

  const row = await db.one(
    `INSERT INTO publications
       (creator_id, titre, contenu, categorie, portee, quartier_id, commune_id,
        groupe_communaute_id, adresse, photo_url, localisation)
     VALUES ($1, $2, $3, $4::publication_categorie, $5::publication_portee, $6, $7, $8, $9, $10,
       CASE WHEN $11 IS NOT NULL AND $12 IS NOT NULL
         THEN ST_SetSRID(ST_MakePoint($12, $11), 4326)::geography
         ELSE NULL END)
     RETURNING id, titre, contenu, categorie, portee, quartier_id, commune_id,
               groupe_communaute_id, adresse, photo_url, created_at`,
    [
      req.user.id,
      titre,
      contenu,
      categorie,
      portee,
      quartier_id || null,
      commune_id,
      groupe_communaute_id || null,
      adresse || null,
      photoUrl,
      lat,
      lon
    ]
  );

  res.status(201).json({ success: true, message: 'Publication créée', data: row });
});

const deletePublication = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const pub = await db.oneOrNone(`SELECT id, creator_id FROM publications WHERE id = $1`, [
    req.params.id
  ]);

  if (!pub) {
    const err: ApiError = new Error('Publication introuvable');
    err.statusCode = 404;
    throw err;
  }

  const isOwner = pub.creator_id === req.user.id;
  const isStaff = ['moderateur_quartier', 'acteur_communal', 'elu_commune', 'admin_plateforme'].includes(
    req.user.role
  );

  if (!isOwner && !isStaff) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  await db.none(`UPDATE publications SET is_archived = TRUE WHERE id = $1`, [req.params.id]);

  res.json({ success: true, message: 'Publication archivée' });
});

/** GET /api/publications/:id/sondage — Résultats avec pourcentages */
const getSondageResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const pub = await db.oneOrNone(
    `SELECT id, type_publication FROM publications WHERE id = $1 AND is_archived = FALSE`,
    [req.params.id]
  );
  if (!pub || pub.type_publication !== 'sondage') {
    const err: ApiError = new Error('Sondage introuvable');
    err.statusCode = 404;
    throw err;
  }

  const options = await db.any(
    `SELECT o.id, o.libelle, o.position, COUNT(v.id)::int AS votes
     FROM sondage_options o
     LEFT JOIN sondage_votes v ON v.option_id = o.id
     WHERE o.publication_id = $1
     GROUP BY o.id, o.libelle, o.position
     ORDER BY o.position`,
    [req.params.id]
  );

  const total = options.reduce((s: number, o: { votes: number }) => s + o.votes, 0);
  const results = options.map((o: { id: string; libelle: string; votes: number; position: number }) => ({
    ...o,
    pourcentage: total > 0 ? Math.round((o.votes / total) * 1000) / 10 : 0
  }));

  res.json({ success: true, data: { total_votes: total, options: results } });
});

/** POST /api/publications/:id/sondage/voter */
const voteSondage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const { option_id } = req.body;
  if (!option_id) {
    const err: ApiError = new Error('option_id requis');
    err.statusCode = 400;
    throw err;
  }

  const pub = await db.oneOrNone(
    `SELECT id, type_publication FROM publications WHERE id = $1 AND is_archived = FALSE`,
    [req.params.id]
  );
  if (!pub || pub.type_publication !== 'sondage') {
    const err: ApiError = new Error('Sondage introuvable');
    err.statusCode = 404;
    throw err;
  }

  const option = await db.oneOrNone(
    `SELECT id FROM sondage_options WHERE id = $1 AND publication_id = $2`,
    [option_id, req.params.id]
  );
  if (!option) {
    const err: ApiError = new Error('Option invalide');
    err.statusCode = 400;
    throw err;
  }

  await db.none(
    `INSERT INTO sondage_votes (publication_id, option_id, user_id) VALUES ($1,$2,$3)
     ON CONFLICT (publication_id, user_id) DO UPDATE SET option_id = EXCLUDED.option_id`,
    [req.params.id, option_id, req.user.id]
  );

  res.json({ success: true, message: 'Vote enregistré' });
});

/** POST /api/publications/:id/participer — « Je participe » */
const participer = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const pub = await db.oneOrNone(
    `SELECT id, titre, commune_id, participation_active, type_publication FROM publications
     WHERE id = $1 AND is_archived = FALSE`,
    [req.params.id]
  );
  if (!pub || (!pub.participation_active && pub.type_publication !== 'participation')) {
    const err: ApiError = new Error('Participation non disponible');
    err.statusCode = 400;
    throw err;
  }

  await db.none(
    `INSERT INTO publication_participants (publication_id, user_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [req.params.id, req.user.id]
  );

  let groupe = await db.oneOrNone(`SELECT id FROM groupes_entraide WHERE publication_id = $1`, [req.params.id]);

  if (!groupe) {
    groupe = await db.one(
      `INSERT INTO groupes_entraide (publication_id, commune_id, nom, responsable_id, representant_police, expires_at)
       VALUES ($1,$2,$3,$4,$5, CURRENT_TIMESTAMP + INTERVAL '30 days')
       RETURNING id`,
      [
        req.params.id,
        pub.commune_id,
        `Entraide — ${pub.titre}`.slice(0, 255),
        null,
        req.body.representant_police || null
      ]
    );
  }

  await db.none(
    `INSERT INTO groupe_entraide_membres (groupe_id, user_id, role_membre) VALUES ($1,$2,'participant')
     ON CONFLICT DO NOTHING`,
    [groupe.id, req.user.id]
  );

  res.json({
    success: true,
    message: 'Participation enregistrée',
    data: { groupe_entraide_id: groupe.id }
  });
});

/** GET /api/publications/:id/participants */
const getParticipants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await db.one(
    `SELECT COUNT(*)::int AS total FROM publication_participants WHERE publication_id = $1`,
    [req.params.id]
  );
  res.json({ success: true, data: { total: count.total } });
});

/** POST /api/publications/:id/republier — Mise à jour avant/après (1×/jour/personne) */
const republierSchema = Joi.object({
  contenu: Joi.string().min(5).required(),
  statut_mise_a_jour: Joi.string().max(100).required()
});

const republier = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const origine = await db.oneOrNone(
    `SELECT * FROM publications WHERE id = $1 AND is_archived = FALSE`,
    [req.params.id]
  );
  if (!origine) {
    const err: ApiError = new Error('Publication introuvable');
    err.statusCode = 404;
    throw err;
  }

  const deja = await db.oneOrNone(
    `SELECT id FROM publication_republications
     WHERE publication_origine_id = $1 AND auteur_id = $2 AND DATE(created_at) = CURRENT_DATE`,
    [req.params.id, req.user.id]
  );
  if (deja) {
    const err: ApiError = new Error('Republication limitée à une fois par jour pour cette publication');
    err.statusCode = 429;
    throw err;
  }

  const { contenu, statut_mise_a_jour } = req.body;

  const result = await db.tx(async (t) => {
    const miseAJour = await t.one(
      `INSERT INTO publications
         (creator_id, titre, contenu, categorie, type_publication, portee, quartier_id, commune_id,
          parent_publication_id, statut_mise_a_jour, is_officielle, moderation_statut)
       VALUES ($1,$2,$3,$4::publication_categorie,'mise_a_jour',$5::publication_portee,$6,$7,$8,$9,$10,'approuve')
       RETURNING *`,
      [
        req.user!.id,
        `${origine.titre} — Mise à jour`,
        contenu,
        origine.categorie,
        origine.portee,
        origine.quartier_id,
        origine.commune_id,
        origine.id,
        statut_mise_a_jour,
        origine.is_officielle
      ]
    );

    await t.none(
      `INSERT INTO publication_republications
         (publication_origine_id, publication_mise_a_jour_id, auteur_id, statut_mise_a_jour, contenu_mise_a_jour)
       VALUES ($1,$2,$3,$4,$5)`,
      [origine.id, miseAJour.id, req.user!.id, statut_mise_a_jour, contenu]
    );

    return miseAJour;
  });

  res.status(201).json({ success: true, message: 'Mise à jour publiée', data: result });
});

router.get('/', optionalAuthenticate, listPublications);
router.get('/:id/sondage', optionalAuthenticate, getSondageResults);
router.post('/:id/sondage/voter', authenticate, checkAccountStatus, voteSondage);
router.post('/:id/participer', authenticate, checkAccountStatus, participer);
router.get('/:id/participants', optionalAuthenticate, getParticipants);
router.post('/:id/republier', authenticate, checkAccountStatus, validate(republierSchema), republier);
router.get('/:id', optionalAuthenticate, getPublication);
router.post('/', authenticate, conditionalPublicationPhoto, validate(createSchema), createPublication);
router.delete('/:id', authenticate, deletePublication);

export default router;
