import re
from typing import Optional
from textblob import TextBlob

from src.utils.helpers import nettoyer_texte

LEXIQUE_SENTIMENT_FR: dict[str, float] = {
    "excellent": 1.0, "super": 0.9, "génial": 0.9, "parfait": 0.9,
    "très bien": 0.8, "bien": 0.6, "content": 0.6, "satisfait": 0.6,
    "merci": 0.7, "bravo": 0.8, "amélioration": 0.4, "progrès": 0.5,
    "correct": 0.1, "acceptable": 0.1, "passable": -0.1,
    "mauvais": -0.6, "très mauvais": -0.8, "horrible": -0.9,
    "dégoutant": -0.8, "inacceptable": -0.7, "catastrophique": -0.9,
    "dangereux": -0.7, "urgent": -0.4, "problème": -0.4,
    "fatigué": -0.3, "énervé": -0.5, "en colère": -0.7,
    "déçu": -0.5, "insatisfait": -0.6, "lamentable": -0.8,
    "aucun changement": -0.3, "rien ne change": -0.4,
    "tsara": 0.7, "mahafinaritra": 0.8, "sambatra": 0.7,
    "ratsy": -0.6, "mampidi-doza": -0.7, "maharikoriko": -0.7,
    "malahelo": -0.4, "tezitra": -0.6,
}

NUANCES = [
    (0.8, 1.01, "très positif", "😊"),
    (0.3, 0.8, "positif", "🙂"),
    (-0.3, 0.3, "neutre", "😐"),
    (-0.8, -0.3, "négatif", "😟"),
    (-1.0, -0.8, "très négatif", "😡"),
]


def _analyser_lexique(texte: str) -> float:
    score = 0.0
    mots_trouves = 0
    texte_lower = texte.lower()

    for mot, valeur in LEXIQUE_SENTIMENT_FR.items():
        if mot in texte_lower:
            score += valeur
            mots_trouves += 1

    if mots_trouves > 0:
        return score / mots_trouves
    return 0.0


def analyser_sentiment(texte: str, langue: str = "auto") -> dict:
    texte_propre = nettoyer_texte(texte)

    score_lexique = _analyser_lexique(texte_propre)

    try:
        blob = TextBlob(texte_propre)
        score_textblob = blob.sentiment.polarity
    except Exception:
        score_textblob = 0.0

    score_final = (score_lexique * 0.6) + (score_textblob * 0.4)
    score_final = max(-1.0, min(1.0, score_final))

    label = "neutre"
    emoji = "😐"
    for seuil_bas, seuil_haut, lbl, emj in NUANCES:
        if seuil_bas <= score_final < seuil_haut:
            label = lbl
            emoji = emj
            break

    composants = {
        "score_lexique": round(score_lexique, 4),
        "score_textblob": round(score_textblob, 4),
    }

    if score_final < -0.5:
        nuance = "mécontentement / urgence"
    elif score_final < -0.2:
        nuance = "préoccupation / insatisfaction"
    elif score_final < 0.2:
        nuance = "neutre / factuel"
    elif score_final < 0.5:
        nuance = "satisfaction légère"
    else:
        nuance = "satisfaction élevée / gratitude"

    return {
        "score": round(score_final, 4),
        "label": label,
        "nuance": nuance,
        "emoji": emoji,
        "scores_composants": composants,
    }
