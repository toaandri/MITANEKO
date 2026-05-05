-- ============================================
-- MITANEKO - Schema PostgreSQL
-- Plateforme de Gouvernance Participative Urbaine
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. TABLES DE REFERENCE
-- ============================================

-- Énumération des rôles
CREATE TYPE user_role AS ENUM (
  'citoyen',
  'moderateur_quartier',
  'acteur_communal',
  'elu_commune',
  'admin_plateforme'
);

-- Énumération des statuts de signalement
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

-- Énumération des catégories
CREATE TYPE categorie_probleme AS ENUM (
  'proprete',
  'securite',
  'infrastructure',
  'sante',
  'lien_social',
  'autre'
);

-- Énumération des statuts d'action
CREATE TYPE action_status AS ENUM (
  'assignee',
  'en_attente',
  'en_cours',
  'resolu',
  'annulee'
);

-- ============================================
-- 2. TABLE COMMUNES
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
-- 3. TABLE QUARTIERS
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
-- 4. TABLE UTILISATEURS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  telephone VARCHAR(20),
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'citoyen',
  commune_id UUID REFERENCES communes(id) ON DELETE SET NULL,
  quartier_id UUID REFERENCES quartiers(id) ON DELETE SET NULL,
  bio TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_telephone BOOLEAN DEFAULT FALSE,
  date_verification_email TIMESTAMP,
  date_verification_telephone TIMESTAMP,
  anonyme BOOLEAN DEFAULT FALSE,
  preferences_notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  dernier_acces TIMESTAMP,
  status_compte VARCHAR(50) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_commune ON users(commune_id);
CREATE INDEX idx_users_quartier ON users(quartier_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 5. TABLE SIGNALEMENTS
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
-- 6. TABLE PHOTOS SIGNALEMENTS
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
-- 7. TABLE VOTES
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
-- 8. TABLE ACTIONS
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
-- 9. TABLE COMMENTAIRES
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
-- 10. TABLE EVENEMENTS COMMUNAUTAIRES
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
-- 11. TABLE PARTICIPANTS EVENEMENT
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
-- 12. TABLE LOGS ACTIVITES
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
-- 13. TABLE STATISTIQUES AGRÉGÉES
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
-- 14. TABLE NOTIFICATIONS
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
-- 15. TABLE DONNEES ADMINISTRATEURS
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
-- 16. TRIGGERS & FUNCTIONS
-- ============================================

-- Trigger pour mettre à jour le timestamp
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

CREATE TRIGGER trigger_signalements_updated BEFORE UPDATE ON signalements
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_actions_updated BEFORE UPDATE ON actions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_commentaires_updated BEFORE UPDATE ON commentaires
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_evenements_updated BEFORE UPDATE ON evenements
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour incrémenter votes et mettre à jour statut signalement
CREATE OR REPLACE FUNCTION update_signalement_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE signalements SET priorite_votes = priorite_votes + 1 WHERE id = NEW.signalement_id;
    -- Si 5+ votes et statut 'en_attente_vote', passer à 'priorise'
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
-- 17. DONNÉES INITIALES
-- ============================================

-- Insérer quelques communes de test
INSERT INTO communes (nom, slug, region, description) VALUES
  ('Antananarivo', 'antananarivo', 'Analamanga', 'Capitale de Madagascar'),
  ('Fianarantsoa', 'fianarantsoa', 'Amoron''i Mania', 'Chef-lieu de la région Amoron''i Mania'),
  ('Toliara', 'toliara', 'Atsimo-Andrefana', 'Capitale du sud de Madagascar')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 18. VUES UTILES
-- ============================================

-- Vue des signalements avec infos enrichies
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
  c.nom as commune_nom,
  q.nom as quartier_nom,
  u.nom as creator_nom,
  u.email as creator_email,
  COUNT(DISTINCT v.id) as total_votes,
  COUNT(DISTINCT a.id) as total_actions
FROM signalements s
LEFT JOIN communes c ON s.commune_id = c.id
LEFT JOIN quartiers q ON s.quartier_id = q.id
LEFT JOIN users u ON s.creator_id = u.id
LEFT JOIN votes v ON s.id = v.signalement_id
LEFT JOIN actions a ON s.id = a.signalement_id
GROUP BY s.id, s.titre, s.description, s.categorie, s.status, s.priorite_votes,
         s.localisation, s.adresse, s.created_at, c.nom, q.nom, u.nom, u.email;

-- Vue des actions en cours
CREATE OR REPLACE VIEW actions_en_cours AS
SELECT 
  a.id,
  a.titre,
  a.status,
  a.date_cible,
  s.titre as signalement_titre,
  c.nom as commune_nom,
  u.nom as responsable_nom
FROM actions a
LEFT JOIN signalements s ON a.signalement_id = s.id
LEFT JOIN communes c ON a.commune_id = c.id
LEFT JOIN users u ON a.responsable_id = u.id
WHERE a.status IN ('assignee', 'en_attente', 'en_cours')
ORDER BY a.date_cible ASC;

-- ============================================
-- FIN DU SCHEMA
-- ============================================
