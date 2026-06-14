from typing import Optional
from transformers import pipeline as hf_pipeline

from src.config.settings import settings
from src.utils.helpers import nettoyer_texte

DICO_MG_FR: dict[str, str] = {
    "lalana": "route", "vaky": "cassé", "jiro": "lumière",
    "maty": "éteint", "fako": "ordures", "rano": "eau",
    "mivoaka": "qui s'écoule", "loza": "danger", "mampidi-doza": "dangereux",
    "tsara": "bien", "ratsy": "mauvais", "lehibe": "grand",
    "kely": "petit", "maika": "urgent", "vonjeo": "au secours",
    "trano": "maison/bâtiment", "sekoly": "école", "hopitaly": "hôpital",
    "tsena": "marché", "lalamby": "chemin de fer",
    "orinasa": "usine", "tanana": "village", "renivohitra": "capitale",
    "faritra": "région", "commune": "commune",
    "fokontany": "quartier", "mpianatra": "élève/étudiant",
    "mpampianatra": "enseignant", "mpiasa": "travailleur",
    "mpanjifa": "client", "mpanamboatra": "réparateur",
}

_traducteur_hf: Optional = None


def _charger_traducteur():
    global _traducteur_hf
    if _traducteur_hf is None:
        try:
            _traducteur_hf = hf_pipeline(
                "translation",
                model=settings.translation_model,
                cache_dir=settings.model_cache_dir,
            )
        except Exception:
            _traducteur_hf = None
    return _traducteur_hf


def _traduire_dico(texte: str, dico: dict[str, str]) -> str:
    resultat = texte.lower()
    for mg, fr in dico.items():
        resultat = resultat.replace(mg, fr)
    return resultat


def _detecter_langue(texte: str) -> str:
    mots_mg = ["ny", "dia", "tsy", "izy", "amin", "ho", "an", "ao", "toy",
               "fako", "rano", "jiro", "lalana", "vaky", "loza", "tsara", "ratsy",
               "lehibe", "kely", "maika", "trano", "sekoly", "tsena"]
    mots = texte.lower().split()
    if not mots:
        return "fr"
    nb_mg = sum(1 for m in mots if m in mots_mg)
    ratio = nb_mg / len(mots)
    return "mg" if ratio > 0.15 else "fr"


def traduire(texte: str, cible: str = "fr") -> dict:
    langue_source = _detecter_langue(texte)

    if langue_source == cible:
        return {
            "texte_original": texte,
            "texte_traduit": texte,
            "langue_source": langue_source,
            "langue_cible": cible,
            "confiance": 1.0,
        }

    traducteur = _charger_traducteur()
    confiance = 0.0

    if langue_source == "mg" and cible == "fr":
        try:
            if traducteur is not None:
                resultat = traducteur(texte[:512])
                texte_traduit = resultat[0]["translation_text"]
                confiance = 0.85
            else:
                texte_traduit = _traduire_dico(texte, DICO_MG_FR)
                confiance = 0.6
        except Exception:
            texte_traduit = _traduire_dico(texte, DICO_MG_FR)
            confiance = 0.6
    elif langue_source == "fr" and cible == "mg":
        dico_fr_mg = {v: k for k, v in DICO_MG_FR.items()}
        texte_traduit = _traduire_dico(texte, dico_fr_mg)
        confiance = 0.5
    else:
        texte_traduit = texte
        confiance = 0.3

    return {
        "texte_original": texte,
        "texte_traduit": texte_traduit,
        "langue_source": langue_source,
        "langue_cible": cible,
        "confiance": round(confiance, 4),
    }
