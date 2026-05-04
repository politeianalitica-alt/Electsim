"""
Health Monitor — Bloque 8.

Computa el estado de salud global del sistema de datos:
  - Fuentes saludables / degraded / down
  - Módulos con datos frescos
  - Pipelines fallidos en últimas 24h
  - Alertas operativas

Usa alertas_sistema existente. No duplica nada.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def compute_global_data_health(engine: Any = None) -> dict:
    """
    Computa el estado de salud global del sistema de datos.

    Returns:
        Dict con: sources_healthy, sources_degraded, sources_down,
        pipelines_ok, pipelines_failed, modules_fresh, modules_stale,
        quality_pass_rate, total_alerts.
    """
    health = {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "sources_healthy": 0,
        "sources_degraded": 0,
        "sources_down": 0,
        "sources_unknown": 0,
        "pipelines_ok_24h": 0,
        "pipelines_failed_24h": 0,
        "modules_fresh": 0,
        "modules_stale": 0,
        "modules_unknown": 0,
        "quality_pass_rate": 1.0,
        "total_alerts": 0,
        "overall_status": "unknown",
    }

    # Fuentes
    try:
        from etl.operations.source_registry import list_sources
        from etl.operations.freshness import compute_source_freshness

        sources = list_sources(active_only=True, engine=engine)
        for src in sources:
            sh = compute_source_freshness(src.source_id, engine)
            if sh.status == "healthy":
                health["sources_healthy"] += 1
            elif sh.status == "degraded":
                health["sources_degraded"] += 1
            elif sh.status == "down":
                health["sources_down"] += 1
            else:
                health["sources_unknown"] += 1
    except Exception as exc:
        logger.debug("compute_global_data_health sources: %s", exc)

    # Pipelines 24h
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT
                        COUNT(CASE WHEN status = 'success' THEN 1 END) AS ok,
                        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
                    FROM pipeline_runs
                    WHERE started_at > NOW() - INTERVAL '24 hours'
                """)).fetchone()
            if row:
                health["pipelines_ok_24h"] = int(row[0] or 0)
                health["pipelines_failed_24h"] = int(row[1] or 0)
        except Exception as exc:
            logger.debug("compute_global_data_health pipelines: %s", exc)

    # Módulos freshness
    try:
        from etl.operations.freshness import compute_all_freshness, _table_to_module
        freshness_data = compute_all_freshness(engine)
        seen_modules = set()
        for item in freshness_data:
            module = item.get("module", "unknown")
            if module in seen_modules:
                continue
            seen_modules.add(module)
            status = item.get("status", "unknown")
            if status == "healthy":
                health["modules_fresh"] += 1
            elif status in ("degraded", "down"):
                health["modules_stale"] += 1
            else:
                health["modules_unknown"] += 1
    except Exception as exc:
        logger.debug("compute_global_data_health freshness: %s", exc)

    # Quality pass rate
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT
                        COUNT(CASE WHEN status = 'passed' THEN 1 END) AS passed,
                        COUNT(CASE WHEN status IN ('failed', 'warning') THEN 1 END) AS failed
                    FROM data_quality_results
                    WHERE checked_at > NOW() - INTERVAL '24 hours'
                """)).fetchone()
            if row and (row[0] or 0) + (row[1] or 0) > 0:
                total = (row[0] or 0) + (row[1] or 0)
                health["quality_pass_rate"] = round((row[0] or 0) / total, 4)
        except Exception as exc:
            logger.debug("compute_global_data_health quality: %s", exc)

    # Alertas pendientes
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                count = conn.execute(sa_text("""
                    SELECT COUNT(*) FROM alertas_sistema
                    WHERE activa = TRUE
                      AND severidad IN ('CRÍTICO', 'ADVERTENCIA')
                """)).scalar() or 0
            health["total_alerts"] = int(count)
        except Exception as exc:
            logger.debug("compute_global_data_health alerts: %s", exc)

    # Estado global
    if health["sources_down"] > 0 or health["pipelines_failed_24h"] > 3:
        health["overall_status"] = "degraded"
    elif health["sources_degraded"] > 0 or health["modules_stale"] > 0:
        health["overall_status"] = "warning"
    elif health["sources_healthy"] > 0 or health["modules_fresh"] > 0:
        health["overall_status"] = "healthy"

    return health


def detect_failed_sources(engine: Any = None) -> list[str]:
    """Devuelve IDs de fuentes con status 'down'."""
    if engine is None:
        return []
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            rows = conn.execute(sa_text("""
                SELECT DISTINCT source_id
                FROM source_health
                WHERE status = 'down'
                  AND checked_at > NOW() - INTERVAL '24 hours'
                ORDER BY source_id
            """)).fetchall()
        return [r[0] for r in rows]
    except Exception as exc:
        logger.debug("detect_failed_sources: %s", exc)
        return []


def detect_stale_sources(engine: Any = None) -> list[dict]:
    """Devuelve fuentes con datos desactualizados."""
    try:
        from etl.operations.source_registry import list_sources
        from etl.operations.freshness import compute_source_freshness

        sources = list_sources(active_only=True, engine=engine)
        stale = []
        for src in sources:
            sh = compute_source_freshness(src.source_id, engine)
            if sh.status in ("degraded", "down"):
                stale.append({
                    "source_id": src.source_id,
                    "name": src.name,
                    "status": sh.status,
                    "freshness_lag_minutes": sh.freshness_lag_minutes,
                    "expected_minutes": src.expected_latency_minutes,
                })
        return stale
    except Exception as exc:
        logger.debug("detect_stale_sources: %s", exc)
        return []


def create_data_ops_alerts(engine: Any = None) -> list[dict]:
    """
    Crea alertas operativas basadas en el estado del sistema.

    Returns:
        Lista de alertas creadas en alertas_sistema.
    """
    alerts_created = []

    # Verificar fuentes caídas
    try:
        failed_sources = detect_failed_sources(engine)
        for src_id in failed_sources:
            _create_alert(
                tipo="data_source_down",
                severidad="CRÍTICO",
                titulo=f"Fuente caída: {src_id}",
                descripcion=f"La fuente '{src_id}' no ha tenido éxito en las últimas 24 horas.",
                datos={
                    "pagina_relevante": "operaciones",
                    "source_id": src_id,
                },
                engine=engine,
            )
            alerts_created.append({"type": "data_source_down", "source_id": src_id})
    except Exception as exc:
        logger.debug("create_data_ops_alerts sources: %s", exc)

    # Verificar fuentes degradadas
    try:
        stale = detect_stale_sources(engine)
        for item in stale[:5]:  # Máximo 5 alertas de degradación
            if item["status"] == "degraded":
                _create_alert(
                    tipo="data_source_degraded",
                    severidad="ADVERTENCIA",
                    titulo=f"Fuente degradada: {item['source_id']}",
                    descripcion=(
                        f"'{item['name']}' supera el doble del retraso esperado "
                        f"(lag={item.get('freshness_lag_minutes', '?')} min, "
                        f"expected={item.get('expected_minutes', '?')} min)."
                    ),
                    datos={
                        "pagina_relevante": "operaciones",
                        "source_id": item["source_id"],
                        "freshness_lag_minutes": item.get("freshness_lag_minutes"),
                    },
                    engine=engine,
                )
                alerts_created.append({"type": "data_source_degraded", "source_id": item["source_id"]})
    except Exception as exc:
        logger.debug("create_data_ops_alerts stale: %s", exc)

    # Pipelines fallidos
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT pipeline_id, COUNT(*) AS n
                    FROM pipeline_runs
                    WHERE status = 'failed'
                      AND started_at > NOW() - INTERVAL '24 hours'
                    GROUP BY pipeline_id
                    HAVING COUNT(*) >= 2
                """)).fetchall()

            for row in rows:
                _create_alert(
                    tipo="pipeline_failed",
                    severidad="ADVERTENCIA",
                    titulo=f"Pipeline fallido: {row[0]}",
                    descripcion=f"El pipeline '{row[0]}' ha fallado {row[1]} veces en 24 horas.",
                    datos={
                        "pagina_relevante": "command_center",
                        "pipeline_id": row[0],
                        "failures_24h": row[1],
                    },
                    engine=engine,
                )
                alerts_created.append({"type": "pipeline_failed", "pipeline_id": row[0]})
        except Exception as exc:
            logger.debug("create_data_ops_alerts pipelines: %s", exc)

    logger.info("create_data_ops_alerts: %d alertas creadas", len(alerts_created))
    return alerts_created


