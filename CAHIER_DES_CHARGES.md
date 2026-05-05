# CAHIER DES CHARGES - MITANEKO
## Plateforme de Gouvernance Participative Urbaine

---

## 1. CONTEXTE ET OBJECTIFS

### 1.1 Contexte
MITANEKO est une plateforme numérique participative conçue pour transformer les habitants des quartiers urbains de Madagascar en acteurs réels de leur cadre de vie.

**Problèmes adressés:**
- Pollution et insalubrité persistante des espaces publics
- Insécurité dans les zones non surveillées
- Lien social fragilisé

**Population cible:** 5M+ citoyens urbains à Madagascar

### 1.2 Objectifs principaux
1. Permettre aux citoyens de signaler des problèmes géolocalisés
2. Mobiliser la communauté via un système de vote et de priorisation
3. Suivre les actions menées de manière transparente
4. Organiser collectivement les solutions

### 1.3 Proposition de valeur unique
**La boucle complète:** Signal → Décision → Action → Suivi
- Pas uniquement signaler, mais décider, agir et suivre
- Transparence totale et mesurable pour tous

---

## 2. DESCRIPTION FONCTIONNELLE

### 2.1 Fonctionnalités principales

#### 2.1.1 Signalement géolocalisé + photo
- **Descriptif:** Localisation automatique via GPS, ajout de photos, catégorisation du problème
- **Utilisateurs:** Citoyens
- **Valeur:** Plus de problèmes ignorés - preuves visuelles et géographiques
- **Catégories:** Propreté, sécurité, infrastructure, santé, lien social, autre

#### 2.1.2 Carte interactive temps réel
- **Descriptif:** Visualisation de tous les signalements actifs du quartier en temps réel
- **Utilisateurs:** Citoyens, communes
- **Valeur:** Vision partagée - chaque habitant voit l'état de son quartier
- **Filtres:** Par catégorie, par statut, par date, géographique

#### 2.1.3 Vote & priorisation collective
- **Descriptif:** Les habitants votent pour les urgences à traiter en priorité
- **Utilisateurs:** Citoyens
- **Valeur:** Décisions issues du terrain, démocratie locale
- **Mécanique:** 1 citoyen = 1 vote par problème, vote à majorité simple

#### 2.1.4 Suivi des actions
- **Descriptif:** Statuts en temps réel - en attente / en cours / résolu
- **Utilisateurs:** Communes, citoyens
- **Valeur:** Transparence totale - citoyens voient les résultats concrets
- **Mise à jour:** Acteurs communaux responsables de la mise à jour des statuts

#### 2.1.5 Espace communautaire
- **Descriptif:** Discussions, propositions d'actions, organisation d'événements
- **Utilisateurs:** Citoyens
- **Valeur:** Lien social reconstruit, dynamique d'entraide activée
- **Modération:** Modérateurs communautaires

#### 2.1.6 Tableau de bord commune
- **Descriptif:** Vue agrégée pour les élus - zones critiques, tendances, KPIs
- **Utilisateurs:** Communes/collectivités
- **Valeur:** Outil d'aide à la décision pour optimiser les ressources
- **Données:** Statistiques, heatmaps, rapports d'impact

### 2.2 Utilisateurs cibles

| Rôle | Besoins | Permissions |
|------|---------|------------|
| **Citoyen** | Signaler, voter, suivre, discuter | Lecture quartier assigné, création signalements, vote, commentaires |
| **Modérateur quartier** | Animer discussions, valider signalements | Modération, validation signalements abusifs |
| **Acteur communal** | Mettre à jour statuts, collecter données | Mise à jour actions, consultation tableau de bord |
| **Élu/Manager commune** | Vue stratégique, rapports | Accès complet tableau de bord, export données, gestion équipe |
| **Admin plateforme** | Gestion globale | Gestion communes, utilisateurs, rapports globaux |

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Stack technologique

| Couche | Technologie |
|--------|------------|
| **Frontend Mobile** | React Native (iOS & Android) |
| **Frontend Web** | Angular / Responsive Web |
| **Backend API** | Node.js + Express.js |
| **Base de données** | PostgreSQL |
| **Cartographie** | OpenStreetMap + Leaflet |
| **Notifications** | Firebase Cloud Messaging |
| **Authentication** | JWT + OAuth2 |
| **Cloud** | Firebase Hosting / Cloud Functions |
| **Stockage fichiers** | Cloud Storage (Google Cloud / Firebase) |

