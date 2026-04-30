from fastapi import APIRouter

from app.api import (
    alertas, congreso, elecciones,
    escenarios, indices, macro,
    nowcasting, prensa, riesgo,
)

api_router = APIRouter()

api_router.include_router(nowcasting.router)
api_router.include_router(macro.router)
api_router.include_router(elecciones.router)
api_router.include_router(alertas.router)
api_router.include_router(indices.router)
api_router.include_router(escenarios.router)
api_router.include_router(prensa.router)
api_router.include_router(riesgo.router)
api_router.include_router(congreso.router)
