from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class Coordinate(BaseModel):
    lat: float
    lng: float


class SignalementInput(BaseModel):
    description: str
    categorie: Optional[str] = None
    localisation: Optional[Coordinate] = None
    quartier_id: Optional[str] = None


class SignalementOutput(BaseModel):
    id: str
    description: str
    categorie_predite: Optional[str] = None
    score_confiance: Optional[float] = None
    urgence: Optional[str] = None
    entites: Optional[dict[str, Any]] = None


class ClassificationResult(BaseModel):
    categorie: str
    confiance: float
    sous_categorie: Optional[str] = None
    urgence: str
    scores: dict[str, float]


class SentimentResult(BaseModel):
    score: float
    label: str
    nuance: str
    emoji: str
    scores_composants: Optional[dict[str, float]] = None


class ModerationResult(BaseModel):
    est_sain: bool
    categories_risque: list[str]
    scores: dict[str, float]
    action_recommandee: str


class VisionAnalysisResult(BaseModel):
    categorie_probable: Optional[str] = None
    confiance: float
    contient_visage: bool
    contient_vehicule: bool
    contient_dechet: bool
    contient_infrastructure: bool
    qualite_image: dict[str, Any]
    tags: list[str]


class DuplicateCheckResult(BaseModel):
    est_doublon: bool
    signalement_similaire_id: Optional[str] = None
    similarite: float
    raison: Optional[str] = None


class ClusterResult(BaseModel):
    cluster_id: str
    centre: Coordinate
    signalements: list[str]
    rayon_moyen: float
    nb_signalements: int
    categorie_dominante: str
    urgence_moyenne: float


class PredictionResult(BaseModel):
    delai_resolution_heures: float
    confiance: float
    facteurs_influents: list[dict[str, Any]]
    fourchette_basse: float
    fourchette_haute: float


class PriorityScore(BaseModel):
    score_global: float
    urgence_texte: str
    score_popularite: float
    score_gravite: float
    score_recence: float
    score_impact_communautaire: float
    facteurs: dict[str, Any]


class AnomalyResult(BaseModel):
    est_anormal: bool
    score_anomalie: float
    type_anomalie: Optional[str] = None
    explication: str
    recommandation: str


class ChatbotRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    commune_id: Optional[str] = None
    historique: list[dict[str, str]] = []


class ChatbotResponse(BaseModel):
    reponse: str
    intention: str
    actions_suggerees: list[str]
    sources: list[str]


class SummaryResult(BaseModel):
    resume: str
    points_cles: list[str]
    tendances: list[dict[str, Any]]
    recommandations: list[str]


class ActionRecommendation(BaseModel):
    action: str
    priorite: int
    signalements_lies: list[str]
    budget_estime: Optional[float] = None
    impact_prevu: str
    justification: str


class EntityExtractionResult(BaseModel):
    entites: dict[str, list[str]]
    lieux: list[str]
    montants: list[float]
    urgences: list[str]


class TranslationResult(BaseModel):
    texte_original: str
    texte_traduit: str
    langue_source: str
    langue_cible: str
    confiance: float
