from datetime import datetime, timedelta
from typing import Any, Optional
from collections import Counter


LABELS_CATEGORIES: dict[str, str] = {
    "voirie_trottoirs": "voirie et trottoirs",
    "eclairage_public": "éclairage public",
    "dechets_proprete": "déchets et propreté",
    "eau_assainissement": "eau et assainissement",
    "espaces_verts": "espaces verts",
    "securite": "sécurité",
    "transport": "transport",
    "bruit": "nuisances sonores",
    "batiments_publics": "bâtiments publics",
    "autre": "autres",
}


def generer_resume_analytique(
    signalements: list[dict],
    commune: Optional[str] = None,
    quartier: Optional[str] = None,
) -> dict:
    nb_total = len(signalements)

    if nb_total == 0:
        return {
            "resume": f"Aucun signalement enregistré pour {commune or quartier or 'cette zone'}.",
            "points_cles": [],
            "tendances": [],
            "recommandations": ["Compléter les données pour obtenir des analyses."],
        }

    categories = [s.get("categorie", "autre") for s in signalements]
    cat_counter = Counter(categories)
    top_categories = cat_counter.most_common(3)

    statuts = [s.get("statut", "ouvert") for s in signalements]
    statut_counter = Counter(statuts)
    taux_resolution = statut_counter.get("resolu", 0) / nb_total * 100
    taux_ouvert = statut_counter.get("ouvert", 0) / nb_total * 100

    urgence_counts: dict[str, int] = {}
    for s in signalements:
        u = s.get("urgence", s.get("urgence_detectee", "non_spécifié"))
        urgence_counts[u] = urgence_counts.get(u, 0) + 1

    total_votes = sum(s.get("nb_votes", 0) for s in signalements)
    moyenne_votes = total_votes / nb_total if nb_total > 0 else 0

    top_signalements = sorted(
        signalements,
        key=lambda s: (s.get("nb_votes", 0), s.get("score_priorite", 0)),
        reverse=True,
    )[:3]

    zone = f"{commune}, {quartier}" if commune and quartier else (commune or quartier or "la zone")
    aujourd_hui = datetime.now()

    phrases_resume = [
        f"Analyse des signalements pour {zone} au {aujourd_hui.strftime('%d/%m/%Y')}.",
    ]

    if top_categories:
        top_label = LABELS_CATEGORIES.get(top_categories[0][0], top_categories[0][0])
        pct = round(top_categories[0][1] / nb_total * 100, 1)
        phrases_resume.append(
            f"La catégorie prédominante est « {top_label} » avec {pct}% des {nb_total} signalements."
        )

    phrases_resume.append(
        f"Taux de résolution : {taux_resolution:.0f}% ({statut_counter.get('resolu', 0)} résolus), "
        f"{taux_ouvert:.0f}% encore ouverts ({statut_counter.get('ouvert', 0)} en attente)."
    )

    urgences_hautes = urgence_counts.get("haute", 0)
    if urgences_hautes > nb_total * 0.3:
        phrases_resume.append(
            f"⚠️ {urgences_hautes} signalements urgents ({round(urgences_hautes / nb_total * 100)}%) "
            f"nécessitent une attention immédiate."
        )

    if moyenne_votes > 1:
        phrases_resume.append(
            f"Engagement citoyen : moyenne de {moyenne_votes:.1f} votes par signalement, "
            f"soit {total_votes} votes au total."
        )

    resume = " ".join(phrases_resume)

    points_cles = [
        f"{nb_total} signalements au total",
        f"Catégorie principale : {LABELS_CATEGORIES.get(top_categories[0][0], top_categories[0][0]) if top_categories else 'N/A'} ({top_categories[0][1]} signalements)" if top_categories else None,
        f"{taux_resolution:.0f}% de résolution",
        f"{statut_counter.get('ouvert', 0)} signalements encore ouverts",
        f"{urgences_hautes} signalements urgents" if urgences_hautes > 0 else None,
        f"{total_votes} votes citoyens exprimés",
    ]
    points_cles = [p for p in points_cles if p]

    tendances = []
    if top_categories:
        for cat, count in top_categories:
            label = LABELS_CATEGORIES.get(cat, cat)
            tendances.append({
                "categorie": label,
                "nb_signalements": count,
                "pourcentage": round(count / nb_total * 100, 1),
            })

    recommandations = []
    if taux_resolution < 30:
        recommandations.append(
            "Le taux de résolution est faible. Envisager un plan d'action prioritaire."
        )
    if urgences_hautes > 5:
        recommandations.append(
            f"Traitement urgent requis pour {urgences_hautes} signalements à haute priorité."
        )
    if top_categories and top_categories[0][1] > nb_total * 0.4:
        label = LABELS_CATEGORIES.get(top_categories[0][0], top_categories[0][0])
        recommandations.append(
            f"Concentrer les efforts sur la catégorie « {label} » qui représente "
            f"{round(top_categories[0][1] / nb_total * 100)}% des signalements."
        )
    if not recommandations:
        recommandations.append(
            "Maintenir le rythme actuel de résolution des signalements."
        )

    return {
        "resume": resume,
        "points_cles": points_cles,
        "tendances": tendances,
        "recommandations": recommandations,
    }
