# MITANEKO IA - Backend Intelligence Artificielle

Backend d'IA pour la plateforme de gouvernance urbaine participative MITANEKO.

## Architecture

```
backend-IA/
├── main.py                  # Point d'entrée FastAPI
├── requirements.txt         # Dépendances Python
├── .env.example             # Variables d'environnement
├── src/
│   ├── config/
│   │   └── settings.py      # Configuration centralisée
│   ├── services/
│   │   ├── nlp/             # Traitement du langage naturel
│   │   │   ├── classifier.py       # Classification par catégorie
│   │   │   ├── sentiment.py        # Analyse de sentiment
│   │   │   ├── moderation.py       # Détection contenu toxique
│   │   │   ├── translator.py       # Traduction FR/MG
│   │   │   └── entity_extractor.py # Extraction d'entités
│   │   ├── vision/          # Vision par ordinateur
│   │   │   ├── analyzer.py         # Analyse d'images
│   │   │   ├── duplicate_detector.py # Détection doublons
│   │   │   └── quality_checker.py  # Vérification qualité
│   │   ├── geo/             # Géolocalisation intelligente
│   │   │   ├── geocoder.py         # Géocodage texte→coords
│   │   │   └── cluster_detector.py # Clustering spatial
│   │   ├── chat/
│   │   │   └── chatbot.py          # Chatbot citoyen
│   │   ├── analytics/
│   │   │   ├── predictor.py        # Prédiction délais
│   │   │   ├── prioritizer.py      # Score de priorité
│   │   │   ├── anomaly_detector.py # Détection anomalies
│   │   │   └── summary_generator.py # Résumés analytiques
│   │   └── recommender/
│   │       └── action_recommender.py # Recommandations actions
│   ├── routes/              # Endpoints API
│   ├── middleware/          # Auth, rate limiting, erreurs
│   ├── models/
│   │   └── schemas.py       # Modèles Pydantic
│   └── utils/               # Utilitaires
├── models_cache/            # Cache des modèles téléchargés
└── mitaneko_classifier.pkl  # Modèle de classification (généré)
```

## Installation

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Configuration

Copier `.env.example` vers `.env` et ajuster les variables.

## Démarrage

```bash
python main.py
```

Documentation interactive sur http://localhost:8080/docs

## Endpoints API

Tous les endpoints sont préfixés par `/api/ia`.

### NLP
| Endpoint | Description |
|---|---|
| `POST /api/ia/classification/classer` | Classifie un signalement par catégorie |
| `POST /api/ia/sentiment/analyser` | Analyse le sentiment d'un texte |
| `POST /api/ia/moderation/verifier` | Modère un commentaire (toxique/spam) |
| `POST /api/ia/traduction/traduire` | Traduit entre français et malgache |
| `POST /api/ia/entites/extraire` | Extrait lieux, contacts, montants |

### Vision
| Endpoint | Description |
|---|---|
| `POST /api/ia/vision/analyser` | Analyse une image (catégorie, tags) |
| `POST /api/ia/vision/comparer` | Compare deux images (doublon) |
| `POST /api/ia/vision/empreinte` | Génère l'empreinte d'une image |
| `POST /api/ia/vision/qualite` | Vérifie la qualité d'une image |

### Géolocalisation
| Endpoint | Description |
|---|---|
| `POST /api/ia/geo/geocoder` | Géocodage texte vers coordonnées |
| `POST /api/ia/geo/clusters` | Détecte des clusters de signalements |
| `POST /api/ia/geo/zones-impact` | Estime la zone d'impact des clusters |

### Chatbot
| Endpoint | Description |
|---|---|
| `POST /api/ia/chatbot/message` | Dialogue avec le chatbot citoyen |

### Analytics & Décision
| Endpoint | Description |
|---|---|
| `POST /api/ia/analytics/predire-delai` | Prédit le délai de résolution |
| `POST /api/ia/analytics/priorite` | Calcule un score de priorité |
| `POST /api/ia/analytics/anomalies` | Détecte des comportements anormaux |
| `POST /api/ia/analytics/resume` | Génère un résumé analytique (élu) |
| `POST /api/ia/recommandations/actions` | Recommande des actions (élu) |

## Authentification

Les endpoints utilisent JWT Bearer token. Le token doit correspondre à celui du backend MITANEKO principal. Certains endpoints sont restreints par rôle (élu, admin).
