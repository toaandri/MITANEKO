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
import { conditionalPublicationPhoto, publicUploadUrl } from '@utils/upload.js';
import {
  assertCommuneScope,
  COMMUNE_MODERATOR_ROLES,
  COMMUNE_STAFF_ROLES,
  resolveCommuneId
} from '@utils/communeScope.js';
import { iaRequiresModeration, modererTexte } from '@utils/iaClient.js';
import { displayName, mapLocation } from '@utils/tokens.js';

const router = Router();

router.use(authenticate, checkAccountStatus, authorize(...COMMUNE_STAFF_ROLES));

const createPublicationSchema = Joi.object({
  titre: Joi.string().min(3).max(200).required(),
  contenu: Joi.string().min(5).required(),
  categorie: Joi.string()
    .valid('securite', 'entraide', 'hygiene', 'communaute', 'conseil', 'autre')
    .required(),
  type_publication: Joi.string()
    .valid('officielle', 'sondage', 'participation', 'standard')
    .required(),
  portee: Joi.string().valid('fokontany', 'commune', 'securite_zone').default('commune'),
  quartier_id: Joi.string().uuid().allow(null).optional(),
  groupe_communaute_id: Joi.string().uuid().allow(null).optional(),
  date_evenement: Joi.date().iso().allow(null).optional(),
  participation_active: Joi.boolean().default(false),
  representant_police: Joi.string().max(255).allow('', null).optional(),
  options_sondage: Joi.array()
    .items(Joi.string().min(1).max(255))
    .min(2)
    .max(10)
    .when('type_publication', { is: 'sondage', then: Joi.required(), otherwise: Joi.optional() }),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  adresse: Joi.string().max(500).allow('', null).optional()
});

const pinSchema = Joi.object({
  epingle: Joi.boolean().required()
});

const createGroupeSchema = Joi.object({
  nom: Joi.string().min(2).max(255).required(),
  slug: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(2000).allow('', null).optional(),
  type_groupe: Joi.string().valid('permanent', 'temporaire').default('permanent')
});

const rapportSchema = Joi.object({
  titre: Joi.string().min(3).max(255).required(),
  contenu: Joi.string().max(5000).allow('', null).optional(),
  periode_debut: Joi.date().iso().required(),
  periode_fin: Joi.date().iso().required(),
  indicateurs: Joi.object({
    taux_dechets_avant: Joi.number().min(0).max(100).optional(),
    taux_dechets_apres: Joi.number().min(0).max(100).optional(),
    taux_criminalite_avant: Joi.number().min(0).max(100).optional(),
    taux_criminalite_apres: Joi.number().min(0).max(100).optional(),
    autres: Joi.object().optional()
  }).default({})
});

