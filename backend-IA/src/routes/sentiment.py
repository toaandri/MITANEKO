from fastapi import APIRouter, Depends, HTTPException
from src.services.nlp.sentiment import analyser_sentiment
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import SentimentResult

router = APIRouter(prefix="/sentiment", tags=["Sentiment"])


@router.post("/analyser", response_model=SentimentResult)
async def analyser(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    texte = request.get("texte", "")
    if not texte or len(texte.strip()) < 3:
        raise HTTPException(status_code=400, detail="Texte trop court (min 3 caractères)")
    return analyser_sentiment(texte)
