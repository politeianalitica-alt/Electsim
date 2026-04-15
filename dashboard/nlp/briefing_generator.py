"""Generador de briefings desde nueva encuesta."""

from __future__ import annotations

from dashboard.briefings.generator import render_template


def generate_poll_briefing(
    new_poll: dict,
    current_average: dict,
    house_effects: dict,
    seat_implications: dict,
    llm_client,
) -> str:
    """Genera briefing neutral y técnico en Markdown."""
    draft = render_template(
        "nueva_encuesta.j2",
        {
            "new_poll": new_poll,
            "current_average": current_average,
            "house_effects": house_effects,
            "seat_implications": seat_implications,
        },
    )
    if llm_client is None:
        return draft
    system = (
        "Eres un analista político experto en elecciones españolas. "
        "Genera un briefing profesional, factual y neutral de 3-4 párrafos. "
        "Siempre señala la incertidumbre. No hagas predicciones definitivas. "
        "Usa terminología técnica de ciencia política española."
    )
    try:
        resp = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": draft}],
        )
        return resp.choices[0].message.content
    except Exception:
        return draft

