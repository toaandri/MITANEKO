import io
import numpy as np
from PIL import Image


def verifier_qualite(contenu: bytes) -> dict:
    try:
        image = Image.open(io.BytesIO(contenu))
    except Exception as e:
        return {
            "valide": False,
            "erreur": str(e),
            "score_qualite": 0.0,
        }

    w, h = image.size

    if image.mode != "RGB":
        image = image.convert("RGB")

    pixels = np.array(image, dtype=np.float32)

    score_luminosite = _verifier_luminosite(pixels)
    score_nettete = _verifier_nettete(pixels)
    score_contraste = _verifier_contraste(pixels)
    score_exposition = _verifier_exposition(pixels)
    score_resolution = _verifier_resolution(w, h)

    score_global = (
        score_luminosite * 0.20
        + score_nettete * 0.25
        + score_contraste * 0.15
        + score_exposition * 0.15
        + score_resolution * 0.25
    )
    score_global = round(max(0.0, min(1.0, score_global)), 4)

    if score_global < 0.3:
        niveau = "inutilisable"
        recommandation = "Photo trop floue ou trop sombre. Veuillez reprendre une photo de jour avec un bon éclairage."
    elif score_global < 0.5:
        niveau = "mediocre"
        recommandation = "Qualité insuffisante. Essayez de stabiliser l'appareil et d'éclairer la scène."
    elif score_global < 0.7:
        niveau = "acceptable"
        recommandation = "Qualité acceptable pour analyse."
    elif score_global < 0.9:
        niveau = "bonne"
        recommandation = "Bonne qualité d'image."
    else:
        niveau = "excellente"
        recommandation = "Image parfaite pour l'analyse."

    return {
        "valide": True,
        "score_qualite": score_global,
        "niveau": niveau,
        "recommandation": recommandation if score_global < 0.7 else None,
        "details": {
            "luminosite": round(score_luminosite, 4),
            "nettete": round(score_nettete, 4),
            "contraste": round(score_contraste, 4),
            "exposition": round(score_exposition, 4),
            "resolution": round(score_resolution, 4),
        },
        "dimensions": f"{w}x{h}",
    }


def _verifier_luminosite(pixels: np.ndarray) -> float:
    luminosite = np.mean(pixels)
    if luminosite < 30:
        return 0.1
    if luminosite < 60:
        return 0.3
    if luminosite < 100:
        return 0.6
    if luminosite < 200:
        return 1.0
    if luminosite < 230:
        return 0.8
    return 0.4


def _verifier_nettete(pixels: np.ndarray) -> float:
    gris = np.mean(pixels, axis=2)
    if gris.shape[0] < 2 or gris.shape[1] < 2:
        return 0.5
    gradient_x = np.abs(np.diff(gris, axis=1))
    gradient_y = np.abs(np.diff(gris, axis=0))
    nettete = (np.mean(gradient_x) + np.mean(gradient_y)) / 2
    if nettete < 2:
        return 0.1
    if nettete < 5:
        return 0.3
    if nettete < 10:
        return 0.6
    if nettete < 30:
        return 0.85
    return 1.0


def _verifier_contraste(pixels: np.ndarray) -> float:
    gris = np.mean(pixels, axis=2)
    ecart_type = np.std(gris)
    if ecart_type < 10:
        return 0.1
    if ecart_type < 30:
        return 0.3
    if ecart_type < 60:
        return 0.7
    if ecart_type < 100:
        return 1.0
    return 0.8


def _verifier_exposition(pixels: np.ndarray) -> float:
    pourcentage_sombre = np.mean(pixels < 30) * 100
    pourcentage_clair = np.mean(pixels > 225) * 100
    if pourcentage_sombre > 40 or pourcentage_clair > 30:
        return 0.2
    if pourcentage_sombre > 20 or pourcentage_clair > 15:
        return 0.5
    return 1.0


def _verifier_resolution(w: int, h: int) -> float:
    megapixels = (w * h) / 1_000_000
    if megapixels < 0.1:
        return 0.0
    if megapixels < 0.3:
        return 0.3
    if megapixels < 1:
        return 0.6
    if megapixels < 3:
        return 0.85
    return 1.0
