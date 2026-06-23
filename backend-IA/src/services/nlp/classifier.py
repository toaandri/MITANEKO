import os
import joblib
import numpy as np
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from src.config.settings import settings
from src.utils.helpers import nettoyer_texte, extraire_urgence

CATEGORIES = [
    "voirie_trottoirs",
    "eclairage_public",
    "dechets_proprete",
    "eau_assainissement",
    "espaces_verts",
    "securite",
    "transport",
    "bruit",
    "batiments_publics",
    "autre",
]

DONNEES_ENTRAINEMENT: list[tuple[str, str]] = [
    ("route cassée nid de poule dangereux", "voirie_trottoirs"),
    ("trou dans la chaussée rue principale", "voirie_trottoirs"),
    ("trottoir impraticable bloqué", "voirie_trottoirs"),
    ("nid de poule avenue indépendance", "voirie_trottoirs"),
    ("route inondée circulation difficile", "voirie_trottoirs"),
    ("lampadaire cassé plus de lumière", "eclairage_public"),
    ("éclairage public défectueux rue sombre", "eclairage_public"),
    ("lampadaire ne s'allume pas la nuit", "eclairage_public"),
    ("poteau électrique endommagé dangereux", "eclairage_public"),
    ("quartier plongé dans le noir", "eclairage_public"),
    ("décharge sauvage odeur nauséabonde", "dechets_proprete"),
    ("ordures non collectées depuis semaines", "dechets_proprete"),
    ("dépôt d'ordures sauvage quartier", "dechets_proprete"),
    ("poubelles débordent mauvaise odeur", "dechets_proprete"),
    ("déchets ménagers dans la rue", "dechets_proprete"),
    ("fuite d'eau gaspillage", "eau_assainissement"),
    ("canalisation bouchée eaux usées", "eau_assainissement"),
    ("égout bouché mauvaise odeur", "eau_assainissement"),
    ("plus d'eau potable depuis jours", "eau_assainissement"),
    ("inondation eaux pluviales quartier", "eau_assainissement"),
    ("parc public abandonné mauvaises herbes", "espaces_verts"),
    ("jardin public sale négligé", "espaces_verts"),
    ("arbre dangereux près de l'école", "espaces_verts"),
    ("espace vert envahi par les détritus", "espaces_verts"),
    ("insécurité nocturne agression", "securite"),
    ("bandes organisées quartier nuit", "securite"),
    ("éclairage insuffisant insécurité", "securite"),
    ("voitures garées passage bloqué", "transport"),
    ("arrêt bus abîmé sans abri", "transport"),
    ("transport public insuffisant matin soir", "transport"),
    ("bruits voisins nocturnes insupportables", "bruit"),
    ("tapage nocturne répété", "bruit"),
    ("marché trop bruyant tôt matin", "bruit"),
    ("toiture mairie endommagée fuite", "batiments_publics"),
    ("école publique vitre cassée", "batiments_publics"),
    ("marché communal toit troué", "batiments_publics"),
    ("lalana vaky mampidi-doza", "voirie_trottoirs"),
    ("jiro maty tsy misy mazava", "eclairage_public"),
    ("fako tsy voaangona herinandro", "dechets_proprete"),
    ("rano mivoaka lalana", "eau_assainissement"),
    ("kijana mampidi-doza", "espaces_verts"),
    ("tsy azo antoka ny alina", "securite"),
    ("tabataba be alina", "bruit"),
    ("trano sekoly simba", "batiments_publics"),
    ("bus tsy ampy maraina", "transport"),
]

_classifier: Optional[Pipeline] = None
_vectorizer: Optional[TfidfVectorizer] = None


def _entrainer_classifier() -> Pipeline:
    textes = [nettoyer_texte(t) for t, _ in DONNEES_ENTRAINEMENT]
    labels = [l for _, l in DONNEES_ENTRAINEMENT]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 3), max_features=5000)),
        ("clf", LogisticRegression(max_iter=500, multi_class="multinomial")),
    ])
    pipeline.fit(textes, labels)
    return pipeline


def _charger_ou_entrainer() -> Pipeline:
    chemin = settings.classifier_model
    if os.path.exists(chemin):
        return joblib.load(chemin)
    pipeline = _entrainer_classifier()
    os.makedirs(os.path.dirname(chemin) or ".", exist_ok=True)
    joblib.dump(pipeline, chemin)
    return pipeline


def get_classifier() -> Pipeline:
    global _classifier
    if _classifier is None:
        _classifier = _charger_ou_entrainer()
    return _classifier


def classer_signalement(description: str) -> dict:
    texte = nettoyer_texte(description)
    pipeline = get_classifier()

    probas = pipeline.predict_proba([texte])[0]
    classes = pipeline.classes_
    scores = {c: float(p) for c, p in zip(classes, probas)}
    idx = int(np.argmax(probas))
    categorie = classes[idx]
    confiance = float(probas[idx])

    urgence = extraire_urgence(description)

    sous_categories = {
        "voirie_trottoirs": ["nid_de_poule", "trottoir", "inondation_voirie"],
        "eclairage_public": ["lampadaire", "poteau", "quartier_obscur"],
        "dechets_proprete": ["decharge_sauvage", "collecte", "dechets_menagers"],
        "eau_assainissement": ["fuite", "egout", "eau_potable", "inondation"],
        "espaces_verts": ["parc", "arbre", "jardin"],
        "securite": ["insécurité", "agression", "cambriolage"],
        "transport": ["arret_bus", "circulation", "stationnement"],
        "bruit": ["voisinage", "tapage", "etablissement"],
        "batiments_publics": ["ecole", "mairie", "marche"],
        "autre": [],
    }
    sous_cat = None
    for sc in sous_categories.get(categorie, []):
        if sc.replace("_", " ") in description.lower():
            sous_cat = sc
            break

    return {
        "categorie": categorie,
        "confiance": round(confiance, 4),
        "sous_categorie": sous_cat,
        "urgence": urgence,
        "scores": {k: round(v, 4) for k, v in sorted(scores.items(), key=lambda x: -x[1])},
    }
