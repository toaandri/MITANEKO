from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from src.services.recommender.action_recommender import recommander_actions
from src.middleware.auth import verifier_token, requerir_role
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import ActionRecommendation

router = APIRouter(prefix="/recommandations", tags=["Recommandations d'actions"])


@router.post("/actions")
async def recommander_actions_route(
    request: dict,
    _=Depends(requerir_role(["elu_commune", "acteur_communal", "admin_plateforme"])),
    __=Depends(rate_limit(10, 60)),
):
    signalements = request.get("signalements", [])
    budget = request.get("budget_disponible")
    commune = request.get("commune")
    priorites = request.get("priorites_elu")

    if not signalements:
        raise HTTPException(status_code=400, detail="Liste de signalements requise")

    return recommander_actions(
        signalements=signalements,
        budget_disponible=budget,
        commune=commune,
        priorites_elu=priorites,
    )
