import re
from typing import Optional

LIEUX_REFERENCE: dict[str, tuple[float, float, str]] = {
    "analakely": (-18.9045, 47.5230, "Analakely, Antananarivo"),
    "antsahabe": (-18.8980, 47.5300, "Antsahabe, Antananarivo"),
    "behoririka": (-18.9060, 47.5200, "Behoririka, Antananarivo"),
    "isotry": (-18.9090, 47.5170, "Isotry, Antananarivo"),
    "tanjombato": (-18.9500, 47.5050, "Tanjombato, Antananarivo"),
    "anjanahary": (-18.9100, 47.5350, "Anjanahary, Antananarivo"),
    "mandroseza": (-18.8880, 47.5400, "Mandroseza, Antananarivo"),
    "ambohimanarina": (-18.8820, 47.5120, "Ambohimanarina, Antananarivo"),
    "ambodivona": (-18.9000, 47.5150, "Ambodivona, Antananarivo"),
    "ampefiloha": (-18.9080, 47.5080, "Ampefiloha, Antananarivo"),
    "anadroandrovitra": (-18.9200, 47.5400, "Anadroandrovitra, Antananarivo"),
    "anjohy": (-18.9150, 47.5050, "Anjohy, Antananarivo"),
    "mahamasina": (-18.9170, 47.5250, "Mahamasina, Antananarivo"),
    "soaranala": (-18.8920, 47.5350, "Soaranala, Antananarivo"),
    "tsaralalana": (-18.9000, 47.5200, "Tsaralalana, Antananarivo"),
}

PATTERNS_COORDONNEES = [
    r"(-?\d+\.?\d*)\s*[,;:\s]+\s*(-?\d+\.?\d*)",
]

PATTERNS_RUE = [
    r"(?:rue|avenue|boulevard|lalana|araben) [\w\s\-'éèêëàâäîïôöùûüç]+",
]


def geocoder_texte(description: str) -> dict:
    texte_lower = description.lower()
    coordonnees = None
    confiance = 0.0
    lieux_trouves: list[dict] = []

    for pattern in PATTERNS_COORDONNEES:
        matches = re.finditer(pattern, description)
        for match in matches:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    coordonnees = {"lat": lat, "lng": lng}
                    confiance = 0.95
                    break
            except ValueError:
                continue

    for nom, (lat, lng, label) in LIEUX_REFERENCE.items():
        if nom in texte_lower:
            lieux_trouves.append({
                "nom": label,
                "coordonnees": {"lat": lat, "lng": lng},
                "precision": "quartier",
            })

    rues_trouvees = []
    for pattern in PATTERNS_RUE:
        matches = re.findall(pattern, description, re.IGNORECASE)
        rues_trouvees.extend([m.strip() for m in matches])

    if not coordonnees and lieux_trouves:
        lieu_principal = lieux_trouves[0]
        coordonnees = lieu_principal["coordonnees"]
        confiance = 0.6

    if coordonnees and lieux_trouves:
        confiance = max(confiance, 0.7)

    if rues_trouvees and not coordonnees:
        confiance = 0.3

    return {
        "coordonnees": coordonnees,
        "confiance": round(confiance, 4),
        "lieux_referents": lieux_trouves,
        "rues_detectees": rues_trouvees,
        "precision": "exacte" if confiance > 0.9 else "approximative" if confiance > 0.5 else "faible",
    }
