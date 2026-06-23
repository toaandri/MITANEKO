"""
MITANEKO IA - Backend d'intelligence artificielle pour la gouvernance urbaine participative
Point d'entrée principal de l'application FastAPI
"""

import logging
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import settings
from src.routes.router import router
from src.middleware.error_handler import global_error_handler

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mitaneko_ia")

app = FastAPI(
    title="MITANEKO IA",
    description="""
    API d'intelligence artificielle pour la plateforme de gouvernance urbaine participative MITANEKO.
    
    Fournit des services de :
    - Classification automatique des signalements
    - Analyse de sentiment
    - Modération de contenu
    - Traduction français-malgache
    - Vision par ordinateur (analyse d'images, doublons, qualité)
    - Géolocalisation intelligente (clusters, géocodage)
    - Chatbot citoyen
    - Prédiction et priorisation
    - Détection d'anomalies
    - Recommandations d'actions pour les élus
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(Exception, global_error_handler)

app.include_router(router)


@app.get("/")
async def racine():
    return {
        "service": "MITANEKO IA",
        "version": "1.0.0",
        "documentation": "/docs",
        "modules": "/api/ia/modules",
        "sante": "/api/ia/health",
    }


def demarrer():
    logger.info(
        "Démarrage de MITANEKO IA sur %s:%s",
        settings.host,
        settings.port,
    )
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    demarrer()
