"""
BriefingEngine — Genera el Morning Intelligence Briefing diario.

Ciclo:
  1. build_briefing_prompt(): recupera del grafo alertas, narrativas, cambios
     de riesgo y eventos parlamentarios del ultimo dia.
  2. generate_morning_briefing(): llama al LLMClient con schema MorningBriefing
     y persiste el resultado como objeto de ontologia.

Se invoca desde la tarea Celery:
    scheduler.tasks.intelligence.task_morning_briefing
a las 06:30 UTC para cada cliente activo.

Sin emojis.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from services.intelligence.models import BriefingSection, MorningBriefing

logger = logging.getLogger(__name__)

# Maximo de items de contexto que se inyectan en el prompt
_MAX_ALERTS = 10
_MAX_NARRATIVES = 5
_MAX_EVENTS = 10
_MAX_CONTEXT_CHARS = 24_000   # aprox 6K tokens


class BriefingEngine:
    """
    Motor de generacion de briefings de inteligencia politica.
    """

    def __init__(
        self,
        llm,                    # LLMClient
        ontology_repo,          # OntologyGraphRepository
        db_session=None,        # SQLAlchemy Session para queries directas
    ) -> None:
        self.llm = llm
        self.ontology_repo = ontology_repo
        self.session = db_session

    # ------------------------------------------------------------------
    # Construccion del prompt de contexto
    # ------------------------------------------------------------------

    async def build_briefing_prompt(
        self,
        client_id: str,
        market_code: str,
        since: datetime,
        until: datetime,
        client_profile: dict | None = None,
    ) -> str:
        """
        Recupera contexto del grafo y construye el prompt para el LLM.

        Incluye:
        - Alertas criticas y altas en el periodo
        - Narrativas activas y sus niveles de amenaza
        - Cambios en el risk_index
        - Eventos parlamentarios relevantes
        - Perfil del cliente (sector, intereses) para personalizar
        """
        parts: list[str] = []

        # --- Cabecera ---
        date_str = until.strftime("%d/%m/%Y")
        parts.append(
            f"Eres un analista politico experto. Genera el briefing de inteligencia "
            f"politica para el {date_str}, mercado: {market_code}."
        )

        # --- Perfil del cliente ---
        if client_profile:
            parts.append(
                f"\nPERFIL DEL CLIENTE (id={client_id}):\n"
                + json.dumps(client_profile, ensure_ascii=False, indent=2)
            )

        # --- Alertas recientes ---
        alerts = await self._fetch_recent_alerts(market_code, since, until)
        if alerts:
            parts.append(f"\nALERTAS RECIENTES ({len(alerts)}):")
            for a in alerts[:_MAX_ALERTS]:
                parts.append(f"  - [{a.get('severity','?').upper()}] {a.get('description','')}")

        # --- Narrativas activas ---
        narratives = await self._fetch_active_narratives(market_code)
        if narratives:
            parts.append(f"\nNARRATIVAS ACTIVAS ({len(narratives)}):")
            for n in narratives[:_MAX_NARRATIVES]:
                parts.append(
                    f"  - {n.get('label','?')} "
                    f"[{n.get('threat_level','ruido')}]: {n.get('description','')[:200]}"
                )

        # --- Eventos parlamentarios ---
        events = await self._fetch_parliamentary_events(market_code, since, until)
        if events:
            parts.append(f"\nEVENTOS PARLAMENTARIOS ({len(events)}):")
            for e in events[:_MAX_EVENTS]:
                parts.append(f"  - {e.get('title','?')} ({e.get('date','')})")

        # --- Instruccion de salida ---
        parts.append(
            "\nGenera un briefing ejecutivo en espanol con la siguiente estructura JSON exacta:\n"
            "{\n"
            '  "client_id": "<string>",\n'
            '  "date": "<YYYY-MM-DD>",\n'
            '  "executive_summary": "<1-2 parrafos>",\n'
            '  "key_changes": ["<cambio 1>", "<cambio 2>", ...],\n'
            '  "sections": [\n'
            '    {"title": "<titulo>", "body_markdown": "<cuerpo en markdown>"},\n'
            "    ...\n"
            "  ],\n"
            '  "risk_delta": <float o null>\n'
            "}\n"
            f"client_id debe ser: {client_id!r}\n"
            f"date debe ser: {until.strftime('%Y-%m-%d')!r}\n"
            "Incluye entre 3 y 5 secciones. Secciones sugeridas: "
            "Politica Interior, Legislacion Relevante, Narrativas y Riesgos, Outlook."
        )

        full_prompt = "\n".join(parts)
        # Truncar si el prompt es demasiado largo
        if len(full_prompt) > _MAX_CONTEXT_CHARS:
            full_prompt = full_prompt[:_MAX_CONTEXT_CHARS] + "\n[CONTEXTO TRUNCADO]"

        return full_prompt

    # ------------------------------------------------------------------
    # Generacion del briefing
    # ------------------------------------------------------------------

    async def generate_morning_briefing(
        self,
        client_id: str,
        market_code: str,
        target_date: datetime | None = None,
        client_profile: dict | None = None,
    ) -> MorningBriefing:
        """
        Genera el briefing matutino para un cliente.

        Si target_date es None se usa el dia de hoy.
        Persiste el resultado en la ontologia si hay sesion de BD disponible.
        """
        if target_date is None:
            target_date = datetime.now(timezone.utc)

        since = target_date - timedelta(days=1)

        prompt = await self.build_briefing_prompt(
            client_id=client_id,
            market_code=market_code,
            since=since,
            until=target_date,
            client_profile=client_profile,
        )

        briefing = await self.llm.analyze_structured(
            prompt=prompt,
            schema=MorningBriefing,
            task_type="analysis",
            temperature=0.2,
            context_tokens=len(prompt) // 4,
        )

        # Persistir en ontologia
        await self._persist_briefing(briefing)

        return briefing

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    async def _persist_briefing(self, briefing: MorningBriefing) -> None:
        """Guarda el briefing como objeto de ontologia (analysis_result)."""
        if self.session is None:
            return
        try:
            self.ontology_repo.upsert_object_from_pipeline(
                object_type_code="analysis_result",
                external_table="intelligence_briefings",
                external_id=f"{briefing.client_id}:{briefing.date}",
                properties={
                    "type": "morning_briefing",
                    "client_id": briefing.client_id,
                    "date": briefing.date,
                    "executive_summary": briefing.executive_summary,
                    "key_changes": briefing.key_changes,
                    "risk_delta": briefing.risk_delta,
                    "sections_count": len(briefing.sections),
                },
            )
            self.session.commit()
        except Exception as exc:
            logger.warning("BriefingEngine._persist_briefing error: %s", exc)

    # ------------------------------------------------------------------
    # Consultas al grafo / BD (con fallbacks vacios si no hay conexion)
    # ------------------------------------------------------------------

    async def _fetch_recent_alerts(
        self,
        market_code: str,
        since: datetime,
        until: datetime,
    ) -> list[dict]:
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT descripcion as description, severidad as severity, creada_en "
                    "FROM alertas_sistema "
                    "WHERE creada_en >= :since AND creada_en <= :until "
                    "AND severidad IN ('critica','alta','critical','high') "
                    "ORDER BY creada_en DESC LIMIT :lim"
                ),
                {"since": since, "until": until, "lim": _MAX_ALERTS},
            ).fetchall()
            return [dict(row._mapping) for row in rows]
        except Exception as exc:
            logger.debug("_fetch_recent_alerts: %s", exc)
            return []

    async def _fetch_active_narratives(self, market_code: str) -> list[dict]:
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT o.properties->>'label' as label, "
                    "       o.properties->>'description' as description, "
                    "       o.properties->>'threat_level' as threat_level "
                    "FROM ontology_object o "
                    "JOIN ontology_object_type t ON t.id = o.object_type_id "
                    "WHERE t.code = 'narrative_cluster' "
                    "ORDER BY o.updated_at DESC LIMIT :lim"
                ),
                {"lim": _MAX_NARRATIVES},
            ).fetchall()
            return [dict(row._mapping) for row in rows]
        except Exception as exc:
            logger.debug("_fetch_active_narratives: %s", exc)
            return []

    async def _fetch_parliamentary_events(
        self,
        market_code: str,
        since: datetime,
        until: datetime,
    ) -> list[dict]:
        if self.session is None:
            return []
        try:
            from sqlalchemy import text as sa_text
            rows = self.session.execute(
                sa_text(
                    "SELECT titulo as title, fecha_publicacion::text as date "
                    "FROM iniciativas_parlamentarias "
                    "WHERE fecha_publicacion >= :since AND fecha_publicacion <= :until "
                    "ORDER BY fecha_publicacion DESC LIMIT :lim"
                ),
                {"since": since, "until": until, "lim": _MAX_EVENTS},
            ).fetchall()
            return [dict(row._mapping) for row in rows]
        except Exception as exc:
            logger.debug("_fetch_parliamentary_events: %s", exc)
            return []
