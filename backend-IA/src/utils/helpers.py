import re
import hashlib
import numpy as np
from typing import Any
from unidecode import unidecode


def nettoyer_texte(texte: str) -> str:
    texte = texte.lower().strip()
    texte = re.sub(r"[^\w\sàâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ]", " ", texte)
    texte = re.sub(r"\s+", " ", texte)
    return texte.strip()


def extraire_mots_cles(texte: str, nb_max: int = 10) -> list[str]:
    mots = nettoyer_texte(texte).split()
    stopwords = {
        "le", "la", "les", "de", "des", "du", "un", "une", "et", "est", "sont",
        "dans", "pour", "sur", "avec", "pas", "que", "qui", "nous", "vous",
        "ils", "elles", "ce", "cet", "cette", "ces", "mon", "ton", "son",
        "mais", "ou", "donc", "car", "ni", "or", "a", "au", "aux",
        "ny", "tsy", "dia", "izy", "ny", "amin", "ho", "an", "ao", "toy",
    }
    mots = [m for m in mots if m not in stopwords and len(m) > 2]
    return mots[:nb_max]


def text_to_hash(texte: str) -> str:
    return hashlib.md5(texte.encode("utf-8")).hexdigest()


def cosine_similarite(a: list[float], b: list[float]) -> float:
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def normaliser_score(score: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    return max(min_val, min(max_val, score))


def extraire_urgence(texte: str) -> str:
    indicateurs_fort = [
        "urgence", "immédiat", "dangereux", "accident", "blessé",
        "effondrement", "incendie", "inondation", "grave",
        "maika", "vonjeo", "loza",
    ]
    indicateurs_moyen = [
        "important", "rapidement", "bientôt", "critique", "casse",
        "coupure", "panne", "zava-dehibe",
    ]
    texte_lower = texte.lower()
    for mot in indicateurs_fort:
        if mot in texte_lower:
            return "haute"
    for mot in indicateurs_moyen:
        if mot in texte_lower:
            return "moyenne"
    return "basse"
