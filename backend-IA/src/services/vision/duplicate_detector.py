import io
import hashlib
from typing import Optional
import numpy as np
from PIL import Image


def _hash_image(contenu: bytes, methode: str = "perceptual") -> str:
    try:
        image = Image.open(io.BytesIO(contenu))
        image = image.convert("RGB").resize((32, 32), Image.LANCZOS)
    except Exception:
        return ""

    if methode == "md5":
        return hashlib.md5(contenu).hexdigest()

    pixels = np.array(image, dtype=np.float32)

    if methode == "average":
        gris = np.mean(pixels, axis=2)
        moyenne = np.mean(gris)
        return "".join(["1" if p > moyenne else "0" for row in gris for p in row])

    if methode == "dhash":
        gris = np.mean(pixels, axis=2)
        diff = gris[:, 1:] > gris[:, :-1]
        return "".join(["1" if d else "0" for row in diff for d in row])

    if methode == "perceptual":
        petits_pixels = np.array(
            Image.open(io.BytesIO(contenu)).convert("RGB").resize((8, 8), Image.LANCZOS),
            dtype=np.float32,
        )
        gris = np.mean(petits_pixels, axis=2)
        moyenne = np.mean(gris)
        return "".join(["1" if p > moyenne else "0" for row in gris for p in row])

    return ""


def _distance_hamming(hash1: str, hash2: str) -> float:
    if not hash1 or not hash2 or len(hash1) != len(hash2):
        return 1.0
    differences = sum(1 for a, b in zip(hash1, hash2) if a != b)
    return differences / len(hash1)


def calculer_similarite(contenu_a: bytes, contenu_b: bytes) -> dict:
    hash_perceptual_a = _hash_image(contenu_a, "perceptual")
    hash_perceptual_b = _hash_image(contenu_b, "perceptual")
    hash_md5_a = _hash_image(contenu_a, "md5")
    hash_md5_b = _hash_image(contenu_b, "md5")

    dist_perceptual = _distance_hamming(hash_perceptual_a, hash_perceptual_b)
    dist_md5 = _distance_hamming(hash_md5_a, hash_md5_b)

    similarite_md5 = 1.0 if dist_md5 == 0 else 0.0
    similarite_perceptual = 1.0 - dist_perceptual

    similarite_ponderee = (similarite_md5 * 0.4) + (similarite_perceptual * 0.6)
    similarite_ponderee = round(max(0.0, min(1.0, similarite_ponderee)), 4)

    return {
        "est_doublon": similarite_ponderee > 0.85,
        "similarite": similarite_ponderee,
        "similarite_md5": round(similarite_md5, 4),
        "similarite_perceptuelle": round(similarite_perceptual, 4),
    }


def generer_empreinte(contenu: bytes) -> dict:
    return {
        "md5": _hash_image(contenu, "md5"),
        "perceptual": _hash_image(contenu, "perceptual"),
        "dhash": _hash_image(contenu, "dhash"),
        "average": _hash_image(contenu, "average"),
    }
