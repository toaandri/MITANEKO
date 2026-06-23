from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import httpx
from typing import Optional

from src.config.settings import settings

security = HTTPBearer(auto_error=False)

import functools

_public_key_cache: Optional[str] = None


async def verifier_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token manquant")

    token = credentials.credentials
    erreurs = []

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub") or payload.get("user_id")
        role = payload.get("role", "citoyen")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide : utilisateur non identifié")
        return {"user_id": user_id, "role": role, "payload": payload}
    except JWTError as e:
        erreurs.append(str(e))

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.mitaneko_api_url}/auth/verify",
                json={"token": token},
                timeout=5.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "user_id": data.get("user_id"),
                    "role": data.get("role", "citoyen"),
                    "payload": data,
                }
            erreurs.append(f"API verify: {resp.status_code}")
    except Exception as e:
        erreurs.append(f"API verify error: {str(e)}")

    raise HTTPException(
        status_code=401,
        detail=f"Token invalide ou expiré. Erreurs: {'; '.join(erreurs)}",
    )


def requerir_role(roles_autorises: list[str]):
    async def verificateur(payload: dict = Depends(verifier_token)):
        role = payload.get("role", "")
        if role not in roles_autorises and "admin_plateforme" not in roles_autorises:
            if role != "admin_plateforme":
                raise HTTPException(
                    status_code=403,
                    detail=f"Rôle '{role}' non autorisé. Rôles requis: {', '.join(roles_autorises)}",
                )
        return payload

    return verificateur
