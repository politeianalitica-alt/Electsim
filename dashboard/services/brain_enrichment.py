"""
Brain Enrichment Service · capa transversal para dotar de razonamiento Groq
a cualquier servicio/página del dashboard.

Filosofía: la página existente expone DataFrames o dicts. Este servicio toma
esos datos y los pasa al brain para extraer significado, no sólo cifras.

API principal:
  · interpretar_dataframe(df, intent, context)  → resumen razonado
  · interpretar_payload(payload, intent, context) → resumen razonado de dict
  · sintetizar_titulares(df, col_titular, col_medio, col_fecha) → narrativa
  · perfil_rapido_actor(nombre, hechos_recientes) → perfil 360
  · escenario_rapido(tema, situacion) → 4 escenarios
  · explicar_resultado_simulacion(sim_type, inputs, results) → lectura
  · explicar_serie_temporal(serie, etiqueta, ventana) → drivers + watch list
  · lectura_macro(macro_dict, eventos_politicos) → síntesis macro

Todas las funciones:
  · Usan `@st.cache_data(ttl=...)` cuando se llaman desde una página.
  · Devuelven el dict normalizado del brain (ok, result, confidence, ...).
  · Si el brain falla, devuelven {ok: False, ...} sin crashear.
"""
from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Acceso al brain (lazy)
# ─────────────────────────────────────────────────────────────────

def _get_brain():
    try:
        from agents.brain import get_groq_brain
        return get_groq_brain()
    except Exception as exc:
        logger.warning("brain_enrichment: no disponible (%s)", exc)
        return None


def _safe_brain_call(method_name: str, **kwargs) -> dict[str, Any]:
    """Wrapper que nunca crashea — devuelve dict normalizado.

    Centralizar aquí el fallback evita que cada función repita el patrón.
    """
    brain = _get_brain()
    if brain is None:
        return {
            "ok": False, "result": None, "confidence": 0.0,
            "sources": [], "reasoning_steps": [],
            "model": "", "tokens_used": 0, "latency_ms": 0,
            "error": "brain no disponible",
        }
    method = getattr(brain, method_name, None)
    if method is None:
        return {
            "ok": False, "result": None, "confidence": 0.0,
            "sources": [], "reasoning_steps": [],
            "model": "", "tokens_used": 0, "latency_ms": 0,
            "error": f"método '{method_name}' no existe en brain",
        }
    try:
        return method(**kwargs)
    except Exception as exc:
        logger.exception("brain.%s falló", method_name)
        return {
            "ok": False, "result": None, "confidence": 0.0,
            "sources": [], "reasoning_steps": [],
            "model": "", "tokens_used": 0, "latency_ms": 0,
            "error": f"{type(exc).__name__}: {str(exc)[:300]}",
        }


# ─────────────────────────────────────────────────────────────────
# Helpers de DataFrame → texto
# ─────────────────────────────────────────────────────────────────

def _df_resumen_texto(df, max_filas: int = 25) -> str:
    """Convierte un DataFrame a un texto compacto interpretable por el LLM.

    No vuelca el CSV — escoge columnas relevantes y formatea como tabla
    markdown comprimida.
    """
    try:
        import pandas as pd
    except ImportError:
        return str(df)[:5000]
    if df is None:
        return ""
    if not hasattr(df, "head"):
        return str(df)[:5000]
    sample = df.head(int(max_filas))
    try:
        return sample.to_markdown(index=False)[:6000]
    except Exception:
        return sample.to_string(index=False)[:6000]


def _to_json_str(obj: Any, max_chars: int = 6000) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, indent=2, default=str)[:max_chars]
    except Exception:
        return str(obj)[:max_chars]


# ─────────────────────────────────────────────────────────────────
# Funciones públicas — interpretación
# ─────────────────────────────────────────────────────────────────

def interpretar_dataframe(
    df,
    *,
    intent: str = "lectura ejecutiva",
    context: str = "",
    max_filas: int = 25,
) -> dict[str, Any]:
    """Pide al brain una lectura razonada de un DataFrame.

    Reutiliza `interpret_simulation_results` (ya devuelve takeaway + drivers
    + surprises + acciones) porque es la tool más versátil para "explica este
    payload tabular".
    """
    return _safe_brain_call(
        "interpret_simulation_results",
        simulation_type=intent or "tabla de datos",
        inputs_summary=context or "DataFrame del dashboard",
        results_payload=_df_resumen_texto(df, max_filas=max_filas),
        audience="analista político",
    )


def interpretar_payload(
    payload: Any,
    *,
    intent: str = "lectura ejecutiva",
    context: str = "",
) -> dict[str, Any]:
    """Como `interpretar_dataframe` pero para dicts / listas / JSON."""
    return _safe_brain_call(
        "interpret_simulation_results",
        simulation_type=intent,
        inputs_summary=context,
        results_payload=_to_json_str(payload),
        audience="analista político",
    )


def sintetizar_titulares(
    df,
    *,
    col_titular: str,
    col_medio: str | None = None,
    col_fecha: str | None = None,
    topic: str = "",
    ventana: str = "última semana",
    max_pieces: int = 25,
) -> dict[str, Any]:
    """Convierte una lista de titulares en una narrativa unificada."""
    try:
        import pandas as pd  # noqa: F401
    except ImportError:
        return {"ok": False, "error": "pandas no disponible"}
    if df is None or len(df) == 0:
        return {"ok": False, "error": "no hay titulares"}
    pieces: list[str] = []
    for _, row in df.head(int(max_pieces)).iterrows():
        titular = str(row.get(col_titular) or "").strip()
        if not titular:
            continue
        prefix_bits = []
        if col_fecha and row.get(col_fecha) is not None:
            prefix_bits.append(str(row.get(col_fecha))[:10])
        if col_medio and row.get(col_medio):
            prefix_bits.append(str(row.get(col_medio)))
        prefix = " · ".join(prefix_bits)
        pieces.append(f"[{prefix}] {titular}" if prefix else titular)
    if not pieces:
        return {"ok": False, "error": "tras filtrar, no quedan titulares"}
    return _safe_brain_call(
        "analyze_narrative",
        pieces=pieces,
        topic=topic,
        time_window=ventana,
    )


def perfil_rapido_actor(
    nombre: str,
    *,
    rol: str = "",
    hechos_recientes: list[str] | str = "",
    declaraciones: list[str] | None = None,
) -> dict[str, Any]:
    """Perfil 360 de un actor político."""
    return _safe_brain_call(
        "build_actor_profile",
        actor_name=nombre,
        role=rol,
        known_facts=hechos_recientes,
        recent_statements=declaraciones or [],
    )


def escenario_rapido(
    tema: str,
    situacion: str,
    *,
    horizonte: str = "3-6 meses",
    restricciones: list[str] | None = None,
) -> dict[str, Any]:
    """4 escenarios (base/optimista/pesimista/cisne negro) con prob, triggers,
    consecuencias y watch list."""
    return _safe_brain_call(
        "forecast_political_scenario",
        topic=tema,
        current_situation=situacion,
        time_horizon=horizonte,
        constraints=restricciones or [],
    )


def explicar_resultado_simulacion(
    sim_type: str,
    inputs_summary: str,
    results_payload: Any,
    *,
    audience: str = "analista político",
) -> dict[str, Any]:
    """Lectura razonada del output de un simulador."""
    return _safe_brain_call(
        "interpret_simulation_results",
        simulation_type=sim_type,
        inputs_summary=inputs_summary,
        results_payload=results_payload,
        audience=audience,
    )


def explicar_serie_temporal(
    serie: dict[str, Any] | list[dict[str, Any]] | Any,
    *,
    etiqueta: str = "serie",
    ventana: str = "30 días",
    eventos_recientes: list[str] | None = None,
) -> dict[str, Any]:
    """Lectura de una serie temporal (intención de voto, ratings, alcance,
    sentimiento…).

    Internamente usa `interpret_nowcasting` porque ya devuelve big_movers +
    drivers + watch_next, que es exactamente lo que queremos para series.
    """
    payload = serie if isinstance(serie, (dict, list)) else _to_json_str(serie)
    return _safe_brain_call(
        "interpret_nowcasting",
        nowcast_payload=payload,
        previous_nowcast_payload={},
        recent_events=eventos_recientes or [],
    )


def lectura_macro(
    macro: dict[str, Any] | str,
    *,
    eventos_politicos: list[str] | None = None,
    sector_signals: dict[str, Any] | str = "",
    horizonte: str = "trimestre",
) -> dict[str, Any]:
    """Síntesis macro × política (devuelve markdown extenso)."""
    return _safe_brain_call(
        "generate_macro_political_synthesis",
        macro_indicators=macro,
        political_events=eventos_politicos or [],
        sector_signals=sector_signals,
        horizon=horizonte,
    )


def explicar_riesgo_electoral(
    partido: str,
    evento: str,
    *,
    polls_summary: str = "",
    contexto: str = "",
) -> dict[str, Any]:
    """Impacto electoral esperado sobre un partido."""
    return _safe_brain_call(
        "assess_electoral_risk",
        party=partido,
        risk_event=evento,
        polls_summary=polls_summary,
        narrative_context=contexto,
    )


