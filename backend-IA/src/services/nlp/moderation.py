import re
from typing import Optional

from src.utils.helpers import nettoyer_texte

CATEGORIES_TOXIQUES = {
    "insulte": [
        r"\b(connard|enculé|fils de pute|salope|bâtard|abruti|débile|crétin|idiot|imbécile|pd|tapette)\b",
        r"\b(adala|adala|bebahady|kisosa)\b",
    ],
    "menace": [
        r"\b(je vais te tuer|je vais te casser|mort|menace|attention à toi|tu vas voir|règlement de comptes)\b",
        r"\b(hamono anao|hofako|hianao)\b",
    ],
    "discrimination": [
        r"\b(raciste|négro|bougnoule|sale noir|sale arabe|sale blanc|ethnie|tribu)\b",
        r"\b(foko|karazana|firazanana)\b",
    ],
    "spam": [
        r"\b(achetez|cliquez|gagnez|profit|promotion|réduction|-? ?\d+%|http[s]?://|www\.)\b",
    ],
    "harcelement": [
        r"\b(tais toi|ferme ta gueule|dégage|casse toi|fous moi la paix)\b",
        r"\b(mangina|mandehana)\b",
    ],
}

SEUIL_SPAM_LONGUEUR = 0.3
SEUIL_MAJUSCULES = 0.5


def _verifier_majuscules_excessives(texte: str) -> float:
    if len(texte) < 20:
        return 0.0
    lettres = [c for c in texte if c.isalpha()]
    if not lettres:
        return 0.0
    majuscules = sum(1 for c in lettres if c.isupper())
    ratio = majuscules / len(lettres)
    return ratio


def _verifier_repetitions(texte: str) -> float:
    pattern = r"(.)\1{4,}"
    matches = re.findall(pattern, texte)
    if matches:
        return min(1.0, len(matches) * 0.2)
    return 0.0


def moderer_commentaire(texte: str, auteur_id: Optional[str] = None) -> dict:
    texte_lower = texte.lower()
    scores: dict[str, float] = {}
    categories_risque: list[str] = []

    for categorie, motifs in CATEGORIES_TOXIQUES.items():
        score_cat = 0.0
        for motif in motifs:
            matches = re.findall(motif, texte_lower)
            if matches:
                score_cat = min(1.0, score_cat + len(matches) * 0.25)
        scores[categorie] = round(score_cat, 4)
        if score_cat > 0.3:
            categories_risque.append(categorie)

    ratio_maj = _verifier_majuscules_excessives(texte)
    if ratio_maj > SEUIL_MAJUSCULES:
        scores["majuscules_excessives"] = round(ratio_maj, 4)
        categories_risque.append("cri_agressif")

    score_repetitions = _verifier_repetitions(texte)
    if score_repetitions > 0.3:
        scores["repetitions"] = round(score_repetitions, 4)
        categories_risque.append("spam_repetitif")

    note_toxicite = sum(scores.values()) / max(len(scores), 1)
    note_toxicite = round(min(1.0, note_toxicite), 4)

    est_sain = note_toxicite < 0.3 and len(categories_risque) == 0

    if est_sain:
        action = "publier"
    elif note_toxicite < 0.6:
        action = "revision_humaine"
    else:
        action = "bloquer"

    return {
        "est_sain": est_sain,
        "categories_risque": categories_risque,
        "scores": scores,
        "action_recommandee": action,
    }
