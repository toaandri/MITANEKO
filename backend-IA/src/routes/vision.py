from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from src.services.vision.analyzer import analyser_image
from src.services.vision.duplicate_detector import calculer_similarite, generer_empreinte
from src.services.vision.quality_checker import verifier_qualite
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import VisionAnalysisResult, DuplicateCheckResult

router = APIRouter(prefix="/vision", tags=["Vision par ordinateur"])


@router.post("/analyser", response_model=VisionAnalysisResult)
async def analyser_image_route(
    fichier: UploadFile = File(...),
    _=Depends(verifier_token),
    __=Depends(rate_limit(10, 60)),
):
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    if fichier.content_type and not fichier.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    return analyser_image(contenu, fichier.filename or "")


@router.post("/comparer", response_model=DuplicateCheckResult)
async def comparer_images(
    image_a: UploadFile = File(...),
    image_b: UploadFile = File(...),
    _=Depends(verifier_token),
    __=Depends(rate_limit(10, 60)),
):
    contenu_a = await image_a.read()
    contenu_b = await image_b.read()

    if len(contenu_a) > 10 * 1024 * 1024 or len(contenu_b) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Images trop volumineuses (max 10 Mo)")

    resultat = calculer_similarite(contenu_a, contenu_b)
    return {
        "est_doublon": resultat["est_doublon"],
        "signalement_similaire_id": None,
        "similarite": resultat["similarite"],
        "raison": "Images similaires détectées" if resultat["est_doublon"] else None,
    }


@router.post("/empreinte")
async def empreinte_image(
    fichier: UploadFile = File(...),
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse")
    return generer_empreinte(contenu)


@router.post("/qualite")
async def qualite_image(
    fichier: UploadFile = File(...),
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    contenu = await fichier.read()
    if len(contenu) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse")
    return verifier_qualite(contenu)
