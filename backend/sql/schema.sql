-- ============================================
-- MITANEKO — Structure PostgreSQL
-- ============================================
-- Fichier : sql/schema.sql
-- Contenu : extensions, types, tables, index, triggers, vues
-- Usage   : psql mitaneko_db -f sql/schema.sql
-- Données : voir sql/seed.sql (à exécuter après)
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. TYPES ENUM
-- ============================================

CREATE TYPE user_role AS ENUM (
  'citoyen',
  'moderateur_quartier',
  'acteur_communal',
  'elu_commune',
  'admin_plateforme'
);

CREATE TYPE signalement_status AS ENUM (
  'cree',
  'approuve',
  'en_attente_vote',
  'priorise',
  'en_cours',
  'resolu',
  'rejete',
  'ferme'
);

CREATE TYPE categorie_probleme AS ENUM (
  'proprete',
  'securite',
  'infrastructure',
  'sante',
  'lien_social',
  'autre'
);

CREATE TYPE action_status AS ENUM (
  'assignee',
  'en_attente',
  'en_cours',
  'resolu',
  'annulee'
);

CREATE TYPE token_type AS ENUM ('inscription', 'migration');

CREATE TYPE publication_categorie AS ENUM (
  'securite', 'entraide', 'hygiene', 'communaute', 'conseil', 'autre'
);

CREATE TYPE publication_portee AS ENUM ('fokontany', 'commune', 'securite_zone');

CREATE TYPE publication_type AS ENUM (
  'standard', 'sondage', 'officielle', 'participation', 'mise_a_jour'
);

CREATE TYPE moderation_entity_type AS ENUM ('publication', 'commentaire', 'signalement');

CREATE TYPE moderation_statut AS ENUM (
  'en_attente', 'approuve', 'supprime', 'suspendu_auteur'
);

CREATE TYPE sanction_type AS ENUM ('avertissement', 'suspension', 'bannissement');

CREATE TYPE rapport_statut AS ENUM ('brouillon', 'soumis', 'publie', 'rejete');

-- ============================================
-- 2. COMMUNES
-- ============================================

CREATE TABLE communes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  code_commune VARCHAR(50),
  region VARCHAR(255),
  localisation GEOGRAPHY(POINT, 4326),
  description TEXT,
  maire_email VARCHAR(255),
  maire_telephone VARCHAR(20),
  contact_principal_nom VARCHAR(255),
  contact_principal_email VARCHAR(255),
  contact_principal_role VARCHAR(255),
  statut_partenariat VARCHAR(50) DEFAULT 'en_negociation',
  date_lancement DATE,
  abonnement_niveau VARCHAR(50) DEFAULT 'basic',
  population_estimee INTEGER,
  nb_quartiers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_communes_slug ON communes(slug);
CREATE INDEX idx_communes_localisation ON communes USING GIST(localisation);

-- ============================================
-- 3. QUARTIERS (= fokontany)
-- ============================================

CREATE TABLE quartiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  localisation_polygone GEOGRAPHY(POLYGON, 4326),
  localisation_centroide GEOGRAPHY(POINT, 4326),
  population_estimee INTEGER,
  zone_prioritaire BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(commune_id, slug)
);

CREATE INDEX idx_quartiers_commune ON quartiers(commune_id);
CREATE INDEX idx_quartiers_localisation ON quartiers USING GIST(localisation_polygone);

-- ============================================
-- 4. UTILISATEURS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  telephone VARCHAR(20),
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255),
  pseudonyme VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'citoyen',
  commune_id UUID REFERENCES communes(id) ON DELETE SET NULL,
  quartier_id UUID REFERENCES quartiers(id) ON DELETE SET NULL,
  registration_token_id UUID,
  bio TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_telephone BOOLEAN DEFAULT FALSE,
  date_verification_email TIMESTAMP,
  date_verification_telephone TIMESTAMP,
  anonyme BOOLEAN DEFAULT FALSE,
  preferences_notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  dernier_acces TIMESTAMP,
  status_compte VARCHAR(50) DEFAULT 'actif',
  suspendu_jusqu_a TIMESTAMP,
  nb_sanctions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_commune ON users(commune_id);
