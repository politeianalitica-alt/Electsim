"""
Newsletter Builder — Bloque 16.

Construye newsletters, digests y actualizaciones para clientes.
"""
from __future__ import annotations

import logging
from datetime import datetime, date
from typing import Any

from communications.schemas import ContentAsset

logger = logging.getLogger(__name__)


def build_newsletter(
    title: str,
    sections: list[dict[str, Any]],
    distribution_list_id: str | None = None,
    tenant_id: str = "default",
) -> ContentAsset:
    """Construye una newsletter genérica con secciones."""
    body_parts = [f"# {title}\n\n*{date.today().strftime('%d de %B de %Y')}*\n"]
    for s in sections:
        heading = s.get("heading", "Sección")
        content = s.get("content", "")
        body_parts.append(f"## {heading}\n\n{content}\n")
    body = "\n".join(body_parts)

    return ContentAsset(
        title=title,
        asset_type="newsletter",
        body_markdown=body,
        short_copy=f"Newsletter: {title}",
        tenant_id=tenant_id,
        raw_payload={"distribution_list_id": distribution_list_id} if distribution_list_id else {},
    )


def build_weekly_intelligence_digest(
    modules: list[str] | None = None,
    tenant_id: str = "default",
) -> ContentAsset:
    """Construye el digest semanal de inteligencia."""
    modules = modules or ["legislative", "media", "economic", "geopolitics"]
    week_str = datetime.utcnow().strftime("semana del %d/%m/%Y")
    sections_data: list[dict[str, Any]] = []

    for mod in modules:
        content = _load_module_summary(mod, tenant_id)
        if content:
            sections_data.append({"heading": _module_label(mod), "content": content})

    if not sections_data:
        sections_data = [{"heading": "Sin señales esta semana",
                          "content": "No se han detectado señales relevantes en los módulos seleccionados."}]

    sections = [
        {"heading": "Resumen ejecutivo", "content": _build_executive_summary(sections_data)},
        *sections_data,
        {"heading": "Qué mirar la próxima semana", "content": "• Continuar seguimiento de señales activas.\n• Revisar calendario editorial."},
        {"heading": "Fuentes", "content": "ElectSim Intelligence Platform — datos propios y fuentes abiertas."},
    ]

    return build_newsletter(
        title=f"Intelligence Digest — {week_str}",
        sections=sections,
        tenant_id=tenant_id,
    )


def build_client_update(
    client_id: str,
    topics: list[str],
    tenant_id: str = "default",
) -> ContentAsset:
    """Construye una actualización personalizada para un cliente."""
    today = date.today().strftime("%d/%m/%Y")
    sections = [
        {"heading": "Resumen ejecutivo", "content": f"Actualización para cliente `{client_id}` sobre: {', '.join(topics)}."},
    ]
    for topic in topics:
        sections.append({"heading": topic.capitalize(), "content": f"Sin señales específicas disponibles para {topic} en este periodo."})
    sections.append({"heading": "Próximos pasos", "content": "• Revisar con el equipo las señales identificadas.\n• Agendar seguimiento."})

    return build_newsletter(
        title=f"Actualización cliente — {today}",
        sections=sections,
        tenant_id=tenant_id,
    )


def _load_module_summary(module: str, tenant_id: str) -> str:
    """Intenta cargar un resumen del módulo correspondiente."""
    try:
        if module == "legislative":
            from dashboard.services.legislativo import cargar_alertas_legislativas
            alerts = cargar_alertas_legislativas(limit=3)
            if hasattr(alerts, "__len__") and len(alerts) > 0:
                return f"• {len(alerts)} alertas legislativas activas."
        elif module == "media":
            from dashboard.services.media_core import cargar_narrativas
            n = cargar_narrativas(limit=3)
            if hasattr(n, "__len__") and len(n) > 0:
                return f"• {len(n)} narrativas monitorizadas."
        elif module == "geopolitics":
            from dashboard.services.geopolitics_core import cargar_alertas_geopoliticas
            alerts = cargar_alertas_geopoliticas(limit=3)
            if hasattr(alerts, "__len__") and len(alerts) > 0:
                return f"• {len(alerts)} alertas geopolíticas activas."
    except Exception as exc:
        logger.debug("_load_module_summary %s: %s", module, exc)
    return ""


def _module_label(module: str) -> str:
    return {"legislative": "Legislativo", "media": "Medios & Narrativa",
            "economic": "Economía", "geopolitics": "Geopolítica"}.get(module, module.capitalize())


def _build_executive_summary(sections: list[dict[str, Any]]) -> str:
    parts = [f"• {s['heading']}: {s['content'][:100]}…" for s in sections[:4] if s.get("content")]
    return "\n".join(parts) if parts else "Semana sin señales relevantes."