### 3.2 Architecture générale
```
┌─────────────────────────────────────────┐
│          Frontend Layer                  │
│  ┌──────────────┬──────────────────────┐ │
│  │ Mobile App   │ Web Dashboard        │ │
│  │ (React Nat.) │ (Angular)            │ │
│  └──────────────┴──────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │ REST API / WebSocket
┌──────────────────▼──────────────────────┐
│          API Layer (Backend)             │
│  Node.js + Express                       │
│  - Auth Service                          │
│  - Signalement Service                   │
│  - Vote Service                          │
│  - Action Service                        │
│  - Comment Service                       │
│  - Analytics Service                     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       Data Layer                         │
│  PostgreSQL + Firebase                   │
│  - Users                                 │
│  - Signalements                          │
│  - Votes                                 │
│  - Actions                               │
│  - Communes                              │
└──────────────────────────────────────────┘
```

### 3.3 Flux de données

**Signalement:**
1. Citoyen crée un signalement (photo + géolocalisation + catégorie)
2. API valide et crée en base de données
3. Notification push/email envoyée aux habitants du quartier
4. Affichage en temps réel sur la carte

**Vote:**
1. Citoyen vote pour un signalement
2. API incrémente le compteur de votes
3. Classement automatique mis à jour
4. Notif aux modérateurs si priorité change

**Action:**
1. Acteur communal assigne une action à une équipe
2. Statut: En attente → En cours → Résolu
3. Notifications à chaque changement
4. Photo de fin pour preuve

---

## 4. SPÉCIFICATIONS DE BASE DE DONNÉES

Voir le fichier `schema.sql` pour les détails complets.

### Entités principales
- **Users** - Utilisateurs inscrits
- **Communes** - Collectivités partenaires
- **Quartiers** - Zones géographiques
- **Signalements** - Rapports de problèmes
- **Votes** - Votes citoyens
- **Actions** - Actions de résolution
- **Commentaires** - Discussions
- **Catégories** - Types de problèmes

---

## 5. SPÉCIFICATIONS API

### 5.1 Endpoints principaux

#### Authentication
```
POST   /api/auth/register       - Inscription
POST   /api/auth/login          - Connexion
POST   /api/auth/logout         - Déconnexion
POST   /api/auth/refresh        - Rafraîchir token
```

#### Signalements
```
GET    /api/signalements                 - Lister (avec filtres)
GET    /api/signalements/:id             - Détails
POST   /api/signalements                 - Créer
PUT    /api/signalements/:id             - Modifier
DELETE /api/signalements/:id             - Supprimer (admin)
GET    /api/signalements/map/geojson     - GeoJSON pour carte
```

#### Votes
```
POST   /api/signalements/:id/votes       - Voter
DELETE /api/signalements/:id/votes       - Retirer vote
GET    /api/signalements/:id/votes       - Lister votes
```

#### Actions
```
GET    /api/actions                      - Lister
POST   /api/signalements/:id/actions     - Créer action
PUT    /api/actions/:id                  - Mettre à jour
GET    /api/actions/:id/progress         - Suivi détaillé
```

#### Commentaires
```
GET    /api/signalements/:id/comments    - Lister
POST   /api/signalements/:id/comments    - Ajouter
DELETE /api/comments/:id                 - Supprimer
```

#### Communes (Admin/Élu)
```
GET    /api/communes                     - Lister
GET    /api/communes/:id/dashboard       - Tableau de bord
GET    /api/communes/:id/stats           - Statistiques
GET    /api/communes/:id/rapport         - Rapport mensuel
```

#### Utilisateurs
```
GET    /api/users/profile                - Mon profil
PUT    /api/users/profile                - Modifier profil
GET    /api/users/:id                    - Profil public
```

---

## 6. SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES

### 6.1 Signalement

**Champs requis:**
- Titre (max 200 chars)
- Description (max 2000 chars)
- Catégorie (enum)
- Localisation (latitude, longitude, adresse)
- Photo(s) (1-5 photos)
- Visibilité (publique/anonyme)

**Validation:**
- Géolocalisation dans quartier autorisé
- Pas plus de 1 signalement identique par jour/quartier
- Photos < 10MB chacune

**États:**
- Créé → Approuvé (modérateur) → En attente de vote → Priorisé
- Ou: Créé → Rejeté (spam/invalide)
- Ou: Créé → En cours (action assignée)
- Ou: En cours → Résolu

### 6.2 Vote

