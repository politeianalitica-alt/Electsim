"""
Risk Tools — Bloque 4.

Herramientas OSINT/Risk para el Politeia Brain (N8_ChatIA).
Permiten al Brain consultar perfiles de riesgo, relaciones y exposición.

Preguntas que puede responder:
  "Dame el perfil de riesgo de esta empresa."
  "¿Qué actores políticos están conectados con este sector?"
  "¿Qué entidades sancionadas aparecen en nuestras fuentes?"
  "¿Qué relaciones requieren revisión manual?"
  "¿Qué riesgos reputacionales hay hoy?"
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _safe_actor_risk_call(fn_name: str, *args: Any, **kwargs: Any) -> Any:
    """Llama a una función de actor_risk_core de forma segura."""
    try:
        from dashboard.services import actor_risk_core as arc
        fn = getattr(arc, fn_name)
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("risk_tools.%s error: %s", fn_name, exc)
        return None


# ── Herramientas ──────────────────────────────────────────────────────────────

def search_risk_entities(query: str, k: int = 10) -> list[dict[str, Any]]:
    """
    Busca entidades de riesgo por nombre.

    Args:
        query: Texto de búsqueda (nombre, alias, empresa…).
        k: Máximo de resultados.

    Returns:
        Lista de dicts con: id, name, entity_type, risk_score, pep_status, sanctions_status.
    """
    df = _safe_actor_risk_call("buscar_entidades", query, k)
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.head(k).to_dict("records")
    except Exception:
        return []


def get_entity_risk_profile(entity_id: int) -> dict[str, Any]:
    """
    Obtiene el perfil completo de riesgo de una entidad.

    Args:
        entity_id: ID de la entidad en la BD.

    Returns:
        dict con: entity, flags, relations, score, breakdown, social_identities.
    """
    profile: dict[str, Any] = {"entity_id": entity_id, "found": False}

    # Entidad base
    df_entity = _safe_actor_risk_call("cargar_entidades_riesgo", 1)
    if df_entity is not None and not df_entity.empty:
        entity_df = _safe_actor_risk_call("buscar_entidades", str(entity_id), 1)
        if entity_df is not None and not entity_df.empty:
            profile["entity"] = entity_df.iloc[0].to_dict()
            profile["found"] = True

    # Flags
    df_flags = _safe_actor_risk_call("cargar_flags_entidad", entity_id)
    if df_flags is not None and not df_flags.empty:
        profile["flags"] = df_flags.to_dict("records")
        profile["n_flags"] = len(df_flags)
    else:
        profile["flags"] = []
        profile["n_flags"] = 0

    # Relaciones
    df_rels = _safe_actor_risk_call("cargar_relaciones_entidad", entity_id)
    if df_rels is not None and not df_rels.empty:
        profile["relations"] = df_rels.head(20).to_dict("records")
        profile["n_relations"] = len(df_rels)
    else:
        profile["relations"] = []
        profile["n_relations"] = 0

    # Identidades sociales
    df_ids = _safe_actor_risk_call("cargar_identidades_publicas", entity_id)
    if df_ids is not None and not df_ids.empty:
        profile["social_identities"] = df_ids.to_dict("records")
    else:
        profile["social_identities"] = []

    return profile


def get_high_risk_relations(entity_id: int, depth: int = 2) -> dict[str, Any]:
    """
    Obtiene el subgrafo de relaciones de alto riesgo de una entidad.

    Args:
        entity_id: ID de la entidad.
        depth: Profundidad del grafo (1 o 2).

    Returns:
        GraphExport-like dict con nodes y edges.
    """
    result = _safe_actor_risk_call("cargar_grafo_actor", entity_id, depth)
    if not result:
        return {"nodes": [], "edges": [], "meta": {"entity_id": entity_id}}

    # Filtrar solo relaciones de alta confianza
    high_risk_edges = [
        e for e in result.get("edges", [])
        if e.get("confidence", 0) >= 0.60
    ]
    result["edges"] = high_risk_edges
    result["meta"]["n_high_risk_edges"] = len(high_risk_edges)
    return result


def get_top_risk_entities(limit: int = 20) -> list[dict[str, Any]]:
    """
    Obtiene las entidades con mayor riesgo.

    Returns:
        Lista de dicts ordenada por risk_score descendente.
    """
    df = _safe_actor_risk_call("cargar_top_risk_entities", limit)
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.to_dict("records")
    except Exception:
        return []


def get_unverified_social_identities(limit: int = 50) -> list[dict[str, Any]]:
    """
    Obtiene identidades sociales candidatas pendientes de verificación.

    Returns:
        Lista de candidatos con: platform, handle, profile_url, confidence, actor_id.
    """
    df = _safe_actor_risk_call("cargar_identidades_pendientes", limit)
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.to_dict("records")
    except Exception:
        return []


def explain_risk_score(entity_id: int) -> str:
    """
    Genera una explicación en texto del score de riesgo de una entidad.

    Returns:
        Markdown con el breakdown del score.
    """
    try:
        # Obtener entidad y flags de la BD
        from dashboard.services.actor_risk_core import (
            cargar_flags_entidad, cargar_entidades_riesgo, cargar_relaciones_entidad,
        )
        from etl.sources.osint.risk_scorer import explain_risk_score as _explain
        from etl.sources.osint.schemas import RiskEntity, RiskFlag, RiskRelation

        # Entidad
        df_e = cargar_entidades_riesgo(limit=1)  # fallback genérico
        if df_e.empty:
            return f"_Entidad {entity_id} no encontrada en el grafo de riesgo._"

        # Flags
        df_f = cargar_flags_entidad(entity_id)
        flags: list[RiskFlag] = []
        if not df_f.empty:
            for _, row in df_f.iterrows():
                try:
                    flags.append(RiskFlag(
                        entity_id=str(entity_id),
                        flag_type=row.get("flag_type", "osint_candidate"),
                        severity=row.get("severity", "LOW"),
                        description=str(row.get("description", "")),
                        source=str(row.get("source", "")),
                        confidence=float(row.get("confidence", 0) or 0),
                    ))
                except Exception:
                    pass

        # Construir RiskEntity mínima desde los datos disponibles
        entity = RiskEntity(
            source="bd",
            source_id=str(entity_id),
            entity_type="unknown",
            name=f"Entidad #{entity_id}",
            pep_status=False,
            sanctions_status=any(f.flag_type == "sanctioned" for f in flags),
        )

        return _explain(entity, flags)

    except Exception as exc:
        logger.debug("explain_risk_score error: %s", exc)
        return f"_No se pudo calcular el score para entidad {entity_id}: {exc}_"


def get_geopolitical_exposure() -> dict[str, Any]:
    """
    Obtiene la exposición geopolítica por país para D8.

    Returns:
        dict con: countries list, max_risk_country, n_exposed.
    """
    df = _safe_actor_risk_call("cargar_exposicion_por_pais")
    if df is None or (hasattr(df, "empty") and df.empty):
        return {"countries": [], "max_risk_country": None, "n_exposed": 0}

    try:
        countries = df.head(30).to_dict("records")
        max_row = df.iloc[0] if not df.empty else None
        return {
            "countries": countries,
            "max_risk_country": str(max_row["country"]) if max_row is not None else None,
            "n_exposed": len(df),
        }
    except Exception:
        return {"countries": [], "max_risk_country": None, "n_exposed": 0}


# ── Registro en ToolRegistry ──────────────────────────────────────────────────

def _register_risk_tools() -> None:
    """Registra las herramientas de riesgo en la ToolRegistry."""
    try:
        from agents.tools import ToolRegistry
        tools = [
            ("search_risk_entities", search_risk_entities,
             "Busca entidades de riesgo (personas, empresas, organizaciones) por nombre."),
            ("get_entity_risk_profile", get_entity_risk_profile,
             "Obtiene el perfil completo de riesgo de una entidad: flags, relaciones, identidades."),
            ("get_high_risk_relations", get_high_risk_relations,
             "Obtiene el subgrafo de relaciones de alto riesgo de una entidad."),
            ("get_top_risk_entities", get_top_risk_entities,
             "Obtiene las entidades con mayor risk score del sistema."),
            ("get_unverified_social_identities", get_unverified_social_identities,
             "Lista identidades sociales candidatas pendientes de verificación humana."),
            ("explain_risk_score", explain_risk_score,
             "Genera explicación detallada del risk score de una entidad."),
            ("get_geopolitical_exposure", get_geopolitical_exposure,
             "Exposición geopolítica por país para el módulo de Geopolítica."),
        ]

        for name, fn, description in tools:
            try:
                ToolRegistry.register(
                    name=name,
                    fn=fn,
                    description=description,
                    module="osint",
                    version="1.0",
                )
            except Exception:
                pass  # ToolRegistry puede tener API diferente; silenciar

    except Exception as exc:
        logger.debug("_register_risk_tools: %s", exc)


# Auto-registro al importar el módulo
_register_risk_tools()
