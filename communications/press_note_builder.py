"""
Press Note Builder — Bloque 16.

Construye notas de prensa, declaraciones reactivas y packs Q&A.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from communications.schemas import ContentAsset

logger = logging.getLogger(__name__)


def build_press_note(
    title: str,
    key_message: str,
    quotes: list[str] | None = None,
    evidence_ids: list[str] | None = None,
    organization: str = "",
    city: str = "Madrid",
    contact: str = "",
    tenant_id: str = "default",
) -> ContentAsset:
    today = date.today().strftime("%d de %B de %Y")
    quotes_text = ""
    if quotes:
        quotes_text = "\n\n**Declaraciones:**\n" + "\n".join(f'> "{q}"' for q in quotes)
    evidence_text = ""
    if evidence_ids:
        evidence_text = f"\n\n*Fuentes de referencia: {', '.join(evidence_ids)}*"

    body = (
        f"**NOTA DE PRENSA**\n\n"
        f"**{title}**\n\n"
        f"{city}, {today}"
        f"{' — ' + organization if organization else ''}\n\n"
        f"{key_message}"
        f"{quotes_text}"
        f"{evidence_text}"
        f"\n\n---\n**Contacto de prensa:** {contact or '[pendiente]'}"
    )

    return ContentAsset(
        title=title,
        asset_type="press_note",
        body_markdown=body,
        short_copy=key_message[:200],
        evidence_ids=evidence_ids or [],
        tenant_id=tenant_id,
        raw_payload={"organization": organization, "city": city},
    )


def build_reactive_statement(
    issue: str,
    position: str,
    risk_level: str = "MEDIUM",
    organization: str = "",
    evidence_ids: list[str] | None = None,
    tenant_id: str = "default",
) -> ContentAsset:
    today = date.today().strftime("%d de %B de %Y")
    risk_label = {"HIGH": "⚠️ Urgente", "CRITICAL": "🔴 Crítico", "MEDIUM": "🟡 Moderado", "LOW": "🟢 Rutina"}.get(risk_level, "")

    body = (
        f"**DECLARACIÓN — {today}** {risk_label}\n\n"
        f"**En relación con:** {issue}\n\n"
        f"**Posición:** {position}\n\n"
        f"{'**Evidencias de referencia:** ' + ', '.join(evidence_ids) if evidence_ids else ''}\n\n"
        f"---\n*{organization or 'Organización'}*"
    )

    return ContentAsset(
        title=f"Declaración: {issue[:80]}",
        asset_type="press_note",
        body_markdown=body,
        short_copy=position[:200],
        evidence_ids=evidence_ids or [],
        status="draft",
        tenant_id=tenant_id,
        raw_payload={"risk_level": risk_level, "issue": issue},
    )


def build_qna_pack(
    topic: str,
    likely_questions: list[str],
    evidence_ids: list[str] | None = None,
    position: str = "",
    tenant_id: str = "default",
) -> ContentAsset:
    today = date.today().isoformat()
    qa_parts = []
    for i, q in enumerate(likely_questions, 1):
        qa_parts.append(f"**P{i}: {q}**\nR: [Posición a completar por el equipo de comunicación]")
    qa_text = "\n\n".join(qa_parts)

    evidence_note = f"\n\n*Fuentes: {', '.join(evidence_ids)}*" if evidence_ids else ""

    body = (
        f"# Q&A — {topic}\n\n"
        f"**⚠️ Uso exclusivo interno — portavoces y comunicación**\n\n"
        f"{qa_text}"
        f"{evidence_note}\n\n"
        f"---\n*Actualizado: {today}*"
    )

    return ContentAsset(
        title=f"Q&A: {topic}",
        asset_type="qa",
        body_markdown=body,
        evidence_ids=evidence_ids or [],
        status="draft",
        tenant_id=tenant_id,
        raw_payload={"topic": topic, "questions_count": len(likely_questions)},
    )