CREATE INDEX idx_users_quartier ON users(quartier_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_pseudonyme ON users(pseudonyme);

-- ============================================
-- 5. TOKENS D'INSCRIPTION FOKONTANY
-- ============================================

CREATE TABLE registration_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_code VARCHAR(12) NOT NULL UNIQUE,
  type token_type NOT NULL DEFAULT 'inscription',
  quartier_id UUID NOT NULL REFERENCES quartiers(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  migration_from_quartier_id UUID REFERENCES quartiers(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registration_tokens_code ON registration_tokens(token_code);
CREATE INDEX idx_registration_tokens_quartier ON registration_tokens(quartier_id);
CREATE INDEX idx_registration_tokens_used ON registration_tokens(is_used);

ALTER TABLE users
  ADD CONSTRAINT users_registration_token_id_fkey
  FOREIGN KEY (registration_token_id) REFERENCES registration_tokens(id) ON DELETE SET NULL;

-- ============================================
-- 6. GROUPES COMMUNAUTÉ
-- ============================================

CREATE TABLE groupe_communautes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  moderateur_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type_groupe VARCHAR(50) DEFAULT 'permanent',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commune_id, slug)
);

CREATE INDEX idx_groupe_communautes_commune ON groupe_communautes(commune_id);

-- ============================================
-- 7. PUBLICATIONS COMMUNAUTAIRES
-- ============================================

CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  titre VARCHAR(200) NOT NULL,
  contenu TEXT NOT NULL,
  categorie publication_categorie NOT NULL,
  type_publication publication_type NOT NULL DEFAULT 'standard',
  portee publication_portee NOT NULL DEFAULT 'fokontany',
  quartier_id UUID REFERENCES quartiers(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  groupe_communaute_id UUID REFERENCES groupe_communautes(id) ON DELETE SET NULL,
  parent_publication_id UUID REFERENCES publications(id) ON DELETE SET NULL,
  statut_mise_a_jour VARCHAR(100),
  localisation GEOGRAPHY(POINT, 4326),
  adresse VARCHAR(500),
  photo_url TEXT,
  date_evenement TIMESTAMP,
  is_officielle BOOLEAN DEFAULT FALSE,
  is_epinglee BOOLEAN DEFAULT FALSE,
  epinglee_at TIMESTAMP,
  epinglee_par UUID REFERENCES users(id) ON DELETE SET NULL,
  participation_active BOOLEAN DEFAULT FALSE,
  moderation_statut moderation_statut DEFAULT 'approuve',
  ia_result JSONB,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publications_type ON publications(type_publication);
CREATE INDEX idx_publications_parent ON publications(parent_publication_id);
CREATE INDEX idx_publications_epinglee ON publications(is_epinglee) WHERE is_epinglee = TRUE;
CREATE INDEX idx_publications_moderation ON publications(moderation_statut);

CREATE INDEX idx_publications_quartier ON publications(quartier_id);
CREATE INDEX idx_publications_commune ON publications(commune_id);
CREATE INDEX idx_publications_categorie ON publications(categorie);
CREATE INDEX idx_publications_portee ON publications(portee);
CREATE INDEX idx_publications_groupe ON publications(groupe_communaute_id);
CREATE INDEX idx_publications_localisation ON publications USING GIST(localisation);
CREATE INDEX idx_publications_created ON publications(created_at DESC);

-- ============================================
-- 7b. SONDAGES (options + votes)
-- ============================================

CREATE TABLE sondage_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  libelle VARCHAR(255) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sondage_options_publication ON sondage_options(publication_id);

CREATE TABLE sondage_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES sondage_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(publication_id, user_id)
);

CREATE INDEX idx_sondage_votes_publication ON sondage_votes(publication_id);

-- ============================================
-- 7c. PARTICIPATION « Je participe »
-- ============================================

CREATE TABLE publication_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(publication_id, user_id)
);

CREATE INDEX idx_publication_participants_pub ON publication_participants(publication_id);

-- ============================================
-- 7d. GROUPES D'ENTRAIDE TEMPORAIRES
-- ============================================

