import re
from typing import Optional

from src.utils.helpers import nettoyer_texte

PATTERNS_LIEUX = [
    r"(?:rue|avenue|boulevard|impasse|place|quartier|lot| villa| cité) [\w\s\-éèêëàâäîïôöùûüç]+",
    r"(?:commune|fokontany|arrondissement) [\w\s\-]+",
    r"(?:RN|route nationale) ?\d+",
    r"(?:PK) ?\d+",
    r"analakely|antsahabe|behoririka|isotry|tanjombato|anjanahary|anatin`i (?:renivohitra|tanana)",
]

PATTERNS_MONTANTS = [
    r"(?:ariary|Ar|MGA|euro|EUR|€|dollar|USD|\$) ?[\d\s,.]+",
    r"[\d\s,.]{2,} ?(?:ariary|Ar|MGA|€|euro)",
]

PATTERNS_URGENCE = [
    (r"\b(urgent|immédiat|dangereux|critique|vital|peril|maika)\b", "haute"),
    (r"\b(important|rapidement|bientot|vite|bientôt)\b", "moyenne"),
    (r"\b(éventuel|un jour|plus tard|si possible|éventuellement)\b", "basse"),
]

PATTERNS_CONTACT = [
    r"(?:\+?261|0)\s*3[2-9]\s*\d{2}\s*\d{3}\s*\d{2}",
    r"\b[\w._%+-]+@[\w.-]+\.\w{2,}\b",
]

MOTS_CLEFS_PAR_CATEGORIE = {
    "voirie_trottoirs": ["nid de poule", "route", "chaussée", "trottoir", "lalana", "vaky", "trou"],
    "eclairage_public": ["lampadaire", "éclairage", "lumière", "poteau", "jiro", "maty", "sombre"],
    "dechets_proprete": ["ordure", "déchet", "poubelle", "décharge", "fako", "maloto"],
    "eau_assainissement": ["eau", "fuite", "inondation", "égout", "rano", "mivoaka", "tondraka"],
    "securite": ["insécurité", "agression", "vol", "dangereux", "loza", "mpangalatra"],
}


def extraire_entites(description: str) -> dict:
    texte_original = description
    texte_lower = description.lower()

    lieux = []
    for pattern in PATTERNS_LIEUX:
        matches = re.findall(pattern, texte_lower, re.IGNORECASE)
        lieux.extend([m.strip() for m in matches])

    lieux = list(set(lieux))

    montants = []
    for pattern in PATTERNS_MONTANTS:
        matches = re.findall(pattern, texte_original, re.IGNORECASE)
        montants.extend([m.strip() for m in matches])

    montants = list(set(montants))

    urgences = []
    for pattern, niveau in PATTERNS_URGENCE:
        if re.search(pattern, texte_lower, re.IGNORECASE):
            urgences.append(niveau)

    contacts = []
    for pattern in PATTERNS_CONTACT:
        matches = re.findall(pattern, texte_original)
        contacts.extend(matches)

    contacts = list(set(contacts))

    categories_probables = []
    for categorie, mots in MOTS_CLEFS_PAR_CATEGORIE.items():
        for mot in mots:
            if mot in texte_lower:
                categories_probables.append(categorie)
                break

    entites = {
        "categories_probables": categories_probables,
        "contacts": contacts,
        "niveaux_urgence": list(set(urgences)),
    }

    return {
        "entites": entites,
        "lieux": lieux,
        "montants": montants,
        "urgences": list(set(urgences)),
    }
