from fastapi import APIRouter, Depends, HTTPException
from src.services.nlp.translator import traduire
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import TranslationResult

router = APIRouter(prefix="/traduction", tags=["Traduction"])


@router.post("/traduire", response_model=TranslationResult)
async def traduire_route(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(20, 60)),
):
    texte = request.get("texte", "")
    cible = request.get("cible", "fr")
    if not texte:
        raise HTTPException(status_code=400, detail="Texte requis")
    if cible not in ("fr", "mg", "en"):
        raise HTTPException(status_code=400, detail="Langue cible non supportée (fr, mg, en)")
    return traduire(texte, cible)