CREATE TABLE groupes_entraide (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL UNIQUE REFERENCES publications(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  representant_police VARCHAR(255),
  is_actif BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groupes_entraide_commune ON groupes_entraide(commune_id);

CREATE TABLE groupe_entraide_membres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  groupe_id UUID NOT NULL REFERENCES groupes_entraide(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_membre VARCHAR(50) DEFAULT 'participant',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(groupe_id, user_id)
);

CREATE TABLE groupe_entraide_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  groupe_id UUID NOT NULL REFERENCES groupes_entraide(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groupe_entraide_messages_groupe ON groupe_entraide_messages(groupe_id, created_at DESC);

-- ============================================
-- 7e. MEMBRES DES GROUPES COMMUNAUTÉ MODÉRÉS
-- ============================================

CREATE TABLE groupe_communaute_membres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  groupe_communaute_id UUID NOT NULL REFERENCES groupe_communautes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_membre VARCHAR(50) DEFAULT 'membre',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(groupe_communaute_id, user_id)
);

-- ============================================
-- 7f. FILE DE MODÉRATION (censure)
-- ============================================

CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type moderation_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  signale_par UUID REFERENCES users(id) ON DELETE SET NULL,
  raison TEXT,
  ia_result JSONB,
  ia_action_recommandee VARCHAR(50),
  statut moderation_statut DEFAULT 'en_attente',
  action_prise VARCHAR(100),
  traite_par UUID REFERENCES users(id) ON DELETE SET NULL,
  date_traitement TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_queue_commune ON moderation_queue(commune_id, statut);
CREATE INDEX idx_moderation_queue_entity ON moderation_queue(entity_type, entity_id);

-- ============================================
-- 7g. SANCTIONS UTILISATEURS
-- ============================================

CREATE TABLE sanctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  type sanction_type NOT NULL,
  duree_jours INTEGER,
  expire_le TIMESTAMP,
  motif TEXT NOT NULL,
  sanctionne_par UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  entity_type moderation_entity_type,
  entity_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sanctions_user ON sanctions(user_id);
CREATE INDEX idx_sanctions_commune ON sanctions(commune_id);

-- ============================================
-- 7h. REPUBLICATIONS (limite 1/jour/personne/publication)
-- ============================================

CREATE TABLE publication_republications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_origine_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  publication_mise_a_jour_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  statut_mise_a_jour VARCHAR(100),
  contenu_mise_a_jour TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_republications_origine ON publication_republications(publication_origine_id);
CREATE INDEX idx_republications_auteur_date ON publication_republications(auteur_id, created_at DESC);

-- ============================================
-- 7i. RAPPORTS DE PERFORMANCE (commune → admin)
-- ============================================

CREATE TABLE rapports_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  soumis_par UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  titre VARCHAR(255) NOT NULL,
  contenu TEXT,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  indicateurs JSONB NOT NULL DEFAULT '{}',
  nb_publications INTEGER DEFAULT 0,
  nb_utilisateurs_actifs INTEGER DEFAULT 0,
  nb_votes_sondages INTEGER DEFAULT 0,
  statut rapport_statut DEFAULT 'brouillon',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rapports_commune ON rapports_performance(commune_id, statut);

-- ============================================
-- 7j. MÉTRIQUES PUBLIQUES (admin → site public)
-- ============================================

CREATE TABLE metriques_publiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre VARCHAR(255) NOT NULL,
  contenu TEXT NOT NULL,
  commune_id UUID REFERENCES communes(id) ON DELETE SET NULL,
  rapport_id UUID REFERENCES rapports_performance(id) ON DELETE SET NULL,
  indicateurs JSONB NOT NULL DEFAULT '{}',
  publie_par UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_visible BOOLEAN DEFAULT FALSE,
  date_publication TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metriques_publiques_visible ON metriques_publiques(is_visible, date_publication DESC);

-- ============================================
-- 8. SIGNALEMENTS
-- ============================================

CREATE TABLE signalements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  quartier_id UUID NOT NULL REFERENCES quartiers(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  titre VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  categorie categorie_probleme NOT NULL,
  localisation GEOGRAPHY(POINT, 4326) NOT NULL,
  adresse VARCHAR(500),
  status signalement_status DEFAULT 'cree',
  visibilite VARCHAR(50) DEFAULT 'publique',
  priorite_votes INTEGER DEFAULT 0,
  modere BOOLEAN DEFAULT FALSE,
  modere_par UUID REFERENCES users(id) ON DELETE SET NULL,
  date_moderation TIMESTAMP,
  raison_rejet TEXT,
  date_resolution TIMESTAMP,
  photo_principale_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_signalements_commune ON signalements(commune_id);
CREATE INDEX idx_signalements_quartier ON signalements(quartier_id);
CREATE INDEX idx_signalements_creator ON signalements(creator_id);
CREATE INDEX idx_signalements_categorie ON signalements(categorie);
CREATE INDEX idx_signalements_status ON signalements(status);
CREATE INDEX idx_signalements_localisation ON signalements USING GIST(localisation);
CREATE INDEX idx_signalements_created ON signalements(created_at DESC);

-- ============================================
-- 9. PHOTOS SIGNALEMENTS
-- ============================================

CREATE TABLE signalement_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signalement_id UUID NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  nom_fichier VARCHAR(500),
  taille_bytes INTEGER,
  mime_type VARCHAR(100),
  position INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signalement_photos_signalement ON signalement_photos(signalement_id);

-- ============================================
-- 10. VOTES
-- ============================================

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signalement_id UUID NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(50) DEFAULT 'positif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(signalement_id, user_id)
);

CREATE INDEX idx_votes_signalement ON votes(signalement_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- ============================================
-- 11. ACTIONS
-- ============================================

CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signalement_id UUID NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  status action_status DEFAULT 'assignee',
  equipe_responsable VARCHAR(255),
  responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date_cible DATE,
  date_debut TIMESTAMP,
  date_fin TIMESTAMP,
  ressources_allouees VARCHAR(500),
  budget_estime DECIMAL(10, 2),
  priorite INTEGER DEFAULT 0,
  photo_avant_url TEXT,
  photo_apres_url TEXT,
  notes_progression TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_actions_signalement ON actions(signalement_id);
CREATE INDEX idx_actions_commune ON actions(commune_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_responsable ON actions(responsable_id);

-- ============================================
-- 12. COMMENTAIRES
-- ============================================

CREATE TABLE commentaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signalement_id UUID NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  parent_id UUID REFERENCES commentaires(id) ON DELETE CASCADE,
  type_commentaire VARCHAR(50) DEFAULT 'general',
  is_moderated BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commentaires_signalement ON commentaires(signalement_id);
CREATE INDEX idx_commentaires_author ON commentaires(author_id);
CREATE INDEX idx_commentaires_parent ON commentaires(parent_id);

-- ============================================
-- 13. ÉVÉNEMENTS
-- ============================================

CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  quartier_id UUID REFERENCES quartiers(id) ON DELETE SET NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  type_evenement VARCHAR(100),
  organisateur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP,
  localisation GEOGRAPHY(POINT, 4326),
  adresse VARCHAR(500),
  nb_participants_estime INTEGER,
  nb_participants_reel INTEGER DEFAULT 0,
  statut VARCHAR(50) DEFAULT 'planifie',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evenements_commune ON evenements(commune_id);
CREATE INDEX idx_evenements_quartier ON evenements(quartier_id);
CREATE INDEX idx_evenements_date ON evenements(date_debut);

-- ============================================
-- 14. PARTICIPANTS ÉVÉNEMENT
-- ============================================

CREATE TABLE evenement_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evenement_id UUID NOT NULL REFERENCES evenements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statut_participation VARCHAR(50) DEFAULT 'confirme',
  date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(evenement_id, user_id)
);

CREATE INDEX idx_evenement_participants_evenement ON evenement_participants(evenement_id);
CREATE INDEX idx_evenement_participants_user ON evenement_participants(user_id);

-- ============================================
-- 15. LOGS ACTIVITÉS
-- ============================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  action VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ============================================
-- 16. STATISTIQUES
-- ============================================

CREATE TABLE statistiques_quartier (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quartier_id UUID NOT NULL REFERENCES quartiers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  nb_signalements_total INTEGER DEFAULT 0,
  nb_signalements_resolus INTEGER DEFAULT 0,
  nb_signalements_en_cours INTEGER DEFAULT 0,
  nb_votes_total INTEGER DEFAULT 0,
  nb_utilisateurs_actifs INTEGER DEFAULT 0,
  nb_actions_completees INTEGER DEFAULT 0,
  taux_resolution_percent DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quartier_id, date)
);

CREATE INDEX idx_statistiques_quartier ON statistiques_quartier(quartier_id, date);

CREATE TABLE statistiques_commune (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  nb_signalements_total INTEGER DEFAULT 0,
  nb_signalements_resolus INTEGER DEFAULT 0,
  nb_signalements_en_cours INTEGER DEFAULT 0,
  nb_utilisateurs_total INTEGER DEFAULT 0,
  nb_utilisateurs_actifs INTEGER DEFAULT 0,
  nb_actions_completees INTEGER DEFAULT 0,
  taux_resolution_percent DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commune_id, date)
);

CREATE INDEX idx_statistiques_commune ON statistiques_commune(commune_id, date);

-- ============================================
-- 17. NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titre VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type_notification VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id UUID,
  lue BOOLEAN DEFAULT FALSE,
  date_lecture TIMESTAMP,
  canal_envoi VARCHAR(50),
  date_envoi TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_lue ON notifications(lue);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 18. PARAMÈTRES ADMIN
-- ============================================

CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commune_id UUID REFERENCES communes(id) ON DELETE CASCADE,
  cle VARCHAR(255) NOT NULL,
  valeur JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commune_id, cle)
);

