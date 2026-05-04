"""
Territorial Brain Tools — Bloque 7.

6 herramientas de inteligencia territorial para el Brain/LLM:
  1. search_territory             → buscar territorios por nombre
  2. get_territory_profile        → perfil completo de un territorio
  3. get_hot_territories          → ranking de territorios "calientes"
  4. get_campaign_priority_territories → territorios con mayor prioridad
  5. get_territorial_signals      → señales activas por territorio
  6. compare_territories          → comparación entre dos territorios
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _safe_territorial_call(fn, *args, **kwargs) -> dict:
    """Ejecuta una función territorial con manejo de errores."""
    try:
        result = fn(*args, **kwargs)
        return {"ok": True, "data": result}
    except Exception as exc:
        logger.debug("territorial_tool error: %s", exc)
        return {"ok": False, "error": str(exc), "data": None}


# ── Tool: search_territory ────────────────────────────────────────────────────

def _search_territory(query: str, territory_types: str = "province,ccaa") -> dict:
    """
    Busca territorios por nombre o texto libre.

    Args:
        query: Texto de búsqueda (ej. "Madrid", "Andalucía", "País Vasco").
        territory_types: Tipos separados por coma ('province', 'ccaa', 'municipality').

    Returns:
        Lista de territorios encontrados con territory_id, name, confidence.
    """
    from dashboard.services.territorial_core import buscar_territorio

    types = [t.strip() for t in territory_types.split(",")]
    results = buscar_territorio(query=query, territory_types=types, max_results=5)

    if not results:
        return {
            "found": 0,
            "territories": [],
            "message": f"No se encontraron territorios para '{query}'",
        }

    return {
        "found": len(results),
        "territories": results,
        "message": f"Se encontraron {len(results)} territorios para '{query}'",
    }


# ── Tool: get_territory_profile ───────────────────────────────────────────────

def _get_territory_profile(territory_id: str) -> dict:
    """
    Devuelve el perfil completo de un territorio: económico, electoral, campaña, señales.

    Args:
        territory_id: ID del territorio (ej. "prov:28" para Madrid,
                      "ccaa:13" para Madrid CCAA, "prov:41" para Sevilla).

    Returns:
        Perfil completo del territorio.
    """
    from dashboard.services.territorial_core import cargar_perfil_territorio

    profile = cargar_perfil_territorio(territory_id)

    if not profile:
        # Intentar buscar por nombre si parece texto plano
        if ":" not in territory_id:
            from dashboard.services.territorial_core import buscar_territorio
            results = buscar_territorio(territory_id, max_results=1)
            if results:
                found_id = results[0]["territory_id"]
                profile = cargar_perfil_territorio(found_id)
                if profile:
                    profile["resolved_from"] = territory_id

    if not profile:
        return {"error": f"Territorio '{territory_id}' no encontrado", "territory_id": territory_id}

    # Añadir señales activas
    try:
        from dashboard.services.territorial_core import cargar_senales_territoriales
        sig_df = cargar_senales_territoriales(
            min_severity="HIGH", days_back=7, limit=5
        )
        if not sig_df.empty and "territory_id" in sig_df.columns:
            sigs = sig_df[sig_df["territory_id"] == profile.get("territory_id", territory_id)]
            if not sigs.empty:
                profile["active_signals"] = sigs[
                    ["signal_type", "value", "severity", "explanation"]
                ].to_dict("records")
    except Exception:
        pass

    return profile


# ── Tool: get_hot_territories ─────────────────────────────────────────────────

def _get_hot_territories(
    territory_type: str = "province",
    top_n: int = 10,
    signal_type: str | None = None,
) -> dict:
    """
    Devuelve el ranking de territorios más activos (con más señales HIGH/CRITICAL).

    Args:
        territory_type: Tipo de territorio ('province', 'ccaa').
        top_n: Número de territorios a devolver.
        signal_type: Filtrar por tipo de señal (ej. 'electoral_swing', 'economic_stress').

    Returns:
        Lista de territorios con número de señales y severidad.
    """
    from dashboard.services.territorial_core import cargar_senales_territoriales

    sig_df = cargar_senales_territoriales(
        territory_type=territory_type,
        signal_type=signal_type,
        min_severity="HIGH",
        days_back=7,
        limit=200,
    )

    if sig_df.empty:
        return {
            "territories": [],
            "message": "No hay territorios con señales de alta severidad en los últimos 7 días.",
        }

    # Agrupar por territorio
    import pandas as pd
    sev_order = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}

    grouped = (
        sig_df.groupby("territory_id")
        .agg(
            n_signals=("signal_type", "count"),
            max_severity=("severity", lambda x: max(x, key=lambda s: sev_order.get(s, 0))),
            signals=("signal_type", list),
        )
        .reset_index()
    )
    grouped = grouped.sort_values(
        ["n_signals", "max_severity"],
        key=lambda col: col.map(sev_order) if col.name == "max_severity" else col,
        ascending=False,
    ).head(top_n)

    # Añadir nombres
    from etl.sources.geospatial.territorial_aggregator import _get_territory_name
    grouped["name"] = grouped["territory_id"].apply(_get_territory_name)

    return {
        "count": len(grouped),
        "territories": grouped.to_dict("records"),
    }


# ── Tool: get_campaign_priority_territories ───────────────────────────────────

def _get_campaign_priority_territories(
    territory_type: str = "province",
    top_n: int = 10,
    min_priority: float = 50.0,
) -> dict:
    """
    Devuelve los territorios con mayor prioridad de campaña.

    La prioridad combina: swing electoral (30%), voto blando (25%),
    stress económico (20%), intensidad mediática (15%), población (10%).

    Args:
        territory_type: Tipo de territorio ('province', 'ccaa').
        top_n: Número de territorios.
        min_priority: Prioridad mínima (0-100).

    Returns:
        Ranking de territorios con score de prioridad y factores.
    """
    from dashboard.services.territorial_core import cargar_ranking_prioridad_campana

    df = cargar_ranking_prioridad_campana(territory_type=territory_type, top_n=top_n * 2)

    if df.empty:
        return {
            "territories": [],
            "message": "No hay datos de prioridad de campaña disponibles.",
        }

    if "campaign_priority" in df.columns:
        df = df[df["campaign_priority"] >= min_priority]

    result = df.head(top_n).to_dict("records")

    return {
        "count": len(result),
        "territories": result,
        "methodology": (
            "Prioridad = swing_electoral×30% + voto_blando×25% + "
            "stress_económico×20% + intensidad_mediática×15% + población×10%"
        ),
    }


# ── Tool: get_territorial_signals ─────────────────────────────────────────────

def _get_territorial_signals(
    territory_id: str | None = None,
    signal_type: str | None = None,
    min_severity: str = "MEDIUM",
    days_back: int = 7,
    limit: int = 20,
) -> dict:
    """
    Devuelve señales territoriales activas.

    Args:
        territory_id: Filtrar por territorio (ej. "prov:28"). None = todos.
        signal_type: Tipo de señal (ej. 'electoral_swing', 'economic_stress').
        min_severity: Severidad mínima ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').
        days_back: Días hacia atrás.
        limit: Máximo de señales.

    Returns:
        Lista de señales con territorio, tipo, valor, severidad y explicación.
    """
    from dashboard.services.territorial_core import cargar_senales_territoriales

    sig_df = cargar_senales_territoriales(
        signal_type=signal_type,
        min_severity=min_severity,
        days_back=days_back,
        limit=limit,
    )

    if not sig_df.empty and territory_id and "territory_id" in sig_df.columns:
        sig_df = sig_df[sig_df["territory_id"] == territory_id]

    if sig_df.empty:
        return {
            "signals": [],
            "count": 0,
            "message": "No hay señales para los filtros especificados.",
        }

    return {
        "count": len(sig_df),
        "signals": sig_df.to_dict("records"),
    }


# ── Tool: compare_territories ─────────────────────────────────────────────────

def _compare_territories(
    territory_id_a: str,
    territory_id_b: str,
    dimensions: str = "electoral,economic,campaign",
) -> dict:
    """
    Compara dos territorios en múltiples dimensiones.

    Args:
        territory_id_a: ID del primer territorio (ej. "prov:28").
        territory_id_b: ID del segundo territorio (ej. "prov:08").
        dimensions: Dimensiones de comparación separadas por coma.
                    Disponibles: electoral, economic, campaign, media.

    Returns:
        Comparación estructurada entre los dos territorios.
    """
    from dashboard.services.territorial_core import cargar_perfil_territorio
    from etl.sources.geospatial.territorial_aggregator import _get_territory_name

    profile_a = cargar_perfil_territorio(territory_id_a)
    profile_b = cargar_perfil_territorio(territory_id_b)

    name_a = profile_a.get("name") or _get_territory_name(territory_id_a)
    name_b = profile_b.get("name") or _get_territory_name(territory_id_b)

    dims = [d.strip() for d in dimensions.split(",")]
    comparison: dict[str, Any] = {
        "territory_a": {"id": territory_id_a, "name": name_a},
        "territory_b": {"id": territory_id_b, "name": name_b},
        "dimensions": {},
    }

    field_map = {
        "electoral": ["last_election_winner", "turnout_last", "swing_index"],
        "economic": ["unemployment_rate", "income_avg", "economic_risk"],
        "campaign": ["campaign_priority", "active_alerts"],
        "media": ["media_mentions_7d"],
    }

    for dim in dims:
        if dim not in field_map:
            continue
        fields = field_map[dim]
        dim_cmp: dict[str, Any] = {}
        for field in fields:
            val_a = profile_a.get(field)
            val_b = profile_b.get(field)
            dim_cmp[field] = {
                name_a: val_a,
                name_b: val_b,
            }
            # Diferencia para valores numéricos
            if isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
                diff = val_a - val_b
                dim_cmp[f"{field}_diff"] = round(diff, 2)
                dim_cmp[f"{field}_winner"] = name_a if diff > 0 else (name_b if diff < 0 else "igual")
        comparison["dimensions"][dim] = dim_cmp

    # Resumen
    prio_a = profile_a.get("campaign_priority") or 0
    prio_b = profile_b.get("campaign_priority") or 0
    if prio_a > prio_b:
        comparison["campaign_priority_winner"] = name_a
    elif prio_b > prio_a:
        comparison["campaign_priority_winner"] = name_b
    else:
        comparison["campaign_priority_winner"] = "empate"

    return comparison


# ── Registro de herramientas ───────────────────────────────────────────────────

TERRITORIAL_TOOLS = [
    {
        "name": "search_territory",
        "description": (
            "Busca territorios de España por nombre o texto libre. "
            "Devuelve territory_id, nombre y confianza del match. "
            "Usar antes de llamar a get_territory_profile para resolver nombres."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Texto de búsqueda, ej. 'Madrid', 'Andalucía', 'País Vasco'",
                },
                "territory_types": {
                    "type": "string",
                    "description": "Tipos separados por coma: 'province,ccaa' (default)",
                    "default": "province,ccaa",
                },
            },
            "required": ["query"],
        },
        "function": _search_territory,
    },
    {
        "name": "get_territory_profile",
        "description": (
            "Devuelve el perfil completo de un territorio: datos económicos, "
            "electorales, prioridad de campaña y señales activas. "
            "Usar el territory_id del formato 'prov:XX' o 'ccaa:XX'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "territory_id": {
                    "type": "string",
                    "description": "ID del territorio, ej. 'prov:28' (Madrid), 'prov:41' (Sevilla), 'ccaa:01' (Andalucía)",
                },
            },
            "required": ["territory_id"],
        },
        "function": _get_territory_profile,
    },
    {
        "name": "get_hot_territories",
        "description": (
            "Devuelve los territorios con más señales de alta severidad "
            "(HIGH/CRITICAL). Útil para identificar zonas de atención prioritaria "
            "en tiempo real."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "territory_type": {
                    "type": "string",
                    "enum": ["province", "ccaa", "municipality"],
                    "default": "province",
                    "description": "Tipo de territorio a analizar",
                },
                "top_n": {
                    "type": "integer",
                    "default": 10,
                    "description": "Número de territorios a devolver",
                },
                "signal_type": {
                    "type": "string",
                    "description": "Filtrar por tipo de señal: electoral_swing, economic_stress, media_intensity, campaign_priority",
                },
            },
            "required": [],
        },
        "function": _get_hot_territories,
    },
    {
        "name": "get_campaign_priority_territories",
        "description": (
            "Devuelve el ranking de territorios por prioridad de campaña. "
            "La prioridad combina swing electoral, voto blando, stress económico, "
            "intensidad mediática y tamaño de población."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "territory_type": {
                    "type": "string",
                    "enum": ["province", "ccaa"],
                    "default": "province",
                },
                "top_n": {
                    "type": "integer",
                    "default": 10,
                    "description": "Número de territorios en el ranking",
                },
                "min_priority": {
                    "type": "number",
                    "default": 50.0,
                    "description": "Prioridad mínima para incluir en el ranking (0-100)",
                },
            },
            "required": [],
        },
        "function": _get_campaign_priority_territories,
    },
    {
        "name": "get_territorial_signals",
        "description": (
            "Devuelve señales territoriales activas: swing electoral, stress económico, "
            "intensidad mediática, prioridad de campaña, etc. "
            "Filtrables por territorio, tipo de señal y severidad."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "territory_id": {
                    "type": "string",
                    "description": "Filtrar por territorio (ej. 'prov:28'). Omitir para todos.",
                },
                "signal_type": {
                    "type": "string",
                    "description": "Tipo de señal: electoral_swing, economic_stress, media_intensity, campaign_priority, soft_vote_opportunity",
                },
                "min_severity": {
                    "type": "string",
                    "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                    "default": "MEDIUM",
                },
                "days_back": {
                    "type": "integer",
                    "default": 7,
                    "description": "Días hacia atrás para buscar señales",
                },
                "limit": {
                    "type": "integer",
                    "default": 20,
                },
            },
            "required": [],
        },
        "function": _get_territorial_signals,
    },
    {
        "name": "compare_territories",
        "description": (
            "Compara dos territorios en dimensiones electorales, económicas y de campaña. "
            "Devuelve diferencias y el territorio 'ganador' en cada métrica."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "territory_id_a": {
                    "type": "string",
                    "description": "Primer territorio (ej. 'prov:28')",
                },
                "territory_id_b": {
                    "type": "string",
                    "description": "Segundo territorio (ej. 'prov:08' para Barcelona)",
                },
                "dimensions": {
                    "type": "string",
                    "default": "electoral,economic,campaign",
                    "description": "Dimensiones separadas por coma: electoral, economic, campaign, media",
                },
            },
            "required": ["territory_id_a", "territory_id_b"],
        },
        "function": _compare_territories,
    },
]
