import math
from typing import Any, Optional
import numpy as np

from src.utils.helpers import normaliser_score

TEMPS_MOYEN_PAR_CATEGORIE: dict[str, float] = {
    "voirie_trottoirs": 168.0,
    "eclairage_public": 72.0,
    "dechets_proprete": 48.0,
    "eau_assainissement": 120.0,
    "espaces_verts": 96.0,
    "securite": 24.0,
    "transport": 168.0,
    "bruit": 48.0,
    "batiments_publics": 240.0,
    "autre": 120.0,
}

POIDS_FACTEURS = {
    "categorie": 0.25,
    "urgence": 0.20,
    "nb_votes": 0.10,
    "nb_signalements_voisinage": 0.15,
    "saison": 0.10,
    "budget_commune": 0.10,
    "historique_resolution": 0.10,
}


def predire_delai_resolution(
    categorie: str,
    urgence: str = "moyenne",
    nb_votes: int = 0,
    nb_signalements_voisinage: int = 0,
    mois: int = 6,
    budget_commune: float = 0.5,
    taux_resolution_historique: float = 0.5,
) -> dict:
    delai_base = TEMPS_MOYEN_PAR_CATEGORIE.get(categorie, 120.0)

    map_urgence = {"haute": 0.7, "moyenne": 1.0, "basse": 1.3}
    facteur_urgence = map_urgence.get(urgence, 1.0)

    facteur_votes = max(0.8, 1.0 - (min(nb_votes, 100) * 0.002))

    facteur_voisinage = max(0.7, 1.0 - (min(nb_signalements_voisinage, 50) * 0.008))

    saisons_pluie = [1, 2, 11, 12]
    facteur_saison = 1.3 if mois in saisons_pluie else 1.0

    facteur_budget = max(0.5, 2.0 - budget_commune * 2)

    facteur_historique = max(0.5, 2.0 - taux_resolution_historique * 2)

    delai_estime = (
        delai_base
        * facteur_urgence
        * facteur_votes
        * facteur_voisinage
        * facteur_saison
        * facteur_budget
        * facteur_historique
    )

    fourchette_basse = delai_estime * 0.7
    fourchette_haute = delai_estime * 1.5

    confiance = 0.6
    if urgence != "basse":
        confiance += 0.1
    if nb_signalements_voisinage > 0:
        confiance += 0.1
    confiance = min(0.95, confiance + taux_resolution_historique * 0.1)

    facteurs_influents = [
        {"facteur": "categorie", "impact": round((delai_base / 168.0) - 1, 4), "poids": POIDS_FACTEURS["categorie"]},
        {"facteur": "urgence", "impact": round(facteur_urgence - 1, 4), "poids": POIDS_FACTEURS["urgence"]},
        {"facteur": "saison", "impact": round(facteur_saison - 1, 4), "poids": POIDS_FACTEURS["saison"]},
    ]
    if nb_votes > 0:
        facteurs_influents.append({
            "facteur": "popularité",
            "impact": round(facteur_votes - 1, 4),
            "poids": POIDS_FACTEURS["nb_votes"],
        })

    return {
        "delai_resolution_heures": round(delai_estime, 1),
        "delai_resolution_jours": round(delai_estime / 24, 1),
        "confiance": round(confiance, 4),
        "facteurs_influents": facteurs_influents,
        "fourchette_basse": round(fourchette_basse, 1),
        "fourchette_haute": round(fourchette_haute, 1),
    }
