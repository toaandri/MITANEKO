from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from src.services.geo.geocoder import geocoder_texte
from src.services.geo.cluster_detector import detecter_clusters, estimer_zone_impact
from src.middleware.auth import verifier_token
from src.middleware.rate_limiter import rate_limit
from src.models.schemas import ClusterResult

router = APIRouter(prefix="/geo", tags=["Géolocalisation intelligente"])


@router.post("/geocoder")
async def geocoder(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(30, 60)),
):
    texte = request.get("texte", "")
    if not texte or len(texte.strip()) < 3:
        raise HTTPException(status_code=400, detail="Texte trop court")
    return geocoder_texte(texte)


@router.post("/clusters")
async def clusters(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(10, 60)),
):
    signalements = request.get("signalements", [])
    rayon = request.get("rayon_metres", 200)
    min_points = request.get("min_points", 2)

    if not signalements:
        raise HTTPException(status_code=400, detail="Liste de signalements requise")

    return detecter_clusters(signalements, rayon, min_points)


@router.post("/zones-impact")
async def zones_impact(
    request: dict,
    _=Depends(verifier_token),
    __=Depends(rate_limit(10, 60)),
):
    signalements = request.get("signalements", [])
    if not signalements:
        raise HTTPException(status_code=400, detail="Liste de signalements requise")

    clusters = detecter_clusters(signalements)
    return estimer_zone_impact(clusters)