-- ============================================
-- 19. FONCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_communes_updated BEFORE UPDATE ON communes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_quartiers_updated BEFORE UPDATE ON quartiers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_users_updated BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_groupe_communautes_updated BEFORE UPDATE ON groupe_communautes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_publications_updated BEFORE UPDATE ON publications
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_groupes_entraide_updated BEFORE UPDATE ON groupes_entraide
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_rapports_performance_updated BEFORE UPDATE ON rapports_performance
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_metriques_publiques_updated BEFORE UPDATE ON metriques_publiques
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_signalements_updated BEFORE UPDATE ON signalements
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_actions_updated BEFORE UPDATE ON actions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_commentaires_updated BEFORE UPDATE ON commentaires
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_evenements_updated BEFORE UPDATE ON evenements
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE FUNCTION update_signalement_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE signalements SET priorite_votes = priorite_votes + 1 WHERE id = NEW.signalement_id;
    UPDATE signalements SET status = 'priorise'
    WHERE id = NEW.signalement_id
      AND status = 'en_attente_vote'
      AND priorite_votes >= 5;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE signalements SET priorite_votes = priorite_votes - 1 WHERE id = OLD.signalement_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_votes AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_signalement_votes();

-- ============================================
-- 20. VUES
-- ============================================

CREATE OR REPLACE VIEW signalements_enrichis AS
SELECT
  s.id,
  s.titre,
  s.description,
  s.categorie,
  s.status,
  s.priorite_votes,
  s.localisation,
  s.adresse,
  s.created_at,
  c.nom AS commune_nom,
  q.nom AS quartier_nom,
  u.nom AS creator_nom,
  u.email AS creator_email,
  COUNT(DISTINCT v.id) AS total_votes,
  COUNT(DISTINCT a.id) AS total_actions
FROM signalements s
LEFT JOIN communes c ON s.commune_id = c.id
LEFT JOIN quartiers q ON s.quartier_id = q.id
LEFT JOIN users u ON s.creator_id = u.id
LEFT JOIN votes v ON s.id = v.signalement_id
LEFT JOIN actions a ON s.id = a.signalement_id
GROUP BY s.id, s.titre, s.description, s.categorie, s.status, s.priorite_votes,
         s.localisation, s.adresse, s.created_at, c.nom, q.nom, u.nom, u.email;

CREATE OR REPLACE VIEW actions_en_cours AS
SELECT
  a.id,
  a.titre,
  a.status,
  a.date_cible,
  s.titre AS signalement_titre,
  c.nom AS commune_nom,
  u.nom AS responsable_nom
FROM actions a
LEFT JOIN signalements s ON a.signalement_id = s.id
LEFT JOIN communes c ON a.commune_id = c.id
LEFT JOIN users u ON a.responsable_id = u.id
WHERE a.status IN ('assignee', 'en_attente', 'en_cours')
ORDER BY a.date_cible ASC;
