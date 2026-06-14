import math
from datetime import datetime, timezone, timedelta
from typing import Any, Optional


def calculer_score_priorite(
    categorie: str,
    description: str = "",
    nb_votes: int = 0,
    date_creation: Optional[str] = None,
    urgence_detectee: str = "moyenne",
    nb_signalements_voisinage: int = 0,
    sentiment_score: float = 0.0,
    impact_communautaire: float = 0.5,
) -> dict:
    score_popularite = min(1.0, nb_votes / 50)

    map_gravite = {
        "voirie_trottoirs": 0.6,
        "eclairage_public": 0.5,
        "dechets_proprete": 0.7,
        "eau_assainissement": 0.8,
        "espaces_verts": 0.3,
        "securite": 0.9,
        "transport": 0.6,
        "bruit": 0.4,
        "batiments_publics": 0.5,
        "autre": 0.4,
    }
    score_gravite = map_gravite.get(categorie, 0.5)

    if date_creation:
        try:
            created = datetime.fromisoformat(date_creation.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            heures_ecoulees = (now - created).total_seconds() / 3600
            score_recence = min(1.0, heures_ecoulees / 720)
        except Exception:
            score_recence = 0.5
    else:
        score_recence = 0.5

    map_urgence = {"haute": 1.0, "moyenne": 0.6, "basse": 0.3}
    score_urgence = map_urgence.get(urgence_detectee, 0.5)

    score_voisinage = min(1.0, nb_signalements_voisinage / 20)

    score_impact = impact_communautaire

    score_global = (
        score_popularite * 0.15
        + score_gravite * 0.20
        + score_recence * 0.10
        + score_urgence * 0.20
        + score_voisinage * 0.15
        + score_impact * 0.10
        + max(0, sentiment_score) * 0.10
    )

    score_global = max(0.0, min(1.0, score_global))

    if score_global >= 0.8:
        urgence_texte = "critique"
    elif score_global >= 0.6:
        urgence_texte = "haute"
    elif score_global >= 0.4:
        urgence_texte = "moyenne"
    elif score_global >= 0.2:
        urgence_texte = "basse"
    else:
        urgence_texte = "tres_basse"

    facteurs = {
        "popularite": round(score_popularite, 4),
        "gravite_categorie": round(score_gravite, 4),
        "recence": round(score_recence, 4),
        "urgence_texte": round(score_urgence, 4),
        "concentration_voisinage": round(score_voisinage, 4),
        "impact_communautaire": round(score_impact, 4),
    }

    return {
        "score_global": round(score_global, 4),
        "urgence_texte": urgence_texte,
        "score_popularite": round(score_popularite, 4),
        "score_gravite": round(score_gravite, 4),
        "score_recence": round(score_recence, 4),
        "score_impact_communautaire": round(score_impact, 4),
        "facteurs": facteurs,
    }
