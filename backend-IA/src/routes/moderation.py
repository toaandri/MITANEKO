from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from src.services.nlp.moderation import moderer_commentaire
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import ModerationResult

router = APIRouter(prefix="/moderation", tags=["Modération"])


@router.post("/verifier", response_model=ModerationResult)
async def verifier(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    texte = request.get("texte", "")
    auteur_id = request.get("auteur_id")
    if not texte or len(texte.strip()) < 2:
        raise HTTPException(status_code=400, detail="Texte trop court")
    return moderer_commentaire(texte, auteur_id)
