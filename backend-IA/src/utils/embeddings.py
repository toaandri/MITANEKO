import numpy as np
from typing import Optional
from sentence_transformers import SentenceTransformer

from src.config.settings import settings

_model_instance: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    global _model_instance
    if _model_instance is None:
        _model_instance = SentenceTransformer(
            settings.embedding_model,
            cache_folder=settings.model_cache_dir,
        )
    return _model_instance


def generer_embedding(texte: str) -> list[float]:
    modele = get_embedding_model()
    vecteur = modele.encode(texte, normalize_embeddings=True)
    return vecteur.tolist()


def generer_embeddings_batch(textes: list[str]) -> list[list[float]]:
    modele = get_embedding_model()
    vecteurs = modele.encode(textes, normalize_embeddings=True)
    return [v.tolist() for v in vecteurs]


def similarite_cosine(vecteur_a: list[float], vecteur_b: list[float]) -> float:
    a = np.array(vecteur_a, dtype=np.float64)
    b = np.array(vecteur_b, dtype=np.float64)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
