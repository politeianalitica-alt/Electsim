"""
Data Ops Tools — Bloque 8.

Herramientas Brain para consultar el estado operacional del sistema de datos.
Usadas por N8_ChatIA y cualquier agente LLM que necesite diagnóstico ETL.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Helpers internos ───────────────────────────────────────────────────────────

def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


def _df_to_records(df, max_rows: int = 20) -> list[dict]:
    """Convierte un DataFrame en lista de dicts, limitando filas."""
    if df is None or df.empty:
        return []
    return df.head(max_rows).to_dict(orient="records")


# ── Implementaciones ───────────────────────────────────────────────────────────

def _get_data_ops_status(params: dict) -> dict:
    """
    Devuelve el estado global del sistema de datos:
    fuentes saludables, pipelines fallidos, módulos frescos, calidad.
    """
    try:
        from dashboard.services.data_ops_core import cargar_kpis_data_ops
        kpis = cargar_kpis_data_ops(engine=_get_engine())
        return {
            "overall_status": kpis.get("overall_status", "unknown"),
            "sources_healthy": kpis.get("sources_healthy", 0),
            "sources_degraded": kpis.get("sources_degraded", 0),
            "sources_down": kpis.get("sources_down", 0),
            "pipelines_ok_24h": kpis.get("pipelines_ok_24h", 0),
            "pipelines_failed_24h": kpis.get("pipelines_failed_24h", 0),
            "modules_fresh": kpis.get("modules_fresh", 0),
            "modules_stale": kpis.get("modules_stale", 0),
            "quality_pass_rate": kpis.get("quality_pass_rate", 1.0),
            "total_alerts": kpis.get("total_alerts", 0),
            "computed_at": kpis.get("computed_at"),
        }
    except Exception as exc:
        logger.debug("_get_data_ops_status: %s", exc)
        return {"overall_status": "unknown", "error": str(exc)}


def _get_source_health(params: dict) -> dict:
    """
    Devuelve el estado de salud de las fuentes de datos.
    Puede filtrar por dominio.
    """
    domain = params.get("domain")
    try:
        from dashboard.services.data_ops_core import cargar_estado_fuentes
        df = cargar_estado_fuentes(domain=domain, engine=_get_engine())
        if df.empty:
            return {"sources": [], "total": 0, "message": "No hay fuentes registradas"}

        records = _df_to_records(df, max_rows=30)
        status_col = df.get("status", None)
        return {
            "total": len(df),
            "healthy": int((df["status"] == "healthy").sum()) if "status" in df.columns else None,
            "degraded": int((df["status"] == "degraded").sum()) if "status" in df.columns else None,
            "down": int((df["status"] == "down").sum()) if "status" in df.columns else None,
            "domain_filter": domain,
            "sources": records,
        }
    except Exception as exc:
        logger.debug("_get_source_health: %s", exc)
        return {"sources": [], "error": str(exc)}


def _get_recent_pipeline_runs(params: dict) -> dict:
    """
    Devuelve las ejecuciones recientes de pipelines ETL.
    Parámetros: pipeline_id (str, opcional), limit (int, default 10).
    """
    pipeline_id = params.get("pipeline_id")
    limit = int(params.get("limit", 10))

    try:
        from dashboard.services.data_ops_core import cargar_pipeline_runs
        df = cargar_pipeline_runs(
            pipeline_id=pipeline_id,
            limit=limit,
            engine=_get_engine(),
        )
        if df.empty:
            return {"runs": [], "message": "No hay ejecuciones registradas"}

        records = _df_to_records(df, max_rows=limit)
        status_counts = {}
        if "status" in df.columns:
            status_counts = df["status"].value_counts().to_dict()

        return {
            "total_returned": len(df),
            "pipeline_filter": pipeline_id,
            "status_summary": status_counts,
            "runs": records,
        }
    except Exception as exc:
        logger.debug("_get_recent_pipeline_runs: %s", exc)
        return {"runs": [], "error": str(exc)}


def _get_data_quality_summary(params: dict) -> dict:
    """
    Devuelve el resumen de calidad de datos de las últimas 24h.
    Incluye desglose de checks pasados, fallidos, avisos y omitidos.
    """
    try:
        from dashboard.services.data_ops_core import (
            cargar_quality_summary,
            cargar_quality_results,
        )
        eng = _get_engine()
        summary = cargar_quality_summary(engine=eng)

        # Si hay fallos, incluir detalle de los primeros
        failed_details = []
        if summary.get("failed", 0) > 0:
            df_results = cargar_quality_results(limit=20, engine=eng)
            if not df_results.empty and "status" in df_results.columns:
                failed = df_results[df_results["status"] == "failed"]
                failed_details = _df_to_records(failed, max_rows=5)

        return {
            "total_checks": summary.get("total", 0),
            "passed": summary.get("passed", 0),
            "failed": summary.get("failed", 0),
            "warning": summary.get("warning", 0),
            "skipped": summary.get("skipped", 0),
            "pass_rate": summary.get("pass_rate", 1.0),
            "pass_pct": summary.get("pass_pct", 100.0),
            "failed_checks": failed_details,
        }
    except Exception as exc:
        logger.debug("_get_data_quality_summary: %s", exc)
        return {"pass_rate": 1.0, "error": str(exc)}


def _explain_data_lineage(params: dict) -> dict:
    """
    Explica el linaje de un objeto de datos: qué lo alimenta y qué deriva de él.
    Parámetros requeridos: object_type (str), object_id (str).
    """
    object_type = params.get("object_type", "table")
    object_id = params.get("object_id", "")

    if not object_id:
        return {"error": "Debes proporcionar object_id (ej: 'sondeos', 'pipeline_electoral_scraper')"}

    try:
        from dashboard.services.data_ops_core import cargar_lineage
        result = cargar_lineage(
            object_type=object_type,
            object_id=object_id,
            engine=_get_engine(),
        )

        upstream = result.get("upstream", [])
        downstream = result.get("downstream", [])

        # Generar descripción en texto
        lines = [
            f"Objeto: {object_type}:{object_id}",
            f"Fuentes upstream ({len(upstream)}):",
        ]
        for node in upstream[:5]:
            tid = f"{node.get('object_type')}:{node.get('object_id')}"
            tr = node.get("transformation", "")
            lines.append(f"  ← {tid}" + (f" [{tr}]" if tr else ""))

        lines.append(f"Derivados downstream ({len(downstream)}):")
        for node in downstream[:5]:
            tid = f"{node.get('object_type')}:{node.get('object_id')}"
            tr = node.get("transformation", "")
            lines.append(f"  → {tid}" + (f" [{tr}]" if tr else ""))

        return {
            "object_type": object_type,
            "object_id": object_id,
            "upstream_count": len(upstream),
            "downstream_count": len(downstream),
            "upstream": upstream[:10],
            "downstream": downstream[:10],
            "summary": "\n".join(lines),
        }
    except Exception as exc:
        logger.debug("_explain_data_lineage: %s", exc)
        return {"error": str(exc), "object_type": object_type, "object_id": object_id}


def _get_stale_modules(params: dict) -> dict:
    """
    Devuelve los módulos con datos desactualizados (degraded o down).
    Útil para diagnóstico rápido de problemas de frescura.
    """
    try:
        from dashboard.services.data_ops_core import cargar_modulos_freshness
        df = cargar_modulos_freshness(engine=_get_engine())

        if df.empty:
            return {"stale_modules": [], "message": "Sin datos de frescura disponibles"}

        if "status" not in df.columns:
            return {"stale_modules": [], "all_modules": _df_to_records(df)}

        stale = df[df["status"].isin(["degraded", "down"])]
        fresh = df[df["status"] == "healthy"]

        stale_records = _df_to_records(stale, max_rows=20)
        return {
            "total_modules": len(df),
            "fresh_count": len(fresh),
            "stale_count": len(stale),
            "stale_modules": stale_records,
            "has_issues": len(stale) > 0,
        }
    except Exception as exc:
        logger.debug("_get_stale_modules: %s", exc)
        return {"stale_modules": [], "error": str(exc)}


# ── Registro de tools ──────────────────────────────────────────────────────────

DATA_OPS_TOOLS = [
    {
        "name": "get_data_ops_status",
        "description": (
            "Devuelve el estado global del sistema de datos ETL: "
            "fuentes saludables/degradadas/caídas, pipelines ok/fallidos en 24h, "
            "módulos frescos y tasa de calidad. "
            "Úsalo para diagnóstico rápido de salud del sistema."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "function": _get_data_ops_status,
    },
    {
        "name": "get_source_health",
        "description": (
            "Devuelve el estado de salud de las fuentes de datos registradas. "
            "Puede filtrar por dominio (electoral, media, economic, etc.). "
            "Muestra status, lag de frescura y fallos consecutivos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "description": (
                        "Dominio a filtrar (electoral, media, economic, legislative, "
                        "geospatial, social, risk, institutional, internal). "
                        "Omite para ver todas."
                    ),
                },
            },
            "required": [],
        },
        "function": _get_source_health,
    },
    {
        "name": "get_recent_pipeline_runs",
        "description": (
            "Devuelve las ejecuciones recientes de pipelines ETL. "
            "Puedes filtrar por pipeline_id y limitar el número de resultados. "
            "Incluye estado, duración y registros procesados."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "pipeline_id": {
                    "type": "string",
                    "description": "ID del pipeline a filtrar. Omite para ver todos.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Número máximo de ejecuciones a devolver (default 10).",
                    "default": 10,
                },
            },
            "required": [],
        },
        "function": _get_recent_pipeline_runs,
    },
    {
        "name": "get_data_quality_summary",
        "description": (
            "Devuelve el resumen de calidad de datos de las últimas 24h: "
            "checks pasados, fallidos, avisos y omitidos. "
            "Si hay fallos, incluye detalle de los primeros checks fallidos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "function": _get_data_quality_summary,
    },
    {
        "name": "explain_data_lineage",
        "description": (
            "Explica el linaje de un objeto de datos: qué fuentes lo alimentan (upstream) "
            "y qué tablas o modelos derivan de él (downstream). "
            "Útil para entender el impacto de un fallo en cascada."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "object_type": {
                    "type": "string",
                    "description": "Tipo de objeto: table, source, pipeline, manifest, model.",
                    "enum": ["table", "source", "pipeline", "manifest", "model"],
                },
                "object_id": {
                    "type": "string",
                    "description": "ID del objeto (ej: 'sondeos', 'pipeline_electoral_scraper').",
                },
            },
            "required": ["object_type", "object_id"],
        },
        "function": _explain_data_lineage,
    },
    {
        "name": "get_stale_modules",
        "description": (
            "Devuelve los módulos del sistema con datos desactualizados "
            "(estado degraded o down). Ideal para diagnóstico de frescura "
            "y priorizar qué pipelines ejecutar primero."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "function": _get_stale_modules,
    },
]
