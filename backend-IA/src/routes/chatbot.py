from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from src.services.chat.chatbot import chatter
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import ChatbotRequest, ChatbotResponse

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/message", response_model=ChatbotResponse)
async def message(
    request: ChatbotRequest,
    _=Depends(rate_limit(20, 60)),
):
    if not request.message or len(request.message.strip()) < 1:
        raise HTTPException(status_code=400, detail="Message requis")

    resultat = chatter(
        message=request.message,
        user_id=request.user_id,
        commune_id=request.commune_id,
        historique=request.historique or [],
    )

    return resultat
