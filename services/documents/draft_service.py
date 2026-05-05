"""
Draft Service — Bloque 9.

Gestión de borradores de informes:
  create_draft_report, add_section, attach_source_object,
  generate_report_from_briefing, get_report.

Los informes pueden generarse desde briefings existentes,
enriquecidos con evidencias documentales.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Caché en memoria para informes sin BD
_REPORT_CACHE: dict[str, Any] = {}


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


def create_draft_report(
    title: str,
    report_type: str,
    client_id: str | None = None,
    created_by: str | None = None,
    tenant_id: str = "default",
    engine: Any | None = None,
) -> "DraftReport":
    """
    Crea un nuevo borrador de informe.

    Args:
        title: Título del informe.
        report_type: Tipo (daily_briefing, client_report, etc.)
        client_id: ID del cliente (opcional).
        created_by: Usuario/sistema que crea el informe.
        tenant_id: Tenant.
        engine: SQLAlchemy engine.

    Returns:
        DraftReport creado.
    """
    from etl.sources.documents.schemas import DraftReport
    eng = engine or _get_engine()
    now = datetime.now(timezone.utc)

    # Validar tipo
    valid_types = {
        "daily_briefing", "client_report", "legislative_note",
        "media_analysis", "risk_profile", "electoral_report", "custom",
    }
    if report_type not in valid_types:
        report_type = "custom"

    report = DraftReport(
        title=title,
        report_type=report_type,
        client_id=client_id,
        created_by=created_by,
        tenant_id=tenant_id,
        created_at=now,
        updated_at=now,
    )

    _REPORT_CACHE[report.report_id] = report

    # Persistir en BD
    if eng is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with eng.begin() as conn:
                conn.execute(sa_text("""
                    INSERT INTO draft_reports (
                        report_id, title, report_type, client_id, tenant_id,
                        status, sections, evidence_ids, source_objects,
                        created_by, created_at, updated_at
                    ) VALUES (
                        :report_id, :title, :report_type, :client_id, :tenant_id,
                        'draft', :sections::jsonb, :evidence_ids, :source_objects::jsonb,
                        :created_by, :created_at, :updated_at
                    )
                    ON CONFLICT (report_id) DO NOTHING
                """), {
                    "report_id": report.report_id,
                    "title": report.title,
                    "report_type": report.report_type,
                    "client_id": report.client_id,
                    "tenant_id": report.tenant_id,
                    "sections": json.dumps(report.sections),
                    "evidence_ids": report.evidence_ids,
                    "source_objects": json.dumps(report.source_objects),
                    "created_by": report.created_by,
                    "created_at": report.created_at,
                    "updated_at": report.updated_at,
                })
        except Exception as exc:
            logger.debug("create_draft_report DB: %s", exc)

    logger.info("create_draft_report: %s (%s)", report.report_id, report_type)
    return report


def add_section(
    report_id: str,
    title: str,
    body_markdown: str,
    evidence_ids: list[str] | None = None,
    engine: Any | None = None,
) -> None:
    """
    Añade una sección a un borrador de informe.

    Args:
        report_id: ID del informe.
        title: Título de la sección.
        body_markdown: Contenido en Markdown.
        evidence_ids: IDs de evidencias asociadas.
        engine: SQLAlchemy engine.
    """
    eng = engine or _get_engine()
    section = {
        "title": title,
        "body_markdown": body_markdown,
        "evidence_ids": evidence_ids or [],
        "added_at": datetime.now(timezone.utc).isoformat(),
    }

    # Actualizar caché
    if report_id in _REPORT_CACHE:
        report = _REPORT_CACHE[report_id]
        updated_sections = list(report.sections) + [section]
        _REPORT_CACHE[report_id] = report.model_copy(update={
            "sections": updated_sections,
            "updated_at": datetime.now(timezone.utc),
        })

    # Actualizar BD
    if eng is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with eng.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE draft_reports
                    SET sections = sections || :section::jsonb,
                        updated_at = NOW()
                    WHERE report_id = :report_id
                """), {
                    "report_id": report_id,
                    "section": json.dumps(section),
                })
        except Exception as exc:
            logger.debug("add_section: %s", exc)


