import math
from typing import Any
from collections import Counter

import numpy as np
from sklearn.cluster import DBSCAN
from shapely.geometry import Point, MultiPoint

from src.models.schemas import Coordinate


def _distance_haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def detecter_clusters(
    signalements: list[dict[str, Any]],
    rayon_metres: float = 200.0,
    min_points: int = 2,
) -> list[dict]:
    points_coords = []
    points_valides = []

    for s in signalements:
        loc = s.get("localisation") or s.get("coordonnees", {})
        lat = loc.get("lat") if isinstance(loc, dict) else None
        lng = loc.get("lng") if isinstance(loc, dict) else None
        if lat is not None and lng is not None:
            points_coords.append([lat, lng])
            points_valides.append(s)

    if len(points_valides) < min_points:
        return []

    coords = np.radians(points_coords)

    epsilon = rayon_metres / 6371000.0

    clustering = DBSCAN(eps=epsilon, min_samples=min_points, metric="haversine")
    labels = clustering.fit_predict(coords)

    clusters: dict[int, list[dict]] = {}
    for label_idx, signalement in zip(labels, points_valides):
        if label_idx == -1:
            continue
        if label_idx not in clusters:
            clusters[label_idx] = []
        clusters[label_idx].append(signalement)

    resultats = []
    for cluster_id, membres in clusters.items():
        latitudes = [m.get("localisation", {}).get("lat") or m.get("coordonnees", {}).get("lat") for m in membres]
        longitudes = [m.get("localisation", {}).get("lng") or m.get("coordonnees", {}).get("lng") for m in membres]

        centre_lat = float(np.mean(latitudes))
        centre_lng = float(np.mean(longitudes))

        rayons = [
            _distance_haversine(centre_lat, centre_lng, lat, lng)
            for lat, lng in zip(latitudes, longitudes)
        ]
        rayon_moyen = float(np.mean(rayons)) if rayons else 0.0

        categories = [m.get("categorie", "autre") for m in membres]
        categorie_dominante = Counter(categories).most_common(1)[0][0]

        urgences = [m.get("urgence", "basse") for m in membres]
        map_urgence = {"haute": 3.0, "moyenne": 2.0, "basse": 1.0}
        urgence_moy = float(np.mean([map_urgence.get(u, 1.0) for u in urgences]))

        ids_membres = [m.get("id", str(i)) for i, m in enumerate(membres)]

        resultats.append({
            "cluster_id": f"cluster_{cluster_id}",
            "centre": {"lat": round(centre_lat, 6), "lng": round(centre_lng, 6)},
            "signalements": ids_membres,
            "rayon_moyen": round(rayon_moyen, 2),
            "nb_signalements": len(membres),
            "categorie_dominante": categorie_dominante,
            "urgence_moyenne": round(urgence_moy, 2),
        })

    resultats.sort(key=lambda c: -c["nb_signalements"])
    return resultats


def estimer_zone_impact(clusters: list[dict]) -> dict:
    if not clusters:
        return {
            "zone_totale_m2": 0,
            "nb_clusters": 0,
            "estimation": "Aucun cluster détecté",
        }

    points = []
    for c in clusters:
        centre = c["centre"]
        points.append(Point(centre["lng"], centre["lat"]))

    if len(points) >= 3:
        try:
            multipoint = MultiPoint(points)
            convex_hull = multipoint.convex_hull
            zone_totale = convex_hull.area * 111_320 * 111_320
        except Exception:
            zone_totale = 0
    else:
        zone_totale = 0

    return {
        "zone_totale_m2": round(zone_totale, 2),
        "nb_clusters": len(clusters),
        "nb_signalements_total": sum(c["nb_signalements"] for c in clusters),
        "estimation": f"{len(clusters)} zone(s) problématique(s) identifiée(s) "
                      f"regroupant {sum(c['nb_signalements'] for c in clusters)} signalements",
    }
