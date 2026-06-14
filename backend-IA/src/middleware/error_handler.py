from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback
import logging

logger = logging.getLogger("mitaneko_ia")


async def global_error_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "erreur": "http_error",
                "detail": exc.detail,
                "status_code": exc.status_code,
            },
        )

    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "erreur": "validation_error",
                "detail": exc.errors(),
                "message": "Données d'entrée invalides",
            },
        )

    logger.error(
        "Erreur non gérée: %s\n%s",
        str(exc),
        traceback.format_exc(),
    )

    return JSONResponse(
        status_code=500,
        content={
            "erreur": "internal_error",
            "detail": "Une erreur interne s'est produite",
            "message": str(exc) if str(exc) else "Erreur serveur",
        },
    )


class ServiceError(Exception):
    def __init__(self, message: str, service: str, status_code: int = 500):
        self.message = message
        self.service = service
        self.status_code = status_code
        super().__init__(self.message)


class ModelNotLoadedError(ServiceError):
    def __init__(self, model_name: str):
        super().__init__(
            message=f"Le modèle '{model_name}' n'a pas pu être chargé",
            service="model_loading",
            status_code=503,
        )