function slugify(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** GET /api/commune/feed — Fil d'actualité communal (épinglées en premier) */
const getFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.query.commune_id as string | undefined);
  await assertCommuneScope(req.user, communeId, db);

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const filters = ['p.commune_id = $1', 'p.is_archived = FALSE', "p.moderation_statut != 'supprime'"];
  const params: unknown[] = [communeId];
  let i = 2;

  if (req.query.type_publication) {
    filters.push(`p.type_publication = $${i++}::publication_type`);
    params.push(req.query.type_publication);
  }
  if (req.query.quartier_id) {
    filters.push(`p.quartier_id = $${i++}`);
    params.push(req.query.quartier_id);
  }

  const where = `WHERE ${filters.join(' AND ')}`;
  const countRow = await db.one(`SELECT COUNT(*)::int AS total FROM publications p ${where}`, params);

  params.push(limit, offset);
  const rows = await db.any(
    `SELECT p.*, q.nom AS fokontany_nom, gc.nom AS groupe_nom,
            u.pseudonyme, u.nom AS creator_nom, u.prenom AS creator_prenom, u.anonyme,
            (SELECT COUNT(*)::int FROM publication_participants pp WHERE pp.publication_id = p.id) AS nb_participants,
            (SELECT COUNT(*)::int FROM sondage_votes sv WHERE sv.publication_id = p.id) AS nb_votes_sondage
     FROM publications p
     LEFT JOIN quartiers q ON q.id = p.quartier_id
     LEFT JOIN groupe_communautes gc ON gc.id = p.groupe_communaute_id
     LEFT JOIN users u ON u.id = p.creator_id
     ${where}
     ORDER BY p.is_epinglee DESC NULLS LAST, p.epinglee_at DESC NULLS LAST, p.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );

  res.json({
    success: true,
    data: rows.map((r: Record<string, unknown>) => ({
      ...r,
      auteur: displayName(r as Parameters<typeof displayName>[0])
    })),
    pagination: {
      page,
      limit,
      total: countRow.total,
      pages: Math.ceil(countRow.total / limit) || 1
    }
  });
});

/** POST /api/commune/publications — Créer publication officielle, sondage ou participation */
const createPublication = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  if (!isCommuneModerator(req.user.role)) {
    const err: ApiError = new Error('Seuls les modérateurs communaux peuvent créer ce type de publication');
    err.statusCode = 403;
    throw err;
  }

  const body = req.body;
  const communeId = resolveCommuneId(req.user, body.commune_id);
  await assertCommuneScope(req.user, communeId, db, body.quartier_id);

  const authToken = req.headers.authorization?.split(' ')[1];
  const iaResult = await modererTexte(`${body.titre}\n${body.contenu}`, req.user.id, authToken);
  const modStatut = iaRequiresModeration(iaResult) ? 'en_attente' : 'approuve';

  let photoUrl: string | null = null;
  const files = req.files as Express.Multer.File[] | undefined;
  if (files?.length) photoUrl = publicUploadUrl(files[0]!.filename);

  const isOfficielle = ['officielle', 'sondage', 'participation'].includes(body.type_publication);
  const participationActive = body.type_publication === 'participation' || body.participation_active;

  const pub = await db.tx(async (t) => {
    const row = await t.one(
      `INSERT INTO publications
         (creator_id, titre, contenu, categorie, type_publication, portee, quartier_id, commune_id,
          groupe_communaute_id, photo_url, date_evenement, is_officielle, participation_active,
          moderation_statut, ia_result, adresse, localisation)
       VALUES ($1,$2,$3,$4::publication_categorie,$5::publication_type,$6::publication_portee,$7,$8,$9,$10,$11,$12,$13,$14::moderation_statut,$15,$16,
         CASE WHEN $17 IS NOT NULL AND $18 IS NOT NULL
           THEN ST_SetSRID(ST_MakePoint($18,$17),4326)::geography ELSE NULL END)
       RETURNING *`,
      [
        req.user!.id,
        body.titre,
        body.contenu,
        body.categorie,
        body.type_publication,
        body.portee || 'commune',
        body.quartier_id || null,
        communeId,
        body.groupe_communaute_id || null,
        photoUrl,
        body.date_evenement || null,
        isOfficielle,
        participationActive,
        modStatut,
        JSON.stringify(iaResult),
        body.adresse || null,
        body.latitude ?? null,
        body.longitude ?? null
      ]
    );

    if (body.type_publication === 'sondage' && body.options_sondage?.length) {
      for (let idx = 0; idx < body.options_sondage.length; idx++) {
        await t.none(
          `INSERT INTO sondage_options (publication_id, libelle, position) VALUES ($1,$2,$3)`,
          [row.id, body.options_sondage[idx], idx]
        );
      }
    }

    if (modStatut === 'en_attente') {
      await t.none(
        `INSERT INTO moderation_queue (entity_type, entity_id, commune_id, raison, ia_result, ia_action_recommandee, statut)
         VALUES ('publication', $1, $2, $3, $4, $5, 'en_attente')`,
        [
          row.id,
          communeId,
          'Analyse IA — révision requise',
          JSON.stringify(iaResult),
          iaResult.action_recommandee
        ]
      );
    }

    return row;
  });

  res.status(201).json({
    success: true,
    message: 'Publication créée',
    data: pub,
    moderation: { statut: modStatut, ia: iaResult }
  });
});

function isCommuneModerator(role: string): boolean {
  return COMMUNE_MODERATOR_ROLES.includes(role as (typeof COMMUNE_MODERATOR_ROLES)[number]);
}

/** PATCH /api/commune/publications/:id/epingle */
const togglePin = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user || !isCommuneModerator(req.user.role)) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  const pub = await db.oneOrNone(`SELECT id, commune_id FROM publications WHERE id = $1`, [req.params.id]);
  if (!pub) {
    const err: ApiError = new Error('Publication introuvable');
    err.statusCode = 404;
    throw err;
  }
  await assertCommuneScope(req.user, pub.commune_id, db);

  const { epingle } = req.body;
  const updated = await db.one(
    `UPDATE publications SET is_epinglee = $1, epinglee_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
       epinglee_par = CASE WHEN $1 THEN $2 ELSE NULL END
     WHERE id = $3 RETURNING id, is_epinglee, epinglee_at`,
    [epingle, req.user.id, req.params.id]
  );

  res.json({ success: true, data: updated });
});

/** GET /api/commune/dashboard — Indice de performance communal */
const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.query.commune_id as string | undefined);
  await assertCommuneScope(req.user, communeId, db);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [stats, parJour, parHeure, parQuartier] = await Promise.all([
    db.one(
      `SELECT
         (SELECT COUNT(*)::int FROM publications WHERE commune_id = $1 AND is_archived = FALSE
           AND created_at >= $2::date) AS nb_publications_mois,
         (SELECT COUNT(DISTINCT user_id)::int FROM sondage_votes sv
           JOIN publications p ON p.id = sv.publication_id
           WHERE p.commune_id = $1 AND sv.created_at >= $2::date) AS nb_votes_sondages_mois,
         (SELECT COUNT(*)::int FROM publication_participants pp
           JOIN publications p ON p.id = pp.publication_id
           WHERE p.commune_id = $1 AND pp.created_at >= $2::date) AS nb_participations_mois,
         (SELECT COUNT(*)::int FROM users WHERE commune_id = $1 AND role = 'citoyen' AND status_compte = 'actif') AS nb_citoyens,
         (SELECT COUNT(*)::int FROM users WHERE commune_id = $1 AND dernier_acces >= NOW() - INTERVAL '7 days') AS nb_actifs_semaine,
         (SELECT COUNT(*)::int FROM moderation_queue WHERE commune_id = $1 AND statut = 'en_attente') AS moderation_en_attente,
         (SELECT COUNT(*)::int FROM signalements WHERE commune_id = $1 AND status = 'resolu'
           AND date_resolution >= $2::date) AS signalements_resolus_mois`,
      [communeId, monthStart]
    ),
    db.any(
      `SELECT DATE(created_at) AS jour, COUNT(*)::int AS nb
       FROM publications WHERE commune_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at) ORDER BY jour`,
      [communeId]
    ),
    db.any(
      `SELECT EXTRACT(HOUR FROM dernier_acces)::int AS heure, COUNT(*)::int AS nb
       FROM users WHERE commune_id = $1 AND dernier_acces >= NOW() - INTERVAL '7 days'
       GROUP BY EXTRACT(HOUR FROM dernier_acces) ORDER BY heure`,
      [communeId]
    ),
    db.any(
      `SELECT q.id, q.nom,
         COUNT(DISTINCT p.id)::int AS nb_publications,
         COUNT(DISTINCT s.id)::int AS nb_signalements,
         COUNT(DISTINCT CASE WHEN s.status = 'resolu' THEN s.id END)::int AS nb_resolus
       FROM quartiers q
       LEFT JOIN publications p ON p.quartier_id = q.id AND p.is_archived = FALSE
       LEFT JOIN signalements s ON s.quartier_id = q.id AND s.is_archived = FALSE
       WHERE q.commune_id = $1
       GROUP BY q.id, q.nom ORDER BY q.nom`,
      [communeId]
    )
  ]);

  res.json({
    success: true,
    data: {
      resume: stats,
      publications_par_jour: parJour,
      connexions_par_heure: parHeure,
      performance_quartiers: parQuartier
    }
  });
});

/** GET /api/commune/groupes — Groupes modérés par la commune */
const listGroupes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.query.commune_id as string | undefined);
  await assertCommuneScope(req.user, communeId, db);

  const rows = await db.any(
    `SELECT gc.*, c.nom AS commune_nom,
            (SELECT COUNT(*)::int FROM groupe_communaute_membres gm WHERE gm.groupe_communaute_id = gc.id) AS nb_membres,
            (SELECT COUNT(*)::int FROM publications p WHERE p.groupe_communaute_id = gc.id AND p.is_archived = FALSE) AS nb_publications
     FROM groupe_communautes gc
     JOIN communes c ON c.id = gc.commune_id
     WHERE gc.commune_id = $1 AND gc.is_active = TRUE
     ORDER BY gc.nom`,
    [communeId]
  );

  res.json({ success: true, data: rows });
});

/** POST /api/commune/groupes */
const createGroupe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user || !isCommuneModerator(req.user.role)) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.body.commune_id);
  await assertCommuneScope(req.user, communeId, db);

  const slug = req.body.slug || slugify(req.body.nom);
  const row = await db.one(
    `INSERT INTO groupe_communautes (commune_id, nom, slug, description, moderateur_id, type_groupe)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [communeId, req.body.nom, slug, req.body.description || null, req.user.id, req.body.type_groupe || 'permanent']
  );

  res.status(201).json({ success: true, data: row });
});

