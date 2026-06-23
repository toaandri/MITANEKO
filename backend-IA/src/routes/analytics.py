from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from src.services.analytics.predictor import predire_delai_resolution
from src.services.analytics.prioritizer import calculer_score_priorite
from src.services.analytics.anomaly_detector import detecter_anomalies
from src.services.analytics.summary_generator import generer_resume_analytique
from src.middleware.auth import verifier_token, requerir_role
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import PredictionResult, PriorityScore, AnomalyResult, SummaryResult

router = APIRouter(prefix="/analytics", tags=["Analytiques IA"])


@router.post("/predire-delai", response_model=PredictionResult)
async def predire_delai(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    return predire_delai_resolution(
        categorie=request.get("categorie", "autre"),
        urgence=request.get("urgence", "moyenne"),
        nb_votes=request.get("nb_votes", 0),
        nb_signalements_voisinage=request.get("nb_signalements_voisinage", 0),
        mois=request.get("mois", 6),
        budget_commune=request.get("budget_commune", 0.5),
        taux_resolution_historique=request.get("taux_resolution_historique", 0.5),
    )


@router.post("/priorite", response_model=PriorityScore)
async def priorite(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    return calculer_score_priorite(
        categorie=request.get("categorie", "autre"),
        description=request.get("description", ""),
        nb_votes=request.get("nb_votes", 0),
        date_creation=request.get("date_creation"),
        urgence_detectee=request.get("urgence_detectee", "moyenne"),
        nb_signalements_voisinage=request.get("nb_signalements_voisinage", 0),
        sentiment_score=request.get("sentiment_score", 0.0),
        impact_communautaire=request.get("impact_communautaire", 0.5),
    )


@router.post("/anomalies", response_model=AnomalyResult)
async def anomalies(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(20, 60)),
):
    signalement = request.get("signalement", {})
    historique = request.get("historique_utilisateur", [])
    if not signalement:
        raise HTTPException(status_code=400, detail="Signalement requis")
    return detecter_anomalies(signalement, historique)


@router.post("/resume", response_model=SummaryResult)
async def resume_analytique(
    request: dict,
    _=Depends(requerir_role(["elu_commune", "admin_plateforme"])),
    __=Depends(rate_limit(10, 60)),
):
    signalements = request.get("signalements", [])
    commune = request.get("commune")
    quartier = request.get("quartier")
    if not signalements:
        raise HTTPException(status_code=400, detail="Liste de signalements requise")
    return generer_resume_analytique(signalements, commune, quartier)
