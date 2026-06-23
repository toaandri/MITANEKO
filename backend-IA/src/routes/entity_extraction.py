from fastapi import APIRouter, Depends, HTTPException
from src.services.nlp.entity_extractor import extraire_entites
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import EntityExtractionResult

router = APIRouter(prefix="/entites", tags=["Extraction d'entités"])


@router.post("/extraire", response_model=EntityExtractionResult)
async def extraire(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    texte = request.get("texte", "")
    if not texte or len(texte.strip()) < 3:
        raise HTTPException(status_code=400, detail="Texte trop court")
    return extraire_entites(texte)
