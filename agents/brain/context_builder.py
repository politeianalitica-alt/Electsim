"""
Context Builder — construye BrainContext por módulo.

Agrega datos del dashboard + evidencias RAG en un contexto
estructurado y con presupuesto de tokens controlado.

Módulos: general, legislativo, medios, actores, electoral,
         coalicion, riesgo, geopolitica, communication, workspace.
"""
from __future__ import annotations

import logging
from typing import Any

from .schemas import BrainContext, EvidenceItem

logger = logging.getLogger(__name__)

# ── Token budget por modo ─────────────────────────────────────────────────────

_TOKEN_BUDGETS = {
    "fast":   3000,
    "normal": 6000,
    "deep":   12000,
}


class ContextBuilder:
    """
    Construye BrainContext adaptado al módulo y modo del agente.

    Uso::

        builder = ContextBuilder()
        ctx = builder.build("legislativo", "¿Qué ha salido en el BOE hoy?", mode="normal")
    """

    def build(
        self,
        module: str = "general",
        user_question: str = "",
        mode: str = "normal",
        selected_objects: list[dict[str, Any]] | None = None,
        rag_evidence: list[EvidenceItem] | None = None,
    ) -> BrainContext:
        """
        Construye el contexto para el módulo indicado.

        Args:
            module: nombre del módulo ("legislativo", "medios"…).
            user_question: pregunta del usuario (para RAG).
            mode: "fast" | "normal" | "deep".
            selected_objects: objetos seleccionados en el UI.
            rag_evidence: evidencias ya recuperadas por RAG (evita doble búsqueda).

        Returns:
            BrainContext listo para pasar al LLM.
        """
        ctx = BrainContext(
            user_question=user_question,
            module=module,
            token_budget=_TOKEN_BUDGETS.get(mode, 6000),
            selected_objects=selected_objects or [],
            retrieved_evidence=rag_evidence or [],
        )

        # Datos por módulo
        _BUILDERS = {
            "legislativo":   self._load_legislative,
            "medios":        self._load_media,
            "actores":       self._load_actors,
            "electoral":     self._load_electoral,
            "coalicion":     self._load_electoral,
            "riesgo":        self._load_risk,
            "geopolitica":   self._load_geo,
            "general":       self._load_general,
        }
        loader = _BUILDERS.get(module, self._load_general)
        try:
            loader(ctx)
        except Exception as exc:
            logger.debug("ContextBuilder.build(%s): %s", module, exc)

        # Alertas y estado del sistema siempre
        try:
            self._load_alerts(ctx)
        except Exception as exc:
            logger.debug("ContextBuilder._load_alerts: %s", exc)

        try:
            self._load_system_state(ctx)
        except Exception as exc:
            logger.debug("ContextBuilder._load_system_state: %s", exc)

        return ctx

    # ── Loaders por módulo ────────────────────────────────────────────────────

    def _load_legislative(self, ctx: BrainContext) -> None:
        """Carga datos legislativos reales (Bloque 1)."""
        try:
            from dashboard.services.legislative_core import (
                cargar_boe_reciente, cargar_kpis_legislativos,
                cargar_iniciativas_recientes,
            )
            df = cargar_boe_reciente(limit=12, days=3)
            if not df.empty:
                ctx.recent_legal_items = df.fillna("").to_dict("records")

            kpis = cargar_kpis_legislativos()
            ctx.dashboard_state["legislative_kpis"] = kpis

            df_ini = cargar_iniciativas_recientes(limit=6, days=30)
            if not df_ini.empty:
                ctx.dashboard_state["recent_initiatives"] = df_ini.fillna("").head(6).to_dict("records")
        except Exception as exc:
            logger.debug("_load_legislative: %s", exc)

    def _load_media(self, ctx: BrainContext) -> None:
        """Carga datos de medios reales (Bloque 2)."""
        try:
            from dashboard.services.media_core import (
                cargar_media_items_recientes, cargar_kpis_medios,
                cargar_narrativas_activas,
            )
            df = cargar_media_items_recientes(limit=10, hours=24)
            if not df.empty:
                ctx.recent_media_items = df.fillna("").to_dict("records")

            kpis = cargar_kpis_medios()
            ctx.dashboard_state["media_kpis"] = kpis

            df_narr = cargar_narrativas_activas(hours=48, limit=8)
            if not df_narr.empty:
                ctx.narrative_clusters = df_narr.fillna("").to_dict("records")
        except Exception as exc:
            logger.debug("_load_media: %s", exc)

    def _load_actors(self, ctx: BrainContext) -> None:
        """Carga perfil de actores más mencionados en medios."""
        try:
            from dashboard.services.media_core import cargar_top_actores_medios
            df = cargar_top_actores_medios(hours=48, limit=15)
            if not df.empty:
                ctx.dashboard_state["top_actors"] = df.fillna("").to_dict("records")
        except Exception as exc:
            logger.debug("_load_actors: %s", exc)

    def _load_electoral(self, ctx: BrainContext) -> None:
        """Carga datos electorales: sondeos, escaños, nowcast."""
        try:
            from dashboard.services.electoral_service import (
                cargar_ultimo_sondeo, obtener_medias_partidos,
            )
            sondeo = cargar_ultimo_sondeo()
            if sondeo:
                ctx.dashboard_state["ultimo_sondeo"] = sondeo
            medias = obtener_medias_partidos()
            if medias:
                ctx.dashboard_state["medias_partidos"] = medias
        except Exception as exc:
            logger.debug("_load_electoral (service): %s", exc)

        # Fallback via BD directa
        try:
            from db.database import get_engine
            from sqlalchemy import text as sa_text
            import pandas as pd
            engine = get_engine()
            df = pd.read_sql(sa_text("""
                SELECT nombre_partido, media_voto_estimado, fecha_publicacion
                FROM encuestas_agregadas
                ORDER BY fecha_publicacion DESC NULLS LAST
                LIMIT 20
            """), engine)
            if not df.empty:
                ctx.dashboard_state.setdefault("medias_partidos_bd", df.to_dict("records"))
        except Exception:
            pass

    def _load_risk(self, ctx: BrainContext) -> None:
        """Carga alertas e indicadores de riesgo."""
        self._load_legislative(ctx)
        self._load_media(ctx)

    def _load_geo(self, ctx: BrainContext) -> None:
        """Carga contexto geopolítico."""
        try:
            from dashboard.utils.geo_helpers import get_presencia_espanola
            items = get_presencia_espanola()
            if items:
                ctx.dashboard_state["presencia_espanola"] = items[:20]
        except Exception as exc:
            logger.debug("_load_geo: %s", exc)

    def _load_general(self, ctx: BrainContext) -> None:
        """Carga un resumen general de todos los módulos."""
        self._load_legislative(ctx)
        self._load_media(ctx)

    def _load_alerts(self, ctx: BrainContext) -> None:
        """Carga alertas activas del sistema."""
        try:
            from dashboard.services.legislative_core import cargar_alertas_legislativas
            import pandas as pd
            df = cargar_alertas_legislativas()
            if not df.empty:
                ctx.active_alerts.extend(df.fillna("").head(5).to_dict("records"))
        except Exception:
            pass

        try:
            from dashboard.services.media_core import cargar_alertas_medios
            df = cargar_alertas_medios(hours=24)
            if not df.empty:
                ctx.active_alerts.extend(df.fillna("").head(5).to_dict("records"))
        except Exception:
            pass

    def _load_system_state(self, ctx: BrainContext) -> None:
        """Carga estado del sistema Brain (Ollama, Chroma…)."""
        try:
            from .llm_gateway import get_gateway
            gw = get_gateway()
            ctx.system_state = gw.status()
        except Exception:
            ctx.system_state = {"provider": "unknown"}


# ── Singleton ─────────────────────────────────────────────────────────────────

_builder_instance: ContextBuilder | None = None


def get_context_builder() -> ContextBuilder:
    global _builder_instance
    if _builder_instance is None:
        _builder_instance = ContextBuilder()
    return _builder_instance
