import math
from typing import Any, Optional
from collections import Counter


COUT_MOYEN_PAR_CATEGORIE: dict[str, float] = {
    "voirie_trottoirs": 500000.0,
    "eclairage_public": 300000.0,
    "dechets_proprete": 200000.0,
    "eau_assainissement": 800000.0,
    "espaces_verts": 400000.0,
    "securite": 600000.0,
    "transport": 1000000.0,
    "bruit": 150000.0,
    "batiments_publics": 2000000.0,
    "autre": 300000.0,
}

IMPACT_PAR_CATEGORIE: dict[str, str] = {
    "voirie_trottoirs": "Améliore la circulation et la sécurité des piétons",
    "eclairage_public": "Réduit l'insécurité nocturne et améliore la qualité de vie",
    "dechets_proprete": "Améliore l'hygiène publique et le cadre de vie",
    "eau_assainissement": "Prévient les maladies et les inondations",
    "espaces_verts": "Améliore l'environnement et les loisirs",
    "securite": "Renforce la sécurité des habitants",
    "transport": "Facilite la mobilité urbaine",
    "bruit": "Améliore la tranquillité publique",
    "batiments_publics": "Préserve le patrimoine et les services publics",
    "autre": "Amélioration générale",
}


def recommander_actions(
    signalements: list[dict],
    budget_disponible: Optional[float] = None,
    commune: Optional[str] = None,
    priorites_elu: Optional[list[str]] = None,
) -> list[dict]:
    if not signalements:
        return []

    if priorites_elu is None:
        priorites_elu = []

    categories = [s.get("categorie", "autre") for s in signalements]
    cat_counter = Counter(categories)

    signalements_par_cat: dict[str, list[dict]] = {}
    for s in signalements:
        cat = s.get("categorie", "autre")
        if cat not in signalements_par_cat:
            signalements_par_cat[cat] = []
        signalements_par_cat[cat].append(s)

    recommandations = []
    budget_utilise = 0.0

    categories_triees = sorted(
        cat_counter.items(),
        key=lambda x: (
            x[1],
            sum(
                s.get("nb_votes", 0)
                for s in signalements_par_cat.get(x[0], [])
            ),
        ),
        reverse=True,
    )

    for categorie, nb in categories_triees:
        cout_estime = COUT_MOYEN_PAR_CATEGORIE.get(categorie, 300000.0)
        if budget_disponible and budget_utilise + cout_estime > budget_disponible:
            continue

        signalements_lies = [
            s.get("id", f"sig_{i}")
            for i, s in enumerate(signalements_par_cat.get(categorie, []))
        ][:20]

        nb_votes_cat = sum(
            s.get("nb_votes", 0) for s in signalements_par_cat.get(categorie, [])
        )
        nb_urgents = sum(
            1 for s in signalements_par_cat.get(categorie, [])
            if s.get("urgence", "basse") == "haute"
        )

        score_urgence_cat = nb_urgents / max(nb, 1)
        score_votes_cat = min(1.0, nb_votes_cat / 100)

        priorite = 5
        if nb > 10 or score_urgence_cat > 0.3:
            priorite = 1
        elif nb > 5 or score_votes_cat > 0.5:
            priorite = 2
        elif nb > 3:
            priorite = 3
        else:
            priorite = 4

        if priorites_elu and categorie in priorites_elu:
            priorite = max(1, priorite - 1)

        budget_utilise += cout_estime

        ACTION_TEMPLATES: dict[str, list[str]] = {
            "voirie_trottoirs": [
                "Programmer le colmatage des nids-de-poule",
                "Réfection de la chaussée",
                "Réparation et mise aux normes des trottoirs",
            ],
            "eclairage_public": [
                "Remplacement des lampadaires défectueux",
                "Extension du réseau d'éclairage",
                "Maintenance préventive de l'éclairage public",
            ],
            "dechets_proprete": [
                "Opération de nettoyage et collecte exceptionnelle",
                "Installation de bacs à ordures supplémentaires",
                "Campagne de sensibilisation à la propreté",
            ],
            "eau_assainissement": [
                "Débouchage des canalisations",
                "Réparation des fuites d'eau",
                "Aménagement de drainage des eaux pluviales",
            ],
            "espaces_verts": [
                "Entretien et aménagement des espaces verts",
                "Plantation d'arbres et végétalisation",
                "Installation d'équipements de parc",
            ],
            "securite": [
                "Renforcement de l'éclairage public",
                "Installation de caméras de surveillance",
                "Patrouilles de proximité renforcées",
            ],
        }

        templates = ACTION_TEMPLATES.get(categorie, [f"Intervention dans la catégorie {categorie}"])
        action_label = templates[0]

        recommandations.append({
            "action": action_label,
            "priorite": priorite,
            "signalements_lies": signalements_lies[:10],
            "nb_signalements_concerne": nb,
            "budget_estime": cout_estime,
            "impact_prevu": IMPACT_PAR_CATEGORIE.get(categorie, "Amélioration générale"),
            "justification": (
                f"{nb} signalements dans la catégorie « {categorie} » "
                f"dont {nb_urgents} urgents, {nb_votes_cat} votes citoyens."
            ),
        })

    recommandations.sort(key=lambda r: r["priorite"])

    return recommandations