/** GET /api/commune/groupes/:id */
const getGroupe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }


  const groupe = await db.oneOrNone(
    `SELECT gc.*, c.nom AS commune_nom FROM groupe_communautes gc
     JOIN communes c ON c.id = gc.commune_id WHERE gc.id = $1`,
    [req.params.id]
  );
  if (!groupe) {
    const err: ApiError = new Error('Groupe introuvable');
    err.statusCode = 404;
    throw err;
  }
  await assertCommuneScope(req.user, groupe.commune_id, db);

  const [membres, publications] = await Promise.all([
    db.any(
      `SELECT gm.*, u.pseudonyme, u.nom, u.prenom FROM groupe_communaute_membres gm
       JOIN users u ON u.id = gm.user_id WHERE gm.groupe_communaute_id = $1`,
      [req.params.id]
    ),
    db.any(
      `SELECT id, titre, type_publication, categorie, created_at FROM publications
       WHERE groupe_communaute_id = $1 AND is_archived = FALSE ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    )
  ]);

  res.json({ success: true, data: { ...groupe, membres, publications } });
});

/** GET /api/commune/rapports */
const listRapports = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    const err: ApiError = new Error('Authentification requise');
    err.statusCode = 401;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.query.commune_id as string | undefined);
  await assertCommuneScope(req.user, communeId, db);

  const rows = await db.any(
    `SELECT * FROM rapports_performance WHERE commune_id = $1 ORDER BY created_at DESC`,
    [communeId]
  );
  res.json({ success: true, data: rows });
});

/** POST /api/commune/rapports */
const createRapport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user || !isCommuneModerator(req.user.role)) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  const communeId = resolveCommuneId(req.user, req.body.commune_id);
  await assertCommuneScope(req.user, communeId, db);

  const monthStart = new Date(req.body.periode_debut).toISOString().slice(0, 10);

  const counts = await db.one(
    `SELECT
       (SELECT COUNT(*)::int FROM publications WHERE commune_id = $1 AND created_at BETWEEN $2 AND $3) AS nb_publications,
       (SELECT COUNT(DISTINCT user_id)::int FROM users WHERE commune_id = $1 AND dernier_acces BETWEEN $2 AND $3) AS nb_actifs,
       (SELECT COUNT(*)::int FROM sondage_votes sv JOIN publications p ON p.id = sv.publication_id
         WHERE p.commune_id = $1 AND sv.created_at BETWEEN $2 AND $3) AS nb_votes_sondages`,
    [communeId, req.body.periode_debut, req.body.periode_fin]
  );

  const row = await db.one(
    `INSERT INTO rapports_performance
       (commune_id, soumis_par, titre, contenu, periode_debut, periode_fin, indicateurs,
        nb_publications, nb_utilisateurs_actifs, nb_votes_sondages, statut)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'brouillon')
     RETURNING *`,
    [
      communeId,
      req.user.id,
      req.body.titre,
      req.body.contenu || null,
      req.body.periode_debut,
      req.body.periode_fin,
      JSON.stringify(req.body.indicateurs || {}),
      counts.nb_publications,
      counts.nb_actifs,
      counts.nb_votes_sondages
    ]
  );

  res.status(201).json({ success: true, data: row });
});

/** POST /api/commune/rapports/:id/soumettre — Envoyer à l'admin */
const submitRapport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user || !isCommuneModerator(req.user.role)) {
    const err: ApiError = new Error('Non autorisé');
    err.statusCode = 403;
    throw err;
  }

  const rapport = await db.oneOrNone(`SELECT * FROM rapports_performance WHERE id = $1`, [req.params.id]);
  if (!rapport) {
    const err: ApiError = new Error('Rapport introuvable');
    err.statusCode = 404;
    throw err;
  }
  await assertCommuneScope(req.user, rapport.commune_id, db);

  const updated = await db.one(
    `UPDATE rapports_performance SET statut = 'soumis', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND statut IN ('brouillon', 'rejete') RETURNING *`,
    [req.params.id]
  );

  res.json({ success: true, message: 'Rapport soumis à l\'administration', data: updated });
});

router.get('/feed', getFeed);
router.post('/publications', conditionalPublicationPhoto, validate(createPublicationSchema), createPublication);
router.patch('/publications/:id/epingle', validate(pinSchema), togglePin);
router.get('/dashboard', getDashboard);
router.get('/groupes', listGroupes);
router.post('/groupes', validate(createGroupeSchema), createGroupe);
router.get('/groupes/:id', getGroupe);
router.get('/rapports', listRapports);
router.post('/rapports', validate(rapportSchema), createRapport);
router.post('/rapports/:id/soumettre', submitRapport);

export default router;
