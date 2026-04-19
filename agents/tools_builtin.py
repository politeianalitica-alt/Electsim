from __future__ import annotations

from typing import Any

from sqlalchemy import create_engine

from agents.semantic_search import semantic_search_posts
from agents.tools import ToolRegistry


@ToolRegistry.register("get_nowcast")
def get_nowcast() -> dict[str, Any]:
    from models.estadisticos import nowcasting

    engine = create_engine(__import__("os").environ["DATABASE_URL"])
    df = nowcasting.agregar_encuestas(nowcasting.cargar_encuestas_bd(engine))
    return {"rows": len(df), "top": df.head(10).to_dict(orient="records")}


@ToolRegistry.register("compute_pedersen")
def compute_pedersen() -> dict[str, Any]:
    from models.estadisticos import pedersen

    engine = create_engine(__import__("os").environ["DATABASE_URL"])
    df = pedersen.calcular_pedersen_serie(engine)
    pedersen.guardar_pedersen(df, engine)
    return {"rows": len(df)}


@ToolRegistry.register("simulate_campaign")
def simulate_campaign(object_id: Any, mensaje: str, tema: str) -> dict[str, Any]:
    from agents.simulador_campana import MensajeCampana, analizar_receptividad, evaluar_mensaje

    engine = create_engine(__import__("os").environ["DATABASE_URL"])
    partido = str(object_id) if object_id is not None else "N/A"
    msg = MensajeCampana(partido_emisor=partido, texto=mensaje, tipo="propuesta_concreta", tema=tema)
    reacciones = evaluar_mensaje(msg, engine, n_perfiles=25)
    resumen = analizar_receptividad(reacciones)
    return {"n_reacciones": len(reacciones), "resumen": resumen}


@ToolRegistry.register("search_posts_semantic")
def search_posts_semantic(query: str, k: int = 10, tenant_id: str = "default", filters: dict[str, Any] | None = None):
    from db.session import SessionLocal

    with SessionLocal() as session:
        return semantic_search_posts(
            session,
            query=query,
            tenant_id=tenant_id,
            limit=int(k),
            filters=filters or {},
        )
