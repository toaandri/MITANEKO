from fastapi import APIRouter
from src.routes.classification import router as classification_router
from src.routes.sentiment import router as sentiment_router
from src.routes.moderation import router as moderation_router
from src.routes.translation import router as translation_router
from src.routes.entity_extraction import router as entity_extraction_router
from src.routes.vision import router as vision_router
from src.routes.geo import router as geo_router
from src.routes.chatbot import router as chatbot_router
from src.routes.analytics import router as analytics_router
from src.routes.recommender import router as recommender_router

router = APIRouter(prefix="/api/ia")

router.include_router(classification_router)
router.include_router(sentiment_router)
router.include_router(moderation_router)
router.include_router(translation_router)
router.include_router(entity_extraction_router)
router.include_router(vision_router)
router.include_router(geo_router)
router.include_router(chatbot_router)
router.include_router(analytics_router)
router.include_router(recommender_router)


@router.get("/health")
async def health():
    return {
        "statut": "ok",
        "service": "MITANEKO IA",
        "version": "1.0.0",
        "modules": [
            "classification", "sentiment", "moderation", "traduction",
            "entites", "vision", "geo", "chatbot", "analytics", "recommandations",
        ],
    }


@router.get("/modules")
async def lister_modules():
    return {
        "modules": [
            {
                "nom": "classification",
                "description": "Classification automatique des signalements par catégorie",
                "endpoints": ["POST /api/ia/classification/classer"],
            },
            {
                "nom": "sentiment",
                "description": "Analyse de sentiment des commentaires et descriptions",
                "endpoints": ["POST /api/ia/sentiment/analyser"],
            },
            {
                "nom": "moderation",
                "description": "Modération automatique de contenu toxique",
                "endpoints": ["POST /api/ia/moderation/verifier"],
            },
            {
                "nom": "traduction",
                "description": "Traduction français-malgache des signalements",
                "endpoints": ["POST /api/ia/traduction/traduire"],
            },
            {
                "nom": "entites",
                "description": "Extraction d'entités (lieux, montants, urgences)",
                "endpoints": ["POST /api/ia/entites/extraire"],
            },
            {
                "nom": "vision",
                "description": "Analyse d'images, détection doublons, vérification qualité",
                "endpoints": [
                    "POST /api/ia/vision/analyser",
                    "POST /api/ia/vision/comparer",
                    "POST /api/ia/vision/empreinte",
                    "POST /api/ia/vision/qualite",
                ],
            },
            {
                "nom": "geo",
                "description": "Géocodage texte et détection de clusters spatiaux",
                "endpoints": [
                    "POST /api/ia/geo/geocoder",
                    "POST /api/ia/geo/clusters",
                    "POST /api/ia/geo/zones-impact",
                ],
            },
            {
                "nom": "chatbot",
                "description": "Assistant conversationnel citoyen",
                "endpoints": ["POST /api/ia/chatbot/message"],
            },
            {
                "nom": "analytics",
                "description": "Prédiction, priorisation, anomalies, résumés analytiques",
                "endpoints": [
                    "POST /api/ia/analytics/predire-delai",
                    "POST /api/ia/analytics/priorite",
                    "POST /api/ia/analytics/anomalies",
                    "POST /api/ia/analytics/resume",
                ],
            },
            {
                "nom": "recommandations",
                "description": "Recommandations d'actions pour les élus",
                "endpoints": ["POST /api/ia/recommandations/actions"],
            },
        ]
    }