**Règles:**
- 1 citoyen = 1 vote par signalement
- Vote = positif (oui, c'est prioritaire)
- Comptage en temps réel
- Classement automatique par nombre de votes
- Minimum 5 votes avant action

### 6.3 Action

**Champs:**
- Description tâche
- Équipe responsable
- Date cible
- Ressources allouées
- Statut
- Photo avant/après

**Workflow:**
1. Assignée → En attente
2. En attente → En cours (preuve photo)
3. En cours → Résolu (preuve finale)

### 6.4 Indicateurs de succès (KPIs)

| Indicateur | Cible An 1 | Formule |
|------------|-----------|---------|
| Signalements traités | > 500 en 6 mois | COUNT(signalements WHERE status != 'créé') |
| Taux de résolution | > 60% | COUNT(status='résolu') / COUNT(all) |
| Utilisateurs actifs mensuels | > 300 | COUNT(users WITH activity in month) |
| Satisfaction communes | Score > 4/5 | Enquête trimestrielle |
| Réduction déchets ignorés | -40% | Baseline vs fin pilote |
| Événements communautaires | > 5 en 6 mois | COUNT(events) |

---

## 7. CONTRAINTES NON-FONCTIONNELLES

### 7.1 Performance
- Temps de réponse API < 500ms (p95)
- Carte : < 2s pour charger 1000 signalements
- Pas plus de 5s pour créer signalement (avec upload photo)

### 7.2 Disponibilité
- Uptime cible: 99%
- Récupération après panne < 1h

### 7.3 Sécurité
- HTTPS obligatoire
- Authentification JWT
- Validation des inputs (injection SQL/XSS)
- Chiffrement données sensibles (localisation précise anonymisée au besoin)
- RGPD-compliant (droit à l'oubli, données export)

### 7.4 Accessibilité
- Interface pensée pour faible bande passante
- Mode hors-ligne partiel (React Native)
- Niveau WCAG AA minimum

### 7.5 Scalabilité
- Architecture stateless (API Gateway + multiple instances)
- Database clustering (PostgreSQL replication)
- CDN pour static assets
- Cache Redis pour quartiers actifs

---

## 8. TIMELINE ET PHASES

### Phase 1 - Pilote (Mois 1-6)
- 1 quartier pilote à Antananarivo
- 200 beta-testeurs
- Itérations rapides produit
- Mesure KPIs initiaux

### Phase 2 - Croissance (Mois 7-18)
- 3-4 communes partenaires
- Équipe commerciale B2G
- Partenariats ONG actifs
- Première rentabilité partielle

### Phase 3 - Expansion (An 3+)
- 10+ communes nationales
- Déploiement sous-régional Afrique
- Modèle franchise envisagé
- Levée de fonds Série A

---

## 9. LIVRABLES

### Cœur produit
- [ ] Backend API complète (Node.js)
- [ ] App mobile (React Native) - iOS & Android
- [ ] Dashboard web (Angular)
- [ ] Base de données (PostgreSQL)
- [ ] Cartographie interactive (OpenStreetMap)
- [ ] Système notifications (Firebase)

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Guide utilisateur (3 langues)
- [ ] Documentation technique
- [ ] Plan de déploiement

### Tests
- [ ] Tests unitaires (> 80% coverage)
- [ ] Tests d'intégration
- [ ] Tests de charge
- [ ] Tests de sécurité

---

## 10. RESSOURCES REQUISES

### Team
- 1 Lead Dev Backend (Node.js)
- 1 Dev Mobile (React Native)
- 1 Dev Frontend (Angular)
- 1 Designer UX/UI
- 1 Responsable Terrain
- 1 Manager Croissance

### Infrastructure
- Serveurs cloud (Firebase / GCP)
- Base de données PostgreSQL
- CDN pour assets
- SMS/Email provider

### Budget
- **An 1:** 2.1M MGA
- **An 2:** 2.2M MGA
- **An 3:** 4.7M MGA

---

## 11. CRITÈRES DE SUCCÈS

✅ **Technique:**
- API répond aux specs en < 500ms
- 0 faille de sécurité critique
- Uptime > 99%

✅ **Produit:**
- > 500 signalements en 6 mois
- > 300 utilisateurs actifs mensuels
- Score satisfaction > 4/5

✅ **Impact:**
- 60% des signalements résolus
- -40% des déchets ignorés
- 5+ événements communautaires

---

**Document créé:** Mai 2026  
**Statut:** Version 1.0 - En cours d'implémentation
