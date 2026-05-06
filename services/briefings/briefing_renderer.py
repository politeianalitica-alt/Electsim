"""
Renders a BriefingDocument to Markdown or plain text.
"""
from __future__ import annotations

from datetime import datetime, timezone

from api.schemas.briefings import BriefingDocument

_TYPE_LABELS = {
    "morning": "Briefing matinal",
    "client": "Briefing de cliente",
    "legislative": "Briefing legislativo",
    "crisis": "Briefing de crisis",
    "media": "Briefing mediático/narrativo",
    "geopolitical": "Briefing geopolítico",
    "sectorial": "Briefing sectorial",
}

_AUDIENCE_LABELS = {
    "consultor_politico": "Consultor político",
    "periodista": "Periodista",
    "candidato": "Candidato",
    "empresa_ibex": "Empresa IBEX",
    "unidad_inteligencia": "Unidad de inteligencia",
    "general": "General",
}


def render_briefing_markdown(briefing: BriefingDocument) -> str:
    lines: list[str] = []
    type_label = _TYPE_LABELS.get(briefing.briefing_type, briefing.briefing_type)
    audience_label = _AUDIENCE_LABELS.get(briefing.audience, briefing.audience)

    lines.append(f"# {briefing.title}")
    lines.append("")
    lines.append(f"**Tipo:** {type_label}  ")
    lines.append(f"**Audiencia:** {audience_label}  ")
    lines.append(f"**Periodo:** {briefing.period}  ")
    lines.append(f"**Generado:** {briefing.generated_at.strftime('%Y-%m-%d %H:%M')} UTC  ")
    lines.append(f"**Modo:** `{briefing.mode}`  ")
    if briefing.model_used:
        lines.append(f"**Modelo:** {briefing.model_used}  ")
    if briefing.latency_ms:
        lines.append(f"**Latencia:** {briefing.latency_ms}ms  ")
    if briefing.client_id:
        lines.append(f"**Cliente:** {briefing.client_id}  ")
    if briefing.sector:
        lines.append(f"**Sector:** {briefing.sector}  ")
    if briefing.topic:
        lines.append(f"**Tema:** {briefing.topic}  ")
    lines.append("")

    if briefing.warnings:
        lines.append("> **Advertencias:**")
        for w in briefing.warnings:
            lines.append(f"> - {w}")
        lines.append("")

    lines.append("## Resumen ejecutivo")
    lines.append("")
    lines.append(briefing.executive_summary)
    lines.append("")

    for section in briefing.sections:
        lines.append(f"## {section.title}")
        lines.append("")
        if section.body:
            lines.append(section.body)
            lines.append("")
        if section.bullets:
            for b in section.bullets:
                lines.append(f"- {b}")
            lines.append("")
        if section.recommended_action:
            lines.append(f"**Accion recomendada:** {section.recommended_action}")
            lines.append("")
        if section.evidence:
            lines.append("**Evidencias:**")
            for ev in section.evidence:
                ev_line = f"- {ev.title}"
                if ev.source_name:
                    ev_line += f" ({ev.source_name})"
                if ev.url:
                    ev_line += f" — [{ev.url}]({ev.url})"
                else:
                    ev_line += " — sin URL disponible"
                if ev.excerpt:
                    ev_line += f"\n  > {ev.excerpt[:150]}"
                lines.append(ev_line)
            lines.append("")

    if briefing.source_ids:
        lines.append("## Fuentes")
        lines.append("")
        for s in briefing.source_ids:
            lines.append(f"- `{s}`")
        lines.append("")

    if briefing.methodology_note:
        lines.append("## Nota metodologica")
        lines.append("")
        lines.append(briefing.methodology_note)
        lines.append("")

    return "\n".join(lines)


def render_briefing_plaintext(briefing: BriefingDocument) -> str:
    """Plain text version without Markdown formatting."""
    md = render_briefing_markdown(briefing)
    # Strip basic Markdown
    import re
    txt = re.sub(r"#{1,6}\s+", "", md)
    txt = re.sub(r"\*\*(.*?)\*\*", r"\1", txt)
    txt = re.sub(r"\*(.*?)\*", r"\1", txt)
    txt = re.sub(r"`(.*?)`", r"\1", txt)
    txt = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", txt)
    return txt
