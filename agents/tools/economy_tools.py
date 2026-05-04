"""
Economy Tools — Bloque 5.

Herramientas del módulo de Inteligencia Económica para el Politeia Brain (N8_ChatIA).
Permiten al Brain consultar indicadores macro, señales económicas, ITPE y forecasts.

Preguntas que puede responder:
  "¿Cuál es el IPC actual en España?"
  "¿Qué señales económicas de alto riesgo hay activas?"
  "¿Cuál es el ITPE económico de España?"
  "Proyecta el paro para los próximos 6 meses."
  "¿Cómo afecta la economía actual al voto del gobierno?"
  "Explica el riesgo económico del sector energético."
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _safe_economy_call(fn_name: str, *args: Any, **kwargs: Any) -> Any:
    """Llama a una función de economy_core de forma segura."""
    try:
        from dashboard.services import economy_core as ec
        fn = getattr(ec, fn_name)
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("economy_tools.%s error: %s", fn_name, exc)
        return None


# ── Herramientas ──────────────────────────────────────────────────────────────


def get_macro_indicators(
    geography: str = "ES",
    category: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Obtiene los indicadores macroeconómicos más recientes.

    Args:
        geography: Código de país/región (default "ES").
        category: Filtrar por categoría ('inflación', 'empleo', 'producción'…). None = todos.
        limit: Máximo de indicadores a retornar.

    Returns:
        Lista de dicts con: indicator_id, name, geography, date, value, unit,
        frequency, category, provider.
        Vacía si no hay datos.
    """
    df = _safe_economy_call("cargar_indicadores_macro_recientes", geography=geography, limit=limit)
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        if category and "category" in df.columns:
            df = df[df["category"].str.lower().str.contains(category.lower(), na=False)]
        return df.head(limit).to_dict("records")
    except Exception as exc:
        logger.debug("get_macro_indicators: %s", exc)
        return []


def get_economic_signals(
    geography: str = "ES",
    severity: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Obtiene señales económico-políticas detectadas.

    Las señales conectan datos macro con riesgo político, sectorial y narrativo.

    Args:
        geography: Código de país/región (default "ES").
        severity: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'. None = todas.
        limit: Máximo de señales.

    Returns:
        Lista de dicts con: signal_type, indicator_id, severity, date,
        current_value, change_pct, explanation, related_sectors, related_narratives.
        Vacía si no hay señales.
    """
    df = _safe_economy_call(
        "cargar_economic_signals",
        geography=geography,
        severity=severity,
        limit=limit,
    )
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.head(limit).to_dict("records")
    except Exception as exc:
        logger.debug("get_economic_signals: %s", exc)
        return []


def get_itpe_economic(geography: str = "ES") -> dict[str, Any]:
    """
    Calcula el ITPE Económico (Índice de Tensión Político-Económica).

    El ITPE cuantifica cómo el entorno macroeconómico presiona al sistema político.
    Escala 0-100: 0 = entorno favorable, 100 = crisis severa.

    Args:
        geography: Código de país/región (default "ES").

    Returns:
        dict con: total_score (0-100), level ('BAJO'/'MODERADO'/'ALTO'/'CRÍTICO'),
        explanation, y sub-scores por dimensión:
        inflation_risk, unemployment_risk, growth_risk, fiscal_risk,
        housing_risk, energy_risk, market_risk, confidence_risk.
        Incluye hay_datos=False si no hay datos disponibles.
    """
    result = _safe_economy_call("cargar_itpe_economico", geography=geography)
    if result is None:
        return {
            "hay_datos": False,
            "total_score": None,
            "level": None,
            "explanation": "No hay datos económicos disponibles.",
        }
    return result


def forecast_macro_indicator(
    indicator_id: str,
    geography: str = "ES",
    horizon: int = 6,
    model: str = "auto",
) -> list[dict[str, Any]]:
    """
    Genera un forecast para un indicador macroeconómico.

    Modelos disponibles: naive, moving_avg, ols_trend, arima, auto.
    El modo 'auto' selecciona el mejor modelo según datos disponibles.

    Args:
        indicator_id: ID del indicador ('ipc', 'paro_epa', 'pib_yoy'…).
        geography: Código de país/región (default "ES").
        horizon: Número de períodos a proyectar (default 6).
        model: Modelo a usar (default 'auto').

    Returns:
        Lista de dicts con: target_date, horizon, yhat, yhat_lower, yhat_upper, model_name.
        Vacía si no hay datos suficientes para proyectar.
    """
    # Primero intenta recuperar forecasts ya almacenados
    df = _safe_economy_call("cargar_forecasts", indicator_id, geography=geography, horizon=horizon)
    if df is not None and hasattr(df, "empty") and not df.empty:
        try:
            return df.head(horizon).to_dict("records")
        except Exception:
            pass

    # Generar y persistir en tiempo real
    results = _safe_economy_call(
        "compute_and_store_forecasts",
        indicator_id,
        geography=geography,
        horizon=horizon,
        model=model,
    )
    if results is None:
        return []
    return results[:horizon]


def predict_economic_vote(
    base_vote_share: float = 0.0,
    geography: str = "ES",
    macro_override: dict[str, float] | None = None,
) -> dict[str, Any]:
    """
    Predice el impacto del entorno económico sobre el voto al gobierno.

    Usa el modelo Lewis-Beck adaptado al sistema político español.
    El resultado estima la variación de intención de voto (±pp) que puede
    atribuirse a las condiciones macroeconómicas actuales.

    Args:
        base_vote_share: Intención de voto actual al gobierno (%).
            0 para calcular solo la variación delta.
        geography: Código de país/región (default "ES").
        macro_override: dict de indicadores para sobreescribir valores de BD.
            Ejemplo: {"ipc": 3.4, "paro_epa": 11.2}. None = usa BD.

    Returns:
        dict con: delta_vote, predicted_vote_share, ci_lower, ci_upper,
        explanation, top_factors, contributions, confidence.
    """
    # Obtener indicadores actuales
    if macro_override is not None:
        latest = dict(macro_override)
    else:
        df = _safe_economy_call(
            "cargar_indicadores_macro_recientes",
            geography=geography,
            limit=200,
        )
        latest: dict[str, float] = {}
        if df is not None and hasattr(df, "empty") and not df.empty:
            for _, row in df.iterrows():
                iid = row.get("indicator_id")
                val = row.get("value")
                if iid and val is not None:
                    try:
                        latest[iid] = float(val)
                    except (TypeError, ValueError):
                        pass

    if not latest:
        return {
            "delta_vote": None,
            "predicted_vote_share": None,
            "explanation": "No hay datos macroeconómicos disponibles para el modelo de voto.",
            "confidence": 0.0,
        }

    try:
        from models.economic_vote import EconomicVoteModel
        model = EconomicVoteModel()
        pred = model.predict_from_macro(
            latest,
            base_vote_share=base_vote_share,
            geography=geography,
            variant="ensemble",
        )
        return {
            "delta_vote": pred.delta_vote,
            "predicted_vote_share": pred.predicted_vote_share,
            "ci_lower": pred.ci_lower,
            "ci_upper": pred.ci_upper,
            "explanation": pred.explanation,
            "top_factors": pred.top_factors,
            "contributions": pred.contributions,
            "confidence": pred.confidence,
            "data_coverage": pred.data_coverage,
            "variant": pred.variant,
        }
    except Exception as exc:
        logger.error("predict_economic_vote: %s", exc)
        return {
            "delta_vote": None,
            "predicted_vote_share": None,
            "explanation": f"Error en el modelo de voto: {exc}",
            "confidence": 0.0,
        }


def explain_economic_risk(
    geography: str = "ES",
    sector: str | None = None,
) -> dict[str, Any]:
    """
    Genera una explicación narrativa del riesgo económico-político.

    Sintetiza ITPE, señales activas y narrativas conectadas para producir
    un análisis de riesgo legible.

    Args:
        geography: Código de país/región (default "ES").
        sector: Si se especifica, focaliza el análisis en ese sector.

    Returns:
        dict con: resumen, itpe_score, señales_clave, narrativas_dominantes,
        sectores_riesgo, recomendaciones.
    """
    summary = _safe_economy_call("cargar_economic_summary", geography=geography)
    if summary is None:
        summary = {"hay_datos": False}

    if not summary.get("hay_datos", False):
        return {
            "resumen": f"No hay datos económicos disponibles para {geography}.",
            "itpe_score": None,
            "señales_clave": [],
            "narrativas_dominantes": [],
            "sectores_riesgo": [],
            "recomendaciones": [
                "Ejecutar el pipeline económico: python -m pipelines.economy_core --source all",
                "Verificar conexión a proveedores (INE, BdE, Eurostat).",
            ],
        }

    itpe = summary.get("itpe", {})
    itpe_score = itpe.get("total_score")
    itpe_level = itpe.get("level", "N/D")

    # Señales más relevantes
    señales_clave = []
    for sig in summary.get("señales_críticas", [])[:3]:
        señales_clave.append({
            "tipo": sig.get("signal_type"),
            "explicación": sig.get("explanation"),
            "severidad": "CRITICAL",
        })
    for sig in summary.get("señales_altas", [])[:3]:
        señales_clave.append({
            "tipo": sig.get("signal_type"),
            "explicación": sig.get("explanation"),
            "severidad": "HIGH",
        })

    # Narrativas dominantes (de las señales)
    narrativas: list[str] = []
    all_signals_df = _safe_economy_call(
        "cargar_economic_signals", geography=geography, limit=50
    )
    if all_signals_df is not None and hasattr(all_signals_df, "empty") and not all_signals_df.empty:
        for _, row in all_signals_df.iterrows():
            narrs = row.get("related_narratives") or []
            if isinstance(narrs, list):
                narrativas.extend(narrs)
    # Deduplicar preservando orden
    seen: set[str] = set()
    narrativas_unique = [n for n in narrativas if n not in seen and not seen.add(n)][:8]  # type: ignore[func-returns-value]

    # Sectores de riesgo
    sectores_riesgo = summary.get("sectores_riesgo", [])
    if sector:
        sectores_riesgo = [s for s in sectores_riesgo if sector.lower() in str(s.get("sector", "")).lower()]

    # Resumen ejecutivo
    n_criticas = len(summary.get("señales_críticas", []))
    n_altas = len(summary.get("señales_altas", []))
    if itpe_score is None:
        resumen = f"Análisis económico para {geography}: datos parciales disponibles."
    elif itpe_score >= 70:
        resumen = (
            f"⚠️ ITPE {itpe_score:.0f}/100 ({itpe_level}): situación de alta tensión económica. "
            f"{n_criticas} señales críticas y {n_altas} señales altas activas."
        )
    elif itpe_score >= 45:
        resumen = (
            f"🟡 ITPE {itpe_score:.0f}/100 ({itpe_level}): tensión moderada. "
            f"{n_criticas + n_altas} señales de riesgo activas."
        )
    else:
        resumen = (
            f"🟢 ITPE {itpe_score:.0f}/100 ({itpe_level}): entorno económico favorable. "
            f"{n_criticas + n_altas} señales de riesgo menores."
        )

    recomendaciones = []
    if n_criticas > 0:
        recomendaciones.append(
            f"Revisar señales críticas: {', '.join(s.get('tipo', '') for s in summary.get('señales_críticas', [])[:2])}."
        )
    if itpe_score and itpe_score >= 60:
        recomendaciones.append("Considerar el impacto en narrativas electorales (modelo de voto económico).")

    return {
        "resumen": resumen,
        "itpe_score": itpe_score,
        "itpe_level": itpe_level,
        "señales_clave": señales_clave,
        "narrativas_dominantes": narrativas_unique,
        "sectores_riesgo": sectores_riesgo[:5],
        "recomendaciones": recomendaciones,
    }


# ── Registro de herramientas ──────────────────────────────────────────────────

ECONOMY_TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_macro_indicators",
        "fn": get_macro_indicators,
        "description": (
            "Obtiene los indicadores macroeconómicos más recientes (IPC, paro, PIB, prima de riesgo, etc.)."
            " Usa geography='ES' por defecto. Filtra por category si se especifica."
        ),
        "parameters": {
            "geography": "Código de país/región (default 'ES')",
            "category": "Categoría de indicador (opcional: 'inflación', 'empleo', 'producción')",
            "limit": "Máximo de resultados (default 20)",
        },
    },
    {
        "name": "get_economic_signals",
        "fn": get_economic_signals,
        "description": (
            "Obtiene señales económico-políticas detectadas: inflation_pressure, unemployment_risk,"
            " growth_slowdown, housing_stress, market_stress, etc."
        ),
        "parameters": {
            "geography": "Código de país/región (default 'ES')",
            "severity": "Filtro de severidad: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL' (opcional)",
            "limit": "Máximo de señales (default 20)",
        },
    },
    {
        "name": "get_itpe_economic",
        "fn": get_itpe_economic,
        "description": (
            "Calcula el ITPE Económico (Índice de Tensión Político-Económica, 0-100)."
            " Cuantifica cómo el entorno macro presiona al sistema político."
        ),
        "parameters": {
            "geography": "Código de país/región (default 'ES')",
        },
    },
    {
        "name": "forecast_macro_indicator",
        "fn": forecast_macro_indicator,
        "description": (
            "Genera un forecast para un indicador macroeconómico."
            " Devuelve proyecciones con intervalo de confianza para los próximos N períodos."
        ),
        "parameters": {
            "indicator_id": "ID del indicador: 'ipc', 'paro_epa', 'pib_yoy', etc.",
            "geography": "Código de país/región (default 'ES')",
            "horizon": "Períodos a proyectar (default 6)",
            "model": "Modelo: 'naive', 'moving_avg', 'ols_trend', 'arima', 'auto'",
        },
    },
    {
        "name": "predict_economic_vote",
        "fn": predict_economic_vote,
        "description": (
            "Predice el impacto del entorno económico sobre el voto al gobierno."
            " Modelo Lewis-Beck: estima variación de voto (±pp) atribuible a macro."
        ),
        "parameters": {
            "base_vote_share": "Intención de voto actual al gobierno en % (0 si desconocida)",
            "geography": "Código de país/región (default 'ES')",
            "macro_override": "Dict de indicadores para sobreescribir valores de BD (opcional)",
        },
    },
    {
        "name": "explain_economic_risk",
        "fn": explain_economic_risk,
        "description": (
            "Genera una explicación narrativa del riesgo económico-político."
            " Sintetiza ITPE, señales y narrativas en un análisis legible."
        ),
        "parameters": {
            "geography": "Código de país/región (default 'ES')",
            "sector": "Focalizar análisis en un sector específico (opcional)",
        },
    },
]
