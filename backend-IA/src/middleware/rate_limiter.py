import time
from collections import defaultdict
from typing import Callable
from fastapi import Request, HTTPException
import hashlib


class MemoryRateLimiter:
    def __init__(self):
        self._fenetres: dict[str, list[float]] = defaultdict(list)

    def _clef(self, request: Request) -> str:
        ip = request.client.host if request.client else "unknown"
        user = request.headers.get("x-user-id", "")
        route = request.url.path
        return hashlib.md5(f"{ip}:{user}:{route}".encode()).hexdigest()

    def verifier(self, max_requetes: int = 60, fenetre_secondes: int = 60):
        async def intermediate(request: Request):
            key = self._clef(request)
            now = time.time()
            fenetre_debut = now - fenetre_secondes

            requetes = self._fenetres[key]
            requetes[:] = [t for t in requetes if t > fenetre_debut]

            if len(requetes) >= max_requetes:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "erreur": "Trop de requêtes",
                        "message": f"Limite: {max_requetes} requêtes par {fenetre_secondes}s. Réessayez plus tard.",
                        "retry_after": fenetre_secondes,
                    },
                )

            requetes.append(now)

        return intermediate


rate_limiter = MemoryRateLimiter()


def rate_limit(max_requetes: int = 60, fenetre_secondes: int = 60):
    return rate_limiter.verifier(max_requetes, fenetre_secondes)
