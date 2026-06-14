import math
from datetime import datetime, timezone
from collections import Counter
from typing import Any, Optional


def detecter_anomalies(signalement: dict, historique_utilisateur: list[dict]) -> dict:
    anomalies: list[str] = []
    score_anomalie = 0.0
    explications: list[str] = []

    nb_signalements = len(historique_utilisateur)
    if nb_signalements > 20:
        anomalies.append("creation_massive")
        score_anomalie += 0.3
        explications.append(
            f"L'utilisateur a créé {nb_signalements} signalements, ce qui est inhabituel."
        )

    if nb_signalements >= 3:
        dates = []
        for s in historique_utilisateur[-10:]:
            date_str = s.get("date_creation") or s.get("created_at", "")
            try:
                d = datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
                dates.append(d)
            except Exception:
                continue

        if len(dates) >= 3:
            intervals = [(dates[i] - dates[i + 1]).total_seconds() / 3600
                         for i in range(len(dates) - 1)]
            if intervals and min(intervals) < 0.5:
                anomalies.append("rafale_signalements")
                score_anomalie += 0.25
                explications.append(
                    "Plusieurs signalements créés en moins de 30 minutes."
                )

    description = (signalement.get("description") or "").lower()
    mots = description.split()
    if len(mots) < 3:
        anomalies.append("description_trop_courte")
        score_anomalie += 0.1
        explications.append("La description est trop courte pour un signalement valide.")

    if nb_signalements > 0:
        categories_utilisateur = [
            s.get("categorie", "autre") for s in historique_utilisateur
        ]
        if categories_utilisateur:
            cat_freq = Counter(categories_utilisateur)
            cat_actuelle = signalement.get("categorie", "autre")
            if cat_freq.get(cat_actuelle, 0) > nb_signalements * 0.7:
                anomalies.append("categorie_repetitive")
                score_anomalie += 0.1

    categories_texte = ["urgent", "immédiat", "dangereux", "vite", "maintenant"]
    nb_urgences = sum(1 for mot in categories_texte if mot in mots)
    if nb_urgences >= 3 and nb_signalements > 5:
        anomalies.append("cri_urgence_repetitif")
        score_anomalie += 0.15
        explications.append(
            "L'utilisateur utilise un langage d'urgence de façon répétée."
        )

    localisation = signalement.get("localisation") or signalement.get("coordonnees", {})
    if isinstance(localisation, dict) and (localisation.get("lat") == 0 or localisation.get("lng") == 0):
        anomalies.append("localisation_origine")
        score_anomalie += 0.2
        explications.append(
            "La localisation indique le point d'origine (0,0), probablement non renseignée."
        )

    score_anomalie = min(1.0, score_anomalie)
    est_anormal = score_anomalie > 0.3

    types_anomalies = list(set(anomalies))

    if est_anormal:
        if score_anomalie > 0.7:
            recommandation = "Bloquer temporairement l'utilisateur et vérifier manuellement."
        elif score_anomalie > 0.4:
            recommandation = "Marquer pour révision humaine avant publication."
        else:
            recommandation = "Surveiller le comportement de l'utilisateur."
    else:
        recommandation = "Aucune action requise."

    return {
        "est_anormal": est_anormal,
        "score_anomalie": round(score_anomalie, 4),
        "type_anomalie": types_anomalies[0] if types_anomalies else None,
        "anomalies_detectees": types_anomalies,
        "explication": " ".join(explications) if explications else "Aucune anomalie détectée.",
        "recommandation": recommandation,
    }