def _create_alert(
    tipo: str,
    severidad: str,
    titulo: str,
    descripcion: str,
    datos: dict,
    engine: Any = None,
) -> None:
    """Crea una alerta en alertas_sistema."""
    if engine is None:
        logger.warning("DATA_OPS_ALERT [%s]: %s", severidad, titulo)
        return

    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            # Evitar duplicar alertas del mismo tipo y source en 24h
            existing = conn.execute(sa_text("""
                SELECT COUNT(*) FROM alertas_sistema
                WHERE tipo = :tipo
                  AND datos->>'source_id' = :source_id
                  AND created_at > NOW() - INTERVAL '24 hours'
            """), {
                "tipo": tipo,
                "source_id": datos.get("source_id", ""),
            }).scalar() or 0

            if existing > 0:
                return

            conn.execute(sa_text("""
                INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, datos, activa)
                VALUES (:tipo, :severidad, :titulo, :descripcion, :datos::jsonb, TRUE)
            """), {
                "tipo": tipo,
                "severidad": severidad,
                "titulo": titulo,
                "descripcion": descripcion,
                "datos": json.dumps(datos),
            })
    except Exception as exc:
        logger.debug("_create_alert: %s", exc)


def compute_domain_health(domain: str, engine: Any = None) -> dict:
    """
    Computa el estado de salud de un dominio específico.

    Returns:
        Dict con fuentes, freshness, pipelines y estado global del dominio.
    """
    try:
        from etl.operations.source_registry import list_sources
        from etl.operations.freshness import compute_source_freshness

        sources = list_sources(domain=domain, active_only=True, engine=engine)
        source_statuses = []
        for src in sources:
            sh = compute_source_freshness(src.source_id, engine)
            source_statuses.append({
                "source_id": src.source_id,
                "name": src.name,
                "status": sh.status,
                "last_success_at": str(sh.last_success_at) if sh.last_success_at else None,
                "freshness_lag_minutes": sh.freshness_lag_minutes,
            })

        worst_status = "healthy"
        status_order = {"down": 0, "degraded": 1, "unknown": 2, "healthy": 3}
        for s in source_statuses:
            if status_order.get(s["status"], 2) < status_order.get(worst_status, 3):
                worst_status = s["status"]

        return {
            "domain": domain,
            "overall_status": worst_status,
            "sources": source_statuses,
            "sources_total": len(sources),
            "sources_healthy": sum(1 for s in source_statuses if s["status"] == "healthy"),
        }

    except Exception as exc:
        logger.debug("compute_domain_health %s: %s", domain, exc)
        return {"domain": domain, "overall_status": "unknown", "sources": []}
