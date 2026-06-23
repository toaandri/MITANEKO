-- ============================================
-- MITANEKO — Données fictives (développement / démo)
-- ============================================
-- À exécuter APRÈS schema.sql sur la même base.
-- Idempotent : ON CONFLICT DO NOTHING où pertinent.
-- ============================================

-- Communes d'exemple
INSERT INTO communes (nom, slug, region, description) VALUES
  ('Antananarivo', 'antananarivo', 'Analamanga', 'Capitale de Madagascar'),
  ('Fianarantsoa', 'fianarantsoa', 'Amoron''i Mania', 'Chef-lieu de la région Amoron''i Mania'),
  ('Toliara', 'toliara', 'Atsimo-Andrefana', 'Capitale du sud de Madagascar')
ON CONFLICT (slug) DO NOTHING;

-- Quartiers liés (Antananarivo)
INSERT INTO quartiers (commune_id, nom, slug, description, zone_prioritaire)
SELECT c.id, 'Ankorondrano', 'ankorondrano', 'Quartier exemple pour tests', FALSE
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (commune_id, slug) DO NOTHING;

INSERT INTO quartiers (commune_id, nom, slug, description, zone_prioritaire)
SELECT c.id, 'Isotry', 'isotry', 'Quartier centre-ville', FALSE
FROM communes c WHERE c.slug = 'antananarivo'
ON CONFLICT (commune_id, slug) DO NOTHING;
