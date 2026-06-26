-- ============================================
-- MITANEKO — Données de démonstration
-- ============================================
-- Fichier : sql/seed.sql
-- Usage   : psql mitaneko_db -f sql/seed.sql  (après sql/schema.sql)
-- Idempotent : ON CONFLICT DO NOTHING où pertinent
--
-- Comptes de test (mot de passe : mitaneko123)
--   admin@mitaneko.mg
--   moderateur.ankorondrano@mitaneko.mg
--   acteur.antananarivo@mitaneko.mg
--   elu.antananarivo@mitaneko.mg
--   Citoyen démo : téléphone 0340000001 / pseudonyme Rakoto_Demo
--
-- Code d'inscription fokontany disponible : DEMO0002
-- Code migration démo : MIGR0001
-- ============================================

-- Mot de passe bcrypt pour tous les comptes démo : mitaneko123

-- ============================================
-- 1. COMMUNES
-- ============================================

INSERT INTO communes (nom, slug, region, description, localisation) VALUES
  (
    'Antananarivo', 'antananarivo', 'Analamanga', 'Capitale de Madagascar',
    ST_SetSRID(ST_MakePoint(47.5079, -18.8792), 4326)::geography
  ),
  (
    'Fianarantsoa', 'fianarantsoa', 'Amoron''i Mania',
    'Chef-lieu de la région Amoron''i Mania',
    ST_SetSRID(ST_MakePoint(47.0856, -21.4536), 4326)::geography
  ),
  (
    'Toliara', 'toliara', 'Atsimo-Andrefana', 'Capitale du sud de Madagascar',
    ST_SetSRID(ST_MakePoint(43.6777, -23.3516), 4326)::geography
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. QUARTIERS / FOKONTANY
-- ============================================

INSERT INTO quartiers (commune_id, nom, slug, description, zone_prioritaire, localisation_centroide)
SELECT c.id, 'Ankorondrano', 'ankorondrano', 'Fokontany exemple — Ankorondrano', FALSE,
       ST_SetSRID(ST_MakePoint(47.5237, -18.7899), 4326)::geography
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (commune_id, slug) DO NOTHING;

INSERT INTO quartiers (commune_id, nom, slug, description, zone_prioritaire, localisation_centroide)
SELECT c.id, 'Isotry', 'isotry', 'Fokontany centre-ville — Isotry', FALSE,
       ST_SetSRID(ST_MakePoint(47.5200, -18.9100), 4326)::geography
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (commune_id, slug) DO NOTHING;

-- Polygones simplifiés (~1 km²) pour tests géolocalisation sécurité
UPDATE quartiers q SET localisation_polygone = ST_SetSRID(ST_MakePolygon(ST_GeomFromText(
  'LINESTRING(47.518  -18.785, 47.530  -18.785, 47.530  -18.795, 47.518  -18.795, 47.518  -18.785)'
)), 4326)::geography
FROM communes c
WHERE q.commune_id = c.id AND c.slug = 'antananarivo' AND q.slug = 'ankorondrano'
  AND q.localisation_polygone IS NULL;

UPDATE quartiers q SET localisation_polygone = ST_SetSRID(ST_MakePolygon(ST_GeomFromText(
  'LINESTRING(47.515  -18.905, 47.525  -18.905, 47.525  -18.915, 47.515  -18.915, 47.515  -18.905)'
)), 4326)::geography
FROM communes c
WHERE q.commune_id = c.id AND c.slug = 'antananarivo' AND q.slug = 'isotry'
  AND q.localisation_polygone IS NULL;

-- ============================================
-- 3. GROUPES COMMUNAUTÉ
-- ============================================

INSERT INTO groupe_communautes (commune_id, nom, slug, description)
SELECT c.id, 'Communauté Antananarivo', 'communaute-antananarivo',
       'Groupe communautaire ouvert aux citoyens d''Antananarivo'
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (commune_id, slug) DO NOTHING;

-- ============================================
-- 4. UTILISATEURS STAFF
-- ============================================

INSERT INTO users (email, nom, prenom, password_hash, role)
VALUES (
  'admin@mitaneko.mg', 'Admin', 'Plateforme', '$2a$10$BLuJ0aQJ5655u2Mc7mRGteq7FTR0mBXv44Wyuf90FuxX7KaEXIbQS', 'admin_plateforme'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, nom, prenom, password_hash, role, commune_id, quartier_id)
SELECT
  'moderateur.ankorondrano@mitaneko.mg', 'Rabe', 'Jean', '$2a$10$BLuJ0aQJ5655u2Mc7mRGteq7FTR0mBXv44Wyuf90FuxX7KaEXIbQS',
  'moderateur_quartier', c.id, q.id
FROM communes c
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
WHERE c.slug = 'antananarivo'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, nom, prenom, password_hash, role, commune_id)
SELECT
  'acteur.antananarivo@mitaneko.mg', 'Randria', 'Paul', '$2a$10$BLuJ0aQJ5655u2Mc7mRGteq7FTR0mBXv44Wyuf90FuxX7KaEXIbQS',
  'acteur_communal', c.id
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, nom, prenom, password_hash, role, commune_id)
SELECT
  'elu.antananarivo@mitaneko.mg', 'Rakoto', 'Marie', '$2a$10$BLuJ0aQJ5655u2Mc7mRGteq7FTR0mBXv44Wyuf90FuxX7KaEXIbQS',
  'elu_commune', c.id
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 5. TOKENS FOKONTANY
-- ============================================

INSERT INTO registration_tokens (token_code, type, quartier_id, commune_id, created_by, expires_at, notes)
SELECT
  'DEMO0001', 'inscription', q.id, c.id, u.id,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  'Code démo — inscription citoyen Ankorondrano'
