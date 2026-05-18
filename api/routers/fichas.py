"""
Router /api/v2/ficha · servir fichas dinámicas territoriales y de político.

Patrón:
  GET  /api/v2/ficha/territorio/{cod_ine}    → lee de BD/JSONL; si no, construye on-demand
  GET  /api/v2/ficha/territorio/ccaa/{nombre} → ficha de CCAA
  GET  /api/v2/ficha/politico/{qid_or_slug}  → lee o construye on-demand
  POST /api/v2/ficha/territorio/{cod}/rebuild  → fuerza reconstrucción
  POST /api/v2/ficha/politico/{qid}/rebuild    → fuerza reconstrucción

Cada GET soporta query param `?fresh=1` para forzar reconstrucción.
La construcción on-demand es síncrona (puede tardar 15-40s la 1ª vez).
La segunda lectura sale de caché en ms.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v2/ficha", tags=["fichas"])


# ─────────────────────────────────────────────────────────────────
# TERRITORIO
# ─────────────────────────────────────────────────────────────────

@router.get("/territorio/{cod_ine}")
def get_ficha_territorio(
    cod_ine: str,
    fresh: bool = Query(default=False, description="Forzar reconstrucción"),
) -> dict[str, Any]:
    """Devuelve la ficha de un municipio por código INE (5 dígitos)."""
    from agents.brain.pipelines.persistence_fichas import (
        read_ficha_territorial, persist_ficha_territorial,
    )
    if not fresh:
        cached = read_ficha_territorial(cod_ine)
        if cached:
            return {"found": True, "source": "cache", "ficha": cached}
    # Construir on-demand
    try:
        from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
        builder = FichaTerritorialBuilder()
        ficha = builder.build_municipio(cod_ine)
        d = ficha.model_dump()
        persist_ficha_territorial(d)
        return {"found": True, "source": "fresh", "ficha": d}
    except Exception as exc:
        logger.exception("get_ficha_territorio fallback")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:200]}") from exc


@router.get("/territorio/ccaa/{nombre}")
def get_ficha_ccaa(
    nombre: str,
    fresh: bool = Query(default=False),
) -> dict[str, Any]:
    """Devuelve la ficha de una CCAA por nombre."""
    from agents.brain.pipelines.persistence_fichas import (
        read_ficha_territorial, persist_ficha_territorial,
    )
    slug = nombre.lower().replace(" ", "_")
    if not fresh:
        cached = read_ficha_territorial(slug)
        if cached:
            return {"found": True, "source": "cache", "ficha": cached}
    try:
        from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
        builder = FichaTerritorialBuilder()
        ficha = builder.build_ccaa(nombre)
        d = ficha.model_dump()
        persist_ficha_territorial(d)
        return {"found": True, "source": "fresh", "ficha": d}
    except Exception as exc:
        logger.exception("get_ficha_ccaa fallback")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:200]}") from exc


@router.post("/territorio/{cod_ine}/rebuild")
def rebuild_ficha_territorio(
    cod_ine: str, background: BackgroundTasks,
) -> dict[str, Any]:
    """Lanza reconstrucción en background. Devuelve 202 inmediato."""
    def _job():
        from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
        from agents.brain.pipelines.persistence_fichas import persist_ficha_territorial
        builder = FichaTerritorialBuilder()
        ficha = builder.build_municipio(cod_ine)
        persist_ficha_territorial(ficha.model_dump())
    background.add_task(_job)
    return {"status": "queued", "cod_ine": cod_ine}


# ─────────────────────────────────────────────────────────────────
# POLITICO
# ─────────────────────────────────────────────────────────────────

@router.get("/politico/{qid_or_slug}")
def get_ficha_politico(
    qid_or_slug: str,
    fresh: bool = Query(default=False),
    nombre: str | None = Query(default=None,
                                description="Si pasas slug y no QID, da el nombre completo para resolver"),
) -> dict[str, Any]:
    """Devuelve la ficha de un político por QID Wikidata o slug."""
    from agents.brain.pipelines.persistence_fichas import (
        read_ficha_politico, persist_ficha_politico,
    )
    if not fresh:
        cached = read_ficha_politico(qid_or_slug)
        if cached:
            return {"found": True, "source": "cache", "ficha": cached}
    try:
        from agents.brain.pipelines.ficha_politico_builder import FichaPoliticoBuilder
        builder = FichaPoliticoBuilder()
        if qid_or_slug.startswith("Q") and qid_or_slug[1:].isdigit():
            ficha = builder.build_by_qid(qid_or_slug)
        elif nombre:
            ficha = builder.build_by_name(nombre)
        else:
            # Slug → intenta de-slugify a nombre
            nombre_inferido = qid_or_slug.replace("_", " ").title()
            ficha = builder.build_by_name(nombre_inferido)
        d = ficha.model_dump()
        persist_ficha_politico(d)
        return {"found": True, "source": "fresh", "ficha": d}
    except Exception as exc:
        logger.exception("get_ficha_politico fallback")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:200]}") from exc


@router.post("/politico/{qid}/rebuild")
def rebuild_ficha_politico(qid: str, background: BackgroundTasks) -> dict[str, Any]:
    """Lanza reconstrucción en background."""
    def _job():
        from agents.brain.pipelines.ficha_politico_builder import FichaPoliticoBuilder
        from agents.brain.pipelines.persistence_fichas import persist_ficha_politico
        builder = FichaPoliticoBuilder()
        ficha = builder.build_by_qid(qid)
        persist_ficha_politico(ficha.model_dump())
    background.add_task(_job)
    return {"status": "queued", "qid": qid}


# ─────────────────────────────────────────────────────────────────
# DISCOVERY
# ─────────────────────────────────────────────────────────────────

@router.get("/territorios/buscar")
def buscar_territorios(q: str, limit: int = 8) -> dict[str, Any]:
    """Autocompletado de municipios + CCAA · usado por la barra Cmd+K.

    Fuzzy match sobre el CSV inventario cacheado · respuesta <50ms.
    """
    if not q or len(q) < 2:
        return {"resultados": []}
    try:
        from agents.brain.pipelines.data_sources.municipios_inventory import (
            list_all_municipios, list_ccaa,
        )
        import unicodedata
        def _norm(s: str) -> str:
            return unicodedata.normalize("NFD", (s or "").lower()).encode(
                "ascii", "ignore",
            ).decode("ascii").strip()
        qn = _norm(q)
        resultados: list[dict[str, Any]] = []
        # CCAA (max 3)
        for c in list_ccaa():
            if qn in _norm(c["nombre"]):
                resultados.append({
                    "tipo": "ccaa",
                    "nombre": c["nombre"],
                    "codigo_ine": c["codigo"],
                    "capital": c.get("capital", ""),
                })
                if sum(1 for r in resultados if r["tipo"] == "ccaa") >= 3:
                    break
        # Municipios
        cupo = max(1, int(limit) - len(resultados))
        for m in list_all_municipios()[:5000]:
            nn = _norm(m.get("nombre", ""))
            if nn.startswith(qn) or qn in nn:
                resultados.append({
                    "tipo": "municipio",
                    "nombre": m.get("nombre"),
                    "codigo_ine": m.get("codigo_ine"),
                    "provincia": m.get("provincia"),
                    "ccaa": m.get("ccaa"),
                    "poblacion": m.get("poblacion"),
                })
                if sum(1 for r in resultados if r["tipo"] == "municipio") >= cupo:
                    break
        # Orden: prefijo primero, luego por población desc
        def _rank(r: dict[str, Any]) -> tuple[int, int]:
            n = _norm(r.get("nombre", ""))
            pref = 0 if n.startswith(qn) else 1
            return (pref, -(r.get("poblacion") or 0))
        resultados.sort(key=_rank)
        return {"resultados": resultados[: int(limit)]}
    except Exception as exc:
        logger.exception("buscar_territorios falló")
        return {"resultados": [], "error": str(exc)[:200]}


@router.get("/politicos/activos")
def listar_politicos_activos(limit: int = 50) -> dict[str, Any]:
    """Lista QID + nombre de políticos españoles con cargo activo (Wikidata)."""
    try:
        from agents.brain.pipelines.data_sources.wikidata_politicos import list_politicos_activos
        lst = list_politicos_activos(limit=int(limit))
        return {"count": len(lst), "politicos": lst}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc
