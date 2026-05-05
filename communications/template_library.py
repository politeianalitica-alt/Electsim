"""
Template Library — Bloque 16.

10 plantillas de contenido reutilizables con soporte Jinja2 y fallback texto plano.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

TEMPLATES: dict[str, dict[str, Any]] = {
    "policy_explainer_linkedin": {
        "name": "Explicador de política — LinkedIn",
        "asset_type": "linkedin_post",
        "channel_type": "linkedin",
        "tone": "analytical",
        "body": (
            "**{title}**\n\n"
            "{lead}\n\n"
            "📌 Lo que cambia:\n{changes}\n\n"
            "🏢 A quién afecta:\n{affected}\n\n"
            "📊 Datos clave:\n{data_points}\n\n"
            "💡 Implicación estratégica: {implication}\n\n"
            "#política #regulación #análisis"
        ),
        "required_vars": ["title", "lead", "changes", "affected", "data_points", "implication"],
    },
    "data_insight_tweet": {
        "name": "Dato insight — X/Twitter",
        "asset_type": "tweet",
        "channel_type": "twitter_x",
        "tone": "accessible",
        "body": "🔍 {insight}\n\n📊 {data}\n\nFuente: {source}",
        "required_vars": ["insight", "data", "source"],
    },
    "crisis_response_statement": {
        "name": "Declaración de crisis",
        "asset_type": "press_note",
        "channel_type": "press_release",
        "tone": "institutional",
        "body": (
            "**DECLARACIÓN — {organization}**\n\n"
            "En relación con {issue}:\n\n"
            "{position}\n\n"
            "**Datos que respaldan esta posición:**\n{evidence}\n\n"
            "**Nuestra postura:**\n{stance}\n\n"
            "Para más información: {contact}"
        ),
        "required_vars": ["organization", "issue", "position", "evidence", "stance", "contact"],
    },
    "stakeholder_update_email": {
        "name": "Actualización a stakeholder — Email",
        "asset_type": "email",
        "channel_type": "email",
        "tone": "institutional",
        "body": (
            "Estimado/a {name},\n\n"
            "Le informamos de las últimas novedades relacionadas con {topic}:\n\n"
            "{summary}\n\n"
            "**Puntos clave:**\n{key_points}\n\n"
            "**Próximas acciones:**\n{next_steps}\n\n"
            "Quedamos a su disposición para cualquier consulta.\n\n"
            "Un cordial saludo,\n{sender}"
        ),
        "required_vars": ["name", "topic", "summary", "key_points", "next_steps", "sender"],
    },
    "weekly_intelligence_newsletter": {
        "name": "Newsletter semanal de inteligencia",
        "asset_type": "newsletter",
        "channel_type": "newsletter",
        "tone": "analytical",
        "body": (
            "# {title}\n\n"
            "**Semana del {week}**\n\n"
            "## Resumen ejecutivo\n{executive_summary}\n\n"
            "## 3 señales clave\n{signals}\n\n"
            "## Qué cambia\n{changes}\n\n"
            "## A quién afecta\n{affected}\n\n"
            "## Qué mirar esta semana\n{watchlist}\n\n"
            "## Fuentes\n{sources}\n\n"
            "## Acción recomendada\n{action}"
        ),
        "required_vars": ["title", "week", "executive_summary", "signals", "changes",
                          "affected", "watchlist", "sources", "action"],
    },
    "campaign_talking_points": {
        "name": "Argumentario de campaña",
        "asset_type": "talking_points",
        "channel_type": "internal_memo",
        "tone": "campaign",
        "body": (
            "# ARGUMENTARIO — {topic}\n\n"
            "**Mensaje principal:**\n{core_message}\n\n"
            "**3 argumentos clave:**\n{arguments}\n\n"
            "**Datos de respaldo:**\n{data}\n\n"
            "**Respuesta a críticas:**\n{rebuttals}\n\n"
            "**Lo que NO decir:**\n{avoid}\n\n"
            "**Cierre:**\n{closing}"
        ),
        "required_vars": ["topic", "core_message", "arguments", "data", "rebuttals", "avoid", "closing"],
    },
    "briefing_summary": {
        "name": "Resumen ejecutivo de briefing",
        "asset_type": "briefing",
        "channel_type": "briefing",
        "tone": "analytical",
        "body": (
            "# {title}\n\n"
            "**Fecha:** {date} | **Clasificación:** {classification}\n\n"
            "## Situación\n{situation}\n\n"
            "## Puntos clave\n{key_points}\n\n"
            "## Implicaciones\n{implications}\n\n"
            "## Acción recomendada\n{action}\n\n"
            "---\n*Fuentes: {sources}*"
        ),
        "required_vars": ["title", "date", "classification", "situation",
                          "key_points", "implications", "action", "sources"],
    },
    "meeting_followup_email": {
        "name": "Email de seguimiento de reunión",
        "asset_type": "email",
        "channel_type": "email",
        "tone": "institutional",
        "body": (
            "Estimado/a {name},\n\n"
            "Gracias por nuestra reunión del {date}.\n\n"
            "**Resumen de lo tratado:**\n{summary}\n\n"
            "**Acuerdos alcanzados:**\n{agreements}\n\n"
            "**Próximos pasos:**\n{next_steps}\n\n"
            "Quedo a su disposición.\n\n"
            "Un cordial saludo,\n{sender}"
        ),
        "required_vars": ["name", "date", "summary", "agreements", "next_steps", "sender"],
    },
    "press_note": {
        "name": "Nota de prensa",
        "asset_type": "press_note",
        "channel_type": "press_release",
        "tone": "institutional",
        "body": (
            "**NOTA DE PRENSA**\n\n"
            "**{title}**\n\n"
            "{city}, {date} — {lead}\n\n"
            "{body}\n\n"
            "**Cita:**\n\"{quote}\" — {quote_author}\n\n"
            "**Datos relevantes:**\n{data}\n\n"
            "---\n**Contacto de prensa:** {press_contact}"
        ),
        "required_vars": ["title", "city", "date", "lead", "body", "quote",
                          "quote_author", "data", "press_contact"],
    },
    "qna_pack": {
        "name": "Pack Q&A para portavoz",
        "asset_type": "qa",
        "channel_type": "internal_memo",
        "tone": "institutional",
        "body": (
            "# Q&A — {topic}\n\n"
            "**Uso:** Exclusivo interno — portavoces y comunicación\n\n"
            "{qa_pairs}\n\n"
            "---\n*Actualizado: {date} | Fuentes: {sources}*"
        ),
        "required_vars": ["topic", "qa_pairs", "date", "sources"],
    },
}


def get_template(template_id: str) -> dict[str, Any] | None:
    return TEMPLATES.get(template_id)


def list_templates(asset_type: str | None = None) -> list[dict[str, Any]]:
    result = []
    for tid, t in TEMPLATES.items():
        if asset_type and t.get("asset_type") != asset_type:
            continue
        result.append({"template_id": tid, **t})
    return result


def render_template(template_id: str, context: dict[str, Any]) -> str:
    """Renderiza una plantilla con el contexto dado."""
    tmpl = TEMPLATES.get(template_id)
    if not tmpl:
        return f"[Template '{template_id}' no encontrado]"
    body = tmpl.get("body", "")
    try:
        # Las plantillas usan {variable} — str.format_map con default para claves faltantes
        class SafeDict(dict):
            def __missing__(self, key: str) -> str:
                return f"[{key}]"
        return body.format_map(SafeDict(context))
    except Exception as exc:
        logger.debug("render_template error: %s", exc)
        return body