def attach_source_object(
    report_id: str,
    object_type: str,
    object_id: str,
    engine: Any | None = None,
) -> None:
    """
    Adjunta un objeto de datos (actor, norma, alerta) a un informe.
    """
    eng = engine or _get_engine()
    obj = {"type": object_type, "id": object_id}

    if report_id in _REPORT_CACHE:
        report = _REPORT_CACHE[report_id]
        updated = list(report.source_objects) + [obj]
        _REPORT_CACHE[report_id] = report.model_copy(update={
            "source_objects": updated,
            "updated_at": datetime.now(timezone.utc),
        })

    if eng is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with eng.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE draft_reports
                    SET source_objects = source_objects || :obj::jsonb,
                        updated_at = NOW()
                    WHERE report_id = :report_id
                """), {"report_id": report_id, "obj": json.dumps(obj)})
        except Exception as exc:
            logger.debug("attach_source_object: %s", exc)


def generate_report_from_briefing(
    briefing_id: str,
    report_type: str = "daily_briefing",
    engine: Any | None = None,
) -> "DraftReport":
    """
    Genera un borrador de informe a partir de un briefing existente.

    Recupera el briefing, extrae secciones y crea un DraftReport.
    """
    eng = engine or _get_engine()

    # Intentar recuperar el briefing del sistema
    briefing_data = _load_briefing(briefing_id, eng)

    title = briefing_data.get("titulo") or f"Informe {briefing_id}"
    report = create_draft_report(
        title=title,
        report_type=report_type,
        engine=eng,
    )

    # Añadir secciones del briefing
    sections_map = {
        "resumen_ejecutivo": "Resumen Ejecutivo",
        "señales_clave": "Señales Clave",
        "narrativas": "Análisis Narrativo",
        "eventos_parlamentarios": "Agenda Parlamentaria",
        "riesgo": "Evaluación de Riesgo",
        "agenda": "Agenda Estratégica",
        "recomendaciones": "Recomendaciones",
    }

    for key, section_title in sections_map.items():
        content = briefing_data.get(key, "")
        if content:
            add_section(report.report_id, section_title, str(content), engine=eng)

    # Adjuntar briefing como objeto fuente
    attach_source_object(report.report_id, "briefing", briefing_id, engine=eng)

    # Recuperar evidencias del briefing si existen
    evidence_ids = briefing_data.get("evidence_ids", [])
    if evidence_ids:
        try:
            from etl.sources.documents.evidence_store import attach_evidence_to_report
            attach_evidence_to_report(report.report_id, evidence_ids, engine=eng)
        except Exception:
            pass

    logger.info("generate_report_from_briefing: report=%s from briefing=%s",
                report.report_id, briefing_id)
    return report


def get_report(
    report_id: str,
    engine: Any | None = None,
) -> "DraftReport | None":
    """Recupera un DraftReport por ID."""
    from etl.sources.documents.schemas import DraftReport
    eng = engine or _get_engine()

    if report_id in _REPORT_CACHE:
        return _REPORT_CACHE[report_id]

    if eng is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with eng.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT report_id, title, report_type, client_id, tenant_id,
                           status, sections, evidence_ids, source_objects,
                           created_by, created_at, updated_at
                    FROM draft_reports
                    WHERE report_id = :id
                """), {"id": report_id}).fetchone()

            if row:
                report = DraftReport(
                    report_id=row[0], title=row[1], report_type=row[2],
                    client_id=row[3], tenant_id=row[4] or "default",
                    status=row[5] or "draft",
                    sections=json.loads(row[6]) if row[6] else [],
                    evidence_ids=list(row[7]) if row[7] else [],
                    source_objects=json.loads(row[8]) if row[8] else [],
                    created_by=row[9],
                    created_at=row[10], updated_at=row[11],
                )
                _REPORT_CACHE[report_id] = report
                return report
        except Exception as exc:
            logger.debug("get_report DB: %s", exc)

    return None


def list_reports(
    report_type: str | None = None,
    status: str | None = None,
    limit: int = 20,
    engine: Any | None = None,
) -> list:
    """Lista borradores de informes."""
    eng = engine or _get_engine()

    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            with eng.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT report_id, title, report_type, client_id,
                           status, created_at, updated_at
                    FROM draft_reports
                    WHERE (:report_type IS NULL OR report_type = :report_type)
                      AND (:status IS NULL OR status = :status)
                    ORDER BY created_at DESC
                    LIMIT :limit
                """), {
                    "report_type": report_type,
                    "status": status,
                    "limit": limit,
                }).fetchall()
            return rows
        except Exception as exc:
            logger.debug("list_reports DB: %s", exc)

    return list(_REPORT_CACHE.values())[:limit]


def _load_briefing(briefing_id: str, engine: Any) -> dict:
    """Intenta cargar un briefing del sistema."""
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            import json
            with engine.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT titulo, resumen_ejecutivo, senales_clave,
                           narrativas, eventos_parlamentarios
                    FROM briefings
                    WHERE briefing_id = :id
                    LIMIT 1
                """), {"id": briefing_id}).fetchone()
            if row:
                return {
                    "titulo": row[0],
                    "resumen_ejecutivo": row[1],
                    "señales_clave": row[2],
                    "narrativas": row[3],
                    "eventos_parlamentarios": row[4],
                }
        except Exception:
            pass

    return {"titulo": f"Briefing {briefing_id}"}
