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


@ToolRegistry.register("local_ai_ingest_path")
def local_ai_ingest_path(path: str, max_records: int | None = None) -> dict[str, Any]:
    from dataclasses import asdict

    from agents.local_intelligence import get_local_store

    return asdict(get_local_store().ingest_path(path, max_records=max_records))


@ToolRegistry.register("local_ai_search")
def local_ai_search(query: str, k: int = 8, domain: str | None = None) -> list[dict[str, Any]]:
    from agents.local_intelligence import get_local_store

    return get_local_store().search(query, k=k, domain=domain)


@ToolRegistry.register("local_ai_chat")
def local_ai_chat(
    question: str,
    k: int = 8,
    domain: str | None = None,
    use_llm: bool = True,
    allow_tools: bool = True,
) -> dict[str, Any]:
    from dataclasses import asdict

    from agents.local_intelligence import get_local_store

    result = get_local_store().chat(
        question,
        k=k,
        domain=domain,
        use_llm=use_llm,
        allow_tools=allow_tools,
    )
    return asdict(result)


@ToolRegistry.register("local_ai_ontology_summary")
def local_ai_ontology_summary() -> dict[str, Any]:
    from agents.local_intelligence import get_local_store

    return get_local_store().ontology_summary()


@ToolRegistry.register("backend_manager_chat")
def backend_manager_chat(
    question: str,
    k: int = 10,
    provider: str | None = None,
    use_llm: bool = True,
    repo: str | None = None,
    domain: str | None = None,
) -> dict[str, Any]:
    from dataclasses import asdict

    from agents.backend_manager import get_backend_manager

    result = get_backend_manager(provider=provider, use_llm=use_llm).chat(
        question,
        k=k,
        repo=repo,
        domain=domain,
    )
    return asdict(result)


@ToolRegistry.register("backend_manager_status")
def backend_manager_status(provider: str | None = None) -> dict[str, Any]:
    from agents.backend_manager import get_backend_manager

    return get_backend_manager(provider=provider, use_llm=False).status()


@ToolRegistry.register("git_amigos_reindex")
def git_amigos_reindex(
    max_file_bytes: int = 750_000,
    max_chars_per_file: int = 80_000,
    max_files_per_repo: int | None = None,
    docs_only: bool = False,
) -> dict[str, Any]:
    from agents.backend_manager import get_backend_manager

    return get_backend_manager(use_llm=False).reindex_gits(
        max_file_bytes=max_file_bytes,
        max_chars_per_file=max_chars_per_file,
        max_files_per_repo=max_files_per_repo,
        docs_only=docs_only,
    )
