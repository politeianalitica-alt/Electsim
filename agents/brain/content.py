"""
Bloque 5 — Content · 5 tools del GroqBrain.

Generación de contenido editorial razonado: briefings, alertas, comunicados,
resúmenes war-room y síntesis macro-políticas. La diferencia con un
"escribe un email" genérico es que estas tools integran el contexto del
sistema (BD + RAG + estado actual) en estructuras editoriales firmes.

  · generate_briefing                — briefing matinal o temático
  · generate_alert                   — alerta accionable (qué pasó, por qué importa, qué hacer)
  · draft_communication              — borrador (nota prensa, tweet, post, intervención)
  · generate_war_room_summary        — resumen ejecutivo de war room
  · generate_macro_political_synthesis — síntesis macro × política

Las tres primeras admiten salida JSON estructurada; las dos últimas devuelven
markdown extenso (response_format=None).
"""
from __future__ import annotations

from typing import Any


class ContentMixin:
    """Bloque 5 · Generación de contenido editorial."""

    # ─────────────────────────────────────────────────────────────
    def generate_briefing(
        self,
        *,
        title: str,
        date: str,
        sections_context: dict[str, str] | str,
        audience: str = "directivos políticos y CEOs",
        length: str = "medio",
    ) -> dict[str, Any]:
        """Briefing matinal o temático estructurado.

        Devuelve: {title, executive_summary, sections: [{heading, body, key_points,
                   citations}], today_actions, watch_next, ...}
        """
        return self._call(
            "content_generate_briefing",
            {
                "title": title,
                "date": date,
                "sections_context": sections_context,
                "audience": audience,
                "length": length,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def generate_alert(
        self,
        *,
        event: str,
        urgency: str = "media",
        context: str = "",
        recipient_role: str = "responsable de comunicación",
    ) -> dict[str, Any]:
        """Alerta accionable: qué pasó, por qué importa, qué hacer.

        Devuelve: {headline, what_happened, why_it_matters, recommended_actions,
                   deadline_hours, ...}
        """
        return self._call(
            "content_generate_alert",
            {
                "event": event,
                "urgency": urgency,
                "context": context,
                "recipient_role": recipient_role,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def draft_communication(
        self,
        *,
        comm_type: str,
        objective: str,
        key_messages: list[str] | str,
        constraints: list[str] | None = None,
        tone: str = "institucional",
        audience: str = "general",
    ) -> dict[str, Any]:
        """Borrador editorial (nota de prensa, tweet, post LinkedIn,
        intervención parlamentaria...). NUNCA publica — siempre marca
        requires_human_review=True.

        Devuelve: {comm_type, draft, alternatives, risks, suggested_channels,
                   requires_human_review: true, ...}
        """
        return self._call(
            "content_draft_communication",
            {
                "comm_type": comm_type,
                "objective": objective,
                "key_messages": key_messages if isinstance(key_messages, list) else [str(key_messages)],
                "constraints": constraints or [],
                "tone": tone,
                "audience": audience,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def generate_war_room_summary(
        self,
        *,
        situation: str,
        signals: list[str] | str,
        adversary_moves: list[str] | str,
        client_assets: list[str] | str,
        time_pressure: str = "24h",
    ) -> dict[str, Any]:
        """Resumen ejecutivo de war room en markdown extenso.

        No JSON · pensado para `st.markdown(out["result"])`.
        """
        return self._call(
            "content_war_room_summary",
            {
                "situation": situation,
                "signals": signals,
                "adversary_moves": adversary_moves,
                "client_assets": client_assets,
                "time_pressure": time_pressure,
            },
            response_format=None,
            max_tokens=3000,
        )

    # ─────────────────────────────────────────────────────────────
    def generate_macro_political_synthesis(
        self,
        *,
        macro_indicators: dict[str, Any] | str,
        political_events: list[str] | str,
        sector_signals: dict[str, Any] | str = "",
        horizon: str = "trimestre",
    ) -> dict[str, Any]:
        """Cruza señales macroeconómicas y políticas en una síntesis
        ejecutiva (markdown).

        No JSON · markdown estructurado para CEOs / fondos / departamentos
        de asuntos públicos.
        """
        return self._call(
            "content_macro_political_synthesis",
            {
                "macro_indicators": macro_indicators,
                "political_events": political_events,
                "sector_signals": sector_signals,
                "horizon": horizon,
            },
            response_format=None,
            max_tokens=3500,
        )