def evaluar_coalicion(
    partidos: list[str],
    escanos: dict[str, int],
    *,
    contexto: str = "",
    lineas_rojas: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    """Viabilidad aritmética + ideológica + política de una coalición."""
    return _safe_brain_call(
        "analyze_coalition_viability",
        proposed_coalition=partidos,
        seats_by_party=escanos,
        context=contexto,
        red_lines=lineas_rojas or {},
    )


def oposicion_rapida(
    rival: str,
    posicion_cliente: str,
    *,
    acciones_recientes: list[str] | None = None,
    ventana: str = "últimos 6 meses",
) -> dict[str, Any]:
    """Opposition research desde la posición del cliente."""
    return _safe_brain_call(
        "opposition_research",
        target_actor=rival,
        client_position=posicion_cliente,
        recent_actions=acciones_recientes or [],
        time_window=ventana,
    )


def voto_blando(
    partido: str,
    *,
    territorio: str = "España",
    encuestas_resumen: str = "",
    segmentos: dict[str, Any] | str = "",
) -> dict[str, Any]:
    """Segmentos blandos + mensajes persuasivos + canales."""
    return _safe_brain_call(
        "analyze_soft_vote",
        party=partido,
        territory=territorio,
        polls_summary=encuestas_resumen,
        segments_data=segmentos,
    )


def impacto_geopolitico(
    evento: str,
    *,
    region: str = "España",
    sectores: list[str] | None = None,
    horizonte: str = "3-12 meses",
) -> dict[str, Any]:
    """Impacto directo + indirecto + sectores afectados + recomendaciones."""
    return _safe_brain_call(
        "geopolitical_impact",
        event=evento,
        region=region,
        sectors=sectores or [],
        time_horizon=horizonte,
    )


def briefing(
    titulo: str,
    fecha: str,
    secciones_contexto: dict[str, str] | str,
    *,
    audiencia: str = "directivos políticos y CEOs",
    longitud: str = "medio",
) -> dict[str, Any]:
    """Briefing estructurado con executive_summary + secciones + actions."""
    return _safe_brain_call(
        "generate_briefing",
        title=titulo,
        date=fecha,
        sections_context=secciones_contexto,
        audience=audiencia,
        length=longitud,
    )


def alerta(
    evento: str,
    *,
    urgencia: str = "media",
    contexto: str = "",
    destinatario: str = "responsable de comunicación",
) -> dict[str, Any]:
    """Alerta accionable (qué pasó, por qué importa, qué hacer, plazo)."""
    return _safe_brain_call(
        "generate_alert",
        event=evento,
        urgency=urgencia,
        context=contexto,
        recipient_role=destinatario,
    )


def borrador(
    tipo: str,
    objetivo: str,
    mensajes_clave: list[str] | str,
    *,
    restricciones: list[str] | None = None,
    tono: str = "institucional",
    audiencia: str = "general",
) -> dict[str, Any]:
    """Borrador comunicacional (NUNCA publica · marca requires_human_review)."""
    return _safe_brain_call(
        "draft_communication",
        comm_type=tipo,
        objective=objetivo,
        key_messages=mensajes_clave,
        constraints=restricciones or [],
        tone=tono,
        audience=audiencia,
    )


def war_room(
    situacion: str,
    *,
    senales: list[str] | str = "",
    movimientos_adversario: list[str] | str = "",
    activos_cliente: list[str] | str = "",
    plazo: str = "24h",
) -> dict[str, Any]:
    """Resumen ejecutivo de war room (markdown extenso)."""
    return _safe_brain_call(
        "generate_war_room_summary",
        situation=situacion,
        signals=senales,
        adversary_moves=movimientos_adversario,
        client_assets=activos_cliente,
        time_pressure=plazo,
    )


def lecciones(
    evento: str,
    *,
    acciones: list[str] | str,
    resultados: list[str] | str,
    contexto: str = "",
) -> dict[str, Any]:
    """Lecciones accionables post-evento."""
    return _safe_brain_call(
        "extract_lessons_learned",
        event_summary=evento,
        actions_taken=acciones,
        outcomes=resultados,
        context=contexto,
    )


def validar_prediccion(
    prediccion: str,
    fecha_prediccion: str,
    observado: str,
    fecha_observado: str,
) -> dict[str, Any]:
    """Compara una predicción pasada con lo observado · calibration_score."""
    return _safe_brain_call(
        "validate_prediction",
        prediction_summary=prediccion,
        prediction_date=fecha_prediccion,
        observed_outcome=observado,
        observed_date=fecha_observado,
    )
