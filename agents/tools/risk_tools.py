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
from typing import Any, Optional

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


# ── Risk Module v2 tools (DB-driven indices / scenarios / alerts) ────────────

def _safe_engine_v2_call(fn_name: str, *args: Any, **kwargs: Any) -> Any:
    try:
        from dashboard.services import risk_engine_v2 as eng
        fn = getattr(eng, fn_name)
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("risk_engine_v2.%s error: %s", fn_name, exc)
        return None


def _safe_predictor_v2_call(fn_name: str, *args: Any, **kwargs: Any) -> Any:
    try:
        from dashboard.services import risk_predictor_v2 as p
        fn = getattr(p, fn_name)
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("risk_predictor_v2.%s error: %s", fn_name, exc)
        return None


def consultar_indices_riesgo(country: str = "ES") -> list[dict[str, Any]]:
    """
    Devuelve el panel completo de índices de riesgo para un país (España por
    defecto): institucional, electoral, geopolítico, económico, mediático,
    social.

    Returns:
        Lista de dicts: {index_id, display_name, score, label, delta_7d, ...}
    """
    out = _safe_engine_v2_call("compute_all", country, True)
    return out or []


def explicar_componentes_indice(index_id: str, country: str = "ES") -> dict[str, Any]:
    """
    Descompone un índice de riesgo en sus componentes con pesos, valores raw y
    contribuciones al score final.

    Args:
        index_id: e.g. 'riesgo_geopolitico', 'riesgo_electoral'
        country: ISO2 (default 'ES')
    """
    out = _safe_engine_v2_call("compute_index", index_id, country, None, True)
    return out or {"index_id": index_id, "error": "engine_unavailable"}


def predecir_escenario_riesgo(scenario_id: str, country: str = "ES") -> dict[str, Any]:
    """
    Predice la probabilidad de un escenario de riesgo (modelo logistic / RF /
    bayesian) con intervalo de confianza bootstrap y key drivers.

    Args:
        scenario_id: e.g. 'elecciones_anticipadas', 'crisis_gobierno',
                          'escalada_geopolitica', 'recesion_tecnica',
                          'ola_protestas', 'crisis_mediatica'
        country: ISO2 (default 'ES')
    """
    out = _safe_predictor_v2_call("predict_scenario", scenario_id, country)
    return out or {"scenario_id": scenario_id, "error": "predictor_unavailable"}


def listar_alertas_riesgo(country: str = "ES", days: int = 30) -> list[dict[str, Any]]:
    """
    Lista las alertas de riesgo disparadas en los últimos `days` días.
    Útil para responder "¿qué se ha disparado este mes?".

    Returns:
        Lista de alertas con severity, score, message, fired_at, acknowledged.
    """
    out = _safe_engine_v2_call("list_active_alerts", country, days)
    return out or []


def comparar_indices_paises(
    index_id: str, countries: Optional[list[str]] = None
) -> list[dict[str, Any]]:
    """
    Compara un índice de riesgo entre varios países.

    Args:
        index_id: e.g. 'riesgo_geopolitico'
        countries: lista de ISO2; por defecto ['ES','FR','IT','PT','DE','GB']
    """
    countries = countries or ["ES", "FR", "IT", "PT", "DE", "GB"]
    out: list[dict[str, Any]] = []
    for c in countries:
        r = _safe_engine_v2_call("compute_index", index_id, c, None, False)
        if r and r.get("score") is not None:
            out.append({
                "country": c,
                "score":   r["score"],
                "label":   r["label"],
                "source":  r.get("source", "unknown"),
            })
    return sorted(out, key=lambda x: x["score"], reverse=True)


def ack_alerta_riesgo(alert_row_id: int, user: str = "brain") -> dict[str, Any]:
    """
    Marca una alerta de riesgo como revisada (acknowledged). Solo se debe usar
    cuando el usuario lo pide explícitamente.

    Args:
        alert_row_id: id de la fila en risk_alerts_fired
        user: identificador del usuario que ACK (default 'brain')
    """
    ok = _safe_engine_v2_call("acknowledge_alert", alert_row_id, user)
    return {"ok": bool(ok), "alert_id": alert_row_id, "user": user}


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
            # ── Risk Module v2 ───────────────────────────────────────────────
            ("consultar_indices_riesgo", consultar_indices_riesgo,
             "Panel completo de índices de riesgo (institucional, electoral, "
             "geopolítico, económico, mediático, social) para un país."),
            ("explicar_componentes_indice", explicar_componentes_indice,
             "Descompone un índice de riesgo en sus componentes con pesos, "
             "valores raw y contribuciones."),
            ("predecir_escenario_riesgo", predecir_escenario_riesgo,
             "Predice la probabilidad de un escenario (elecciones anticipadas, "
             "crisis de gobierno, recesión, escalada geopolítica, ola de "
             "protestas, crisis mediática) con intervalo de confianza."),
            ("listar_alertas_riesgo", listar_alertas_riesgo,
             "Lista alertas de riesgo disparadas en los últimos N días."),
            ("comparar_indices_paises", comparar_indices_paises,
             "Compara un índice de riesgo entre varios países (ES,FR,IT,PT...)."),
            ("ack_alerta_riesgo", ack_alerta_riesgo,
             "Marca una alerta de riesgo como revisada. Usar solo si el usuario lo pide."),
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
