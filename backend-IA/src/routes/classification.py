from fastapi import APIRouter, Depends, HTTPException
from src.services.nlp.classifier import classer_signalement
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import ClassificationResult

router = APIRouter(prefix="/classification", tags=["Classification"])


@router.post("/classer", response_model=ClassificationResult)
async def classer(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    description = request.get("description", "")
    if not description or len(description.strip()) < 3:
        raise HTTPException(status_code=400, detail="Description trop courte (min 3 caractères)")
    return classer_signalement(description)
