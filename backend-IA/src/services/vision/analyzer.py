import io
from typing import Optional
import numpy as np
from PIL import Image

from src.config.settings import settings

try:
    import cv2
    CV2_DISPONIBLE = True
except ImportError:
    CV2_DISPONIBLE = False


def analyser_image(contenu: bytes, filename: str = "") -> dict:
    try:
        image = Image.open(io.BytesIO(contenu))
    except Exception as e:
        return {
            "categorie_probable": None,
            "confiance": 0.0,
            "contient_visage": False,
            "contient_vehicule": False,
            "contient_dechet": False,
            "contient_infrastructure": False,
            "qualite_image": {
                "erreur": str(e),
                "valide": False,
            },
            "tags": ["erreur_lecture"],
        }

    w, h = image.size
    ratio = w / h if h > 0 else 1
    if image.mode != "RGB":
        image = image.convert("RGB")

    if CV2_DISPONIBLE:
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    else:
        cv_image = None

    tags = []
    score_infra = 0.0
    score_dechet = 0.0
    score_vehicule = 0.0
    score_visage = 0.0

    if CV2_DISPONIBLE:
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        if len(faces) > 0:
            score_visage = min(1.0, len(faces) * 0.3)
            tags.append("visage")

        edges = cv2.Canny(gray, 50, 150)
        ratio_contours = np.count_nonzero(edges) / edges.size
        if ratio_contours > 0.08:
            tags.append("infrastructure_bâtie")
            score_infra = min(1.0, ratio_contours * 5)

        hsv = cv2.cvtColor(cv_image, cv2.COLOR_BGR2HSV)
        masque_vert = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
        ratio_vert = np.count_nonzero(masque_vert) / masque_vert.size
        if ratio_vert > 0.2:
            tags.append("espace_vert")
        masque_marron = cv2.inRange(hsv, (10, 50, 50), (30, 255, 200))
        ratio_marron = np.count_nonzero(masque_marron) / masque_marron.size
        if ratio_marron > 0.15:
            tags.append("sol_terre_dechet")
            score_dechet = min(1.0, ratio_marron * 3)

        masque_noir = cv2.inRange(hsv, (0, 0, 0), (180, 255, 40))
        ratio_noir = np.count_nonzero(masque_noir) / masque_noir.size
        if ratio_noir > 0.2:
            tags.append("zone_obscure")
    else:
        pixels = np.array(image)
        mean_color = pixels.mean(axis=(0, 1))
        var_color = pixels.std(axis=(0, 1)).mean()
        if var_color < 30:
            tags.append("image_faible_contraste")
        if mean_color[1] > mean_color[0] * 1.2 and mean_color[1] > mean_color[2] * 1.2:
            tags.append("espace_vert")
            score_infra = 0.3
        if mean_color.mean() < 50:
            tags.append("zone_obscure")

    qualite = verifier_qualite_image(image)

    if "infrastructure_bâtie" in tags or score_infra > 0.3:
        categorie = None
        if "espace_vert" not in tags:
            if "zone_obscure" in tags:
                categorie = "eclairage_public"
            else:
                categorie = "voirie_trottoirs"
    elif score_dechet > 0.3:
        categorie = "dechets_proprete"
    elif score_visage > 0.3:
        categorie = "securite"
    else:
        categorie = None

    confiance = max(score_infra, score_dechet, score_visage, score_vehicule)
    confiance = round(min(1.0, confiance * 1.5), 4)

    categorie_probable = categorie if confiance > 0.3 else None

    return {
        "categorie_probable": categorie_probable,
        "confiance": confiance,
        "contient_visage": score_visage > 0.3,
        "contient_vehicule": score_vehicule > 0.3,
        "contient_dechet": score_dechet > 0.3,
        "contient_infrastructure": score_infra > 0.3,
        "qualite_image": qualite,
        "tags": tags,
    }


def verifier_qualite_image(image: Image.Image) -> dict:
    w, h = image.size
    resolution = (w, h)
    megapixels = (w * h) / 1_000_000

    if w < 200 or h < 200:
        niveau = "tres_faible"
        utilisable = False
    elif megapixels < 0.3:
        niveau = "faible"
        utilisable = True
    elif megapixels < 1:
        niveau = "moyen"
        utilisable = True
    elif megapixels < 5:
        niveau = "bon"
        utilisable = True
    else:
        niveau = "excellent"
        utilisable = True

    ratio = w / h if h > 0 else 1
    if ratio < 0.3 or ratio > 3.5:
        format_avert = "format_extreme"
    else:
        format_avert = "normal"

    try:
        import io
        buf = io.BytesIO()
        image.save(buf, "JPEG", quality=85)
        taille_ko = buf.tell() / 1024
    except Exception:
        taille_ko = 0

    return {
        "resolution": f"{w}x{h}",
        "megapixels": round(megapixels, 2),
        "niveau": niveau,
        "utilisable": utilisable,
        "format": format_avert,
        "taille_ko": round(taille_ko, 1),
    }
