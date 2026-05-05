"""
Comms Brain Tools — Bloque 16.

8 herramientas para que el Brain LLM actúe como copiloto de comunicación.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

COMMS_TOOLS: list[dict] = []


def _register(name: str, description: str, parameters: dict):
    def decorator(fn):
        COMMS_TOOLS.append({
            "name": name,
            "description": description,
            "input_schema": {"type": "object", "properties": parameters, "required": []},
            "function": fn,
        })
        return fn
    return decorator


@_register(
    "generate_linkedin_post",
    "Genera un post de LinkedIn a partir de un marco de mensaje o un tema dado.",
    {
        "frame_id": {"type": "string", "description": "ID del MessageFrame existente"},
        "topic": {"type": "string", "description": "Tema para crear un marco nuevo si no hay frame_id"},
        "core_claim": {"type": "string", "description": "Afirmación central del mensaje"},
        "tenant_id": {"type": "string"},
    },
)
def generate_linkedin_post(
    frame_id: str | None = None,
    topic: str | None = None,
    core_claim: str | None = None,
    tenant_id: str = "default",
) -> dict:
    try:
        from communications.message_studio import create_message_frame, _FRAMES
        from communications.social_post_builder import build_linkedin_post
        if frame_id and frame_id in _FRAMES:
            frame = _FRAMES[frame_id]
        elif topic:
            frame = create_message_frame(
                title=topic,
                core_claim=core_claim or topic,
                tenant_id=tenant_id,
            )
        else:
            return {"error": "Se requiere frame_id o topic"}
        asset = build_linkedin_post(frame)
        return {"asset_id": asset.asset_id, "title": asset.title,
                "body": asset.body_markdown, "status": asset.status}
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "generate_twitter_thread",
    "Genera un hilo de X/Twitter a partir de un marco de mensaje o tema.",
    {
        "frame_id": {"type": "string", "description": "ID del MessageFrame existente"},
        "topic": {"type": "string", "description": "Tema para crear un marco nuevo"},
        "core_claim": {"type": "string"},
        "max_tweets": {"type": "integer", "description": "Máximo de tweets (default 6)"},
        "tenant_id": {"type": "string"},
    },
)
def generate_twitter_thread(
    frame_id: str | None = None,
    topic: str | None = None,
    core_claim: str | None = None,
    max_tweets: int = 6,
    tenant_id: str = "default",
) -> dict:
    try:
        from communications.message_studio import create_message_frame, _FRAMES
        from communications.social_post_builder import build_thread
        if frame_id and frame_id in _FRAMES:
            frame = _FRAMES[frame_id]
        elif topic:
            frame = create_message_frame(title=topic, core_claim=core_claim or topic, tenant_id=tenant_id)
        else:
            return {"error": "Se requiere frame_id o topic"}
        assets = build_thread(frame, max_tweets=max_tweets)
        return {
            "tweets": [{"n": i + 1, "body": a.body_markdown} for i, a in enumerate(assets)],
            "count": len(assets),
            "frame_id": frame.frame_id,
        }
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "generate_newsletter",
    "Genera una newsletter de inteligencia semanal o actualización para cliente.",
    {
        "topic": {"type": "string", "description": "Tema o tipo: 'weekly_digest' o tema específico"},
        "audience": {"type": "string", "description": "Audiencia objetivo"},
        "tenant_id": {"type": "string"},
    },
)
def generate_newsletter(
    topic: str = "weekly_digest",
    audience: str | None = None,
    tenant_id: str = "default",
) -> dict:
    try:
        from communications.newsletter_builder import (
            build_weekly_intelligence_digest, build_client_update,
        )
        if topic == "weekly_digest":
            asset = build_weekly_intelligence_digest(tenant_id=tenant_id)
        else:
            asset = build_client_update(client_id=audience or "default", topics=[topic], tenant_id=tenant_id)
        return {"asset_id": asset.asset_id, "title": asset.title,
                "preview": asset.body_markdown[:500]}
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "generate_qna_pack",
    "Genera un pack Q&A para portavoz sobre un tema dado.",
    {
        "topic": {"type": "string", "description": "Tema del Q&A"},
        "questions": {"type": "array", "items": {"type": "string"}, "description": "Preguntas probables"},
        "tenant_id": {"type": "string"},
    },
)
def generate_qna_pack(
    topic: str = "",
    questions: list[str] | None = None,
    tenant_id: str = "default",
) -> dict:
    try:
        from communications.press_note_builder import build_qna_pack
        if not topic:
            return {"error": "Se requiere un tema"}
        default_questions = questions or [
            f"¿Cuál es la posición sobre {topic}?",
            f"¿Qué datos respaldan esta postura sobre {topic}?",
            f"¿Cómo responden a las críticas sobre {topic}?",
        ]
        asset = build_qna_pack(topic=topic, likely_questions=default_questions, tenant_id=tenant_id)
        return {"asset_id": asset.asset_id, "title": asset.title,
                "body": asset.body_markdown}
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "recommend_content_for_alert",
    "Recomienda qué tipos de contenido producir para responder a una alerta activa.",
    {
        "alert_id": {"type": "string", "description": "ID de la alerta"},
        "tenant_id": {"type": "string"},
    },
)
def recommend_content_for_alert(alert_id: str = "", tenant_id: str = "default") -> dict:
    try:
        from communications.comms_recommender import recommend_content_for_alert as _rec
        if not alert_id:
            return {"error": "Se requiere alert_id"}
        recs = _rec(alert_id=alert_id, tenant_id=tenant_id)
        return {"recommendations": recs, "count": len(recs)}
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "get_editorial_calendar",
    "Muestra el calendario editorial para los próximos días.",
    {
        "days": {"type": "integer", "description": "Horizonte en días (default 14)"},
        "tenant_id": {"type": "string"},
    },
)
def get_editorial_calendar(days: int = 14, tenant_id: str = "default") -> dict:
    try:
        from communications.content_calendar import get_calendar_items
        items = get_calendar_items(tenant_id=tenant_id, days=days)
        return {
            "items": [
                {
                    "calendar_item_id": i.calendar_item_id,
                    "title": i.title,
                    "planned_at": i.planned_at.isoformat(),
                    "status": i.status,
                    "priority": i.priority,
                }
                for i in items
            ],
            "count": len(items),
        }
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "get_pending_content_approvals",
    "Lista los contenidos pendientes de aprobación.",
    {"tenant_id": {"type": "string"}},
)
def get_pending_content_approvals(tenant_id: str = "default") -> dict:
    try:
        from communications.approval_workflow import get_pending_approvals
        pending = get_pending_approvals(tenant_id=tenant_id)
        return {
            "pending": [
                {
                    "approval_id": a.approval_id,
                    "content_asset_id": a.content_asset_id,
                    "requested_by": a.requested_by,
                    "risk_review_required": a.risk_review_required,
                    "legal_review_required": a.legal_review_required,
                }
                for a in pending
            ],
            "count": len(pending),
        }
    except Exception as exc:
        return {"error": str(exc)}


@_register(
    "prepare_stakeholder_update",
    "Prepara un email de actualización para un stakeholder sobre un tema concreto.",
    {
        "contact_id": {"type": "string", "description": "ID del contacto en el CRM"},
        "topic": {"type": "string", "description": "Tema de la actualización"},
        "tenant_id": {"type": "string"},
    },
)
def prepare_stakeholder_update(
    contact_id: str = "",
    topic: str = "",
    tenant_id: str = "default",
) -> dict:
    try:
        from communications.template_library import render_template
        from communications.content_assets import create_asset
        try:
            from crm.contacts import get_contact
            contact = get_contact(contact_id, tenant_id)
            name = contact.full_name if contact else contact_id
        except Exception:
            name = contact_id
        body = render_template("stakeholder_update_email", {
            "name": name, "topic": topic,
            "summary": f"Actualización sobre {topic}.",
            "key_points": "• Punto 1\n• Punto 2\n• Punto 3",
            "next_steps": "• Revisar adjunto.\n• Confirmar reunión de seguimiento.",
            "sender": "Equipo de Inteligencia",
        })
        asset = create_asset(
            title=f"Update stakeholder: {name} — {topic}",
            asset_type="email",
            body_markdown=body,
            tenant_id=tenant_id,
        )
        return {"asset_id": asset.asset_id, "title": asset.title, "preview": body[:400]}
    except Exception as exc:
        return {"error": str(exc)}