FROM communes c
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
JOIN users u ON u.email = 'moderateur.ankorondrano@mitaneko.mg'
WHERE c.slug = 'antananarivo'
ON CONFLICT (token_code) DO NOTHING;

INSERT INTO registration_tokens (token_code, type, quartier_id, commune_id, created_by, expires_at, notes)
SELECT
  'DEMO0002', 'inscription', q.id, c.id, u.id,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  'Code démo disponible — inscription citoyen Ankorondrano'
FROM communes c
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
JOIN users u ON u.email = 'moderateur.ankorondrano@mitaneko.mg'
WHERE c.slug = 'antananarivo'
ON CONFLICT (token_code) DO NOTHING;

INSERT INTO registration_tokens (token_code, type, quartier_id, commune_id, created_by, migration_from_quartier_id, expires_at, notes)
SELECT
  'MIGR0001', 'migration', q_to.id, c.id, u.id, q_from.id,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  'Code démo — migration Isotry → Ankorondrano'
FROM communes c
JOIN quartiers q_to ON q_to.commune_id = c.id AND q_to.slug = 'ankorondrano'
JOIN quartiers q_from ON q_from.commune_id = c.id AND q_from.slug = 'isotry'
JOIN users u ON u.email = 'moderateur.ankorondrano@mitaneko.mg'
WHERE c.slug = 'antananarivo'
ON CONFLICT (token_code) DO NOTHING;

-- ============================================
-- 6. CITOYEN DÉMO (déjà inscrit via token)
-- ============================================

INSERT INTO users (nom, prenom, telephone, pseudonyme, password_hash, role, commune_id, quartier_id, verified_telephone, registration_token_id)
SELECT
  'Rakoto', 'Demo', '0340000001', 'Rakoto_Demo', '$2a$10$BLuJ0aQJ5655u2Mc7mRGteq7FTR0mBXv44Wyuf90FuxX7KaEXIbQS', 'citoyen',
  c.id, q.id, TRUE, rt.id
FROM communes c
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
JOIN registration_tokens rt ON rt.token_code = 'DEMO0001'
WHERE c.slug = 'antananarivo'
  AND NOT EXISTS (SELECT 1 FROM users WHERE pseudonyme = 'Rakoto_Demo');

UPDATE registration_tokens rt SET is_used = TRUE, used_at = CURRENT_TIMESTAMP, used_by = u.id
FROM users u
WHERE rt.token_code = 'DEMO0001' AND u.pseudonyme = 'Rakoto_Demo' AND rt.is_used = FALSE;

-- ============================================
-- 7. PUBLICATIONS DÉMO
-- ============================================

INSERT INTO publications (creator_id, titre, contenu, categorie, portee, quartier_id, commune_id, localisation, adresse)
SELECT
  u.id,
  'Entraide voisinage — courses',
  'Bonjour voisins, je peux aider les personnes âgées pour les courses ce week-end.',
  'entraide', 'fokontany', q.id, c.id, q.localisation_centroide, 'Ankorondrano'
FROM users u
JOIN communes c ON c.slug = 'antananarivo'
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
WHERE u.pseudonyme = 'Rakoto_Demo'
  AND NOT EXISTS (
    SELECT 1 FROM publications p WHERE p.titre = 'Entraide voisinage — courses'
  );

INSERT INTO publications (creator_id, titre, contenu, categorie, portee, quartier_id, commune_id, localisation, adresse)
SELECT
  u.id,
  'Alerte sécurité — vol de pickpocket',
  'Attention aux pickpockets près du marché, plusieurs signalements ce matin.',
  'securite', 'securite_zone', q.id, c.id,
  ST_SetSRID(ST_MakePoint(47.5237, -18.7899), 4326)::geography,
  'Marché Ankorondrano'
FROM users u
JOIN communes c ON c.slug = 'antananarivo'
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
WHERE u.pseudonyme = 'Rakoto_Demo'
  AND NOT EXISTS (
    SELECT 1 FROM publications p WHERE p.titre = 'Alerte sécurité — vol de pickpocket'
  );

INSERT INTO publications (creator_id, titre, contenu, categorie, portee, commune_id, groupe_communaute_id)
SELECT
  u.id,
  'Nettoyage communautaire Antananarivo',
  'Grande journée de propreté ouverte à tous les quartiers de la commune.',
  'communaute', 'commune', c.id, gc.id
FROM users u
JOIN communes c ON c.slug = 'antananarivo'
JOIN groupe_communautes gc ON gc.commune_id = c.id AND gc.slug = 'communaute-antananarivo'
WHERE u.email = 'acteur.antananarivo@mitaneko.mg'
  AND NOT EXISTS (
    SELECT 1 FROM publications p WHERE p.titre = 'Nettoyage communautaire Antananarivo'
  );

-- ============================================
-- 8. SIGNALEMENT DÉMO
-- ============================================

INSERT INTO signalements (commune_id, quartier_id, creator_id, titre, description, categorie, localisation, adresse, status)
SELECT
  c.id, q.id, u.id,
  'Déchets au coin de la rue',
  'Accumulation de déchets non ramassés depuis une semaine.',
  'proprete',
  ST_SetSRID(ST_MakePoint(47.5240, -18.7905), 4326)::geography,
  'Rue principale Ankorondrano',
  'cree'
FROM users u
JOIN communes c ON c.slug = 'antananarivo'
JOIN quartiers q ON q.commune_id = c.id AND q.slug = 'ankorondrano'
WHERE u.pseudonyme = 'Rakoto_Demo'
  AND NOT EXISTS (
    SELECT 1 FROM signalements s WHERE s.titre = 'Déchets au coin de la rue'
  );
