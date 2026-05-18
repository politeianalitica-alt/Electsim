"""
GroqBrain Panel · Componente reutilizable para inyectar razonamiento Groq
en cualquier página del dashboard.

Filosofía:
  · Si hay datos → render_brain_panel(...) los interpreta con Groq.
  · Si hay decisión → render_brain_panel(...) la razona.
  · Si hay output → render_brain_panel(...) lo explica.

Uso típico en una página:

    from dashboard.components.groq_brain_panel import render_brain_panel

    # Tras mostrar una tabla / gráfico / simulación …
    render_brain_panel(
        tool="analyze_narrative",
        title="Análisis IA · narrativa de la semana",
        kwargs={
            "pieces": titulares_lista,
            "topic": "amnistía",
            "time_window": "última semana",
        },
        ttl_seconds=300,
    )

El componente:
  · Hace `st.cache_data(ttl=...)` sobre la llamada al brain.
  · Muestra `st.spinner` mientras espera.
  · Renderiza el resultado en cards + JSON expandible.
  · Captura errores: nunca rompe la página.
  · Si LLM no disponible, muestra aviso suave (no error rojo).
"""
from __future__ import annotations

import json
from typing import Any

import streamlit as st

try:
    from dashboard.shared import (
        BG2, BG3, BORDER, BLUE, PURPLE, GREEN, AMBER, RED, TEXT, TEXT2, MUTED,
    )
except ImportError:
    BG2 = "#0d1117"; BG3 = "#161b22"; BORDER = "#30363d"
    BLUE = "#1565c0"; PURPLE = "#7c3aed"; AMBER = "#f59e0b"
    RED = "#ef4444"; GREEN = "#22c55e"
    TEXT = "#f0f6fc"; TEXT2 = "#c9d1d9"; MUTED = "#8b949e"


# ─────────────────────────────────────────────────────────────────
# Helpers cacheables (la firma debe ser hashable)
# ─────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def _cached_brain_call(tool: str, kwargs_json: str) -> dict[str, Any]:
    """Llama al brain de forma cacheable. Acepta JSON serializado para hashing."""
    from agents.brain import get_groq_brain
    try:
        kwargs = json.loads(kwargs_json) if kwargs_json else {}
    except (ValueError, TypeError):
        kwargs = {}
    brain = get_groq_brain()
    method = getattr(brain, tool, None)
    if method is None:
        return {
            "ok": False,
            "error": f"Tool desconocida: {tool}",
            "result": None,
            "confidence": 0.0,
            "sources": [],
            "reasoning_steps": [],
            "model": "",
            "tokens_used": 0,
            "latency_ms": 0,
        }
    try:
        return method(**kwargs)
    except Exception as exc:
        return {
            "ok": False,
            "error": f"{type(exc).__name__}: {str(exc)[:300]}",
            "result": None,
            "confidence": 0.0,
            "sources": [],
            "reasoning_steps": [],
            "model": "",
            "tokens_used": 0,
            "latency_ms": 0,
        }


# ─────────────────────────────────────────────────────────────────
# Render principal
# ─────────────────────────────────────────────────────────────────

def render_brain_panel(
    *,
    tool: str,
    title: str = "Análisis IA",
    kwargs: dict[str, Any] | None = None,
    ttl_seconds: int = 300,
    auto_run: bool = True,
    key: str | None = None,
    show_raw: bool = False,
) -> dict[str, Any] | None:
    """Inyecta un bloque de razonamiento Groq en la página actual.

    Parámetros:
      tool         — nombre del método del brain (ej: "analyze_narrative")
      title        — encabezado del panel
      kwargs       — argumentos para la tool
      ttl_seconds  — TTL del caché Streamlit (por defecto 5 min)
      auto_run     — si True ejecuta nada más renderizar; si False, botón
      key          — clave Streamlit única (auto generada si None)
      show_raw     — incluye expander con respuesta cruda del LLM

    Devuelve: el dict normalizado del brain (o None si auto_run=False y aún
    no se ha pulsado el botón).
    """
    key = key or f"brain_panel_{tool}"
    kwargs = dict(kwargs or {})

    # Header
    st.markdown(
        f"""
<div style="background:linear-gradient(135deg,{PURPLE}15 0%,{BLUE}08 100%);
            border:1px solid {BORDER};border-left:4px solid {PURPLE};
            border-radius:10px;padding:.9rem 1.1rem;margin:.8rem 0 .6rem">
  <div style="font-size:.7rem;color:{PURPLE};font-weight:800;
              letter-spacing:.14em;text-transform:uppercase">{title}</div>
  <div style="font-size:.78rem;color:{MUTED};margin-top:.2rem">
    Powered by Groq · LLaMA 3.3 70B · tool <code>{tool}</code>
  </div>
</div>
""",
        unsafe_allow_html=True,
    )

    # Ejecutar
    run_now = False
    if auto_run:
        run_now = True
    else:
        if st.button(f"Ejecutar {tool}", key=f"{key}_btn", use_container_width=False):
            run_now = True

    if not run_now:
        return None

    try:
        kwargs_json = json.dumps(kwargs, ensure_ascii=False, sort_keys=True, default=str)
    except (TypeError, ValueError):
        kwargs_json = "{}"

    # Aplicamos un TTL dinámico envolviendo la función cacheada
    @st.cache_data(ttl=ttl_seconds, show_spinner=False)
    def _wrapped(tool_name: str, kjson: str) -> dict[str, Any]:
        return _cached_brain_call(tool_name, kjson)

    with st.spinner(f"Razonando con Groq…  ({tool})"):
        out = _wrapped(tool, kwargs_json)

    _render_brain_output(out, show_raw=show_raw, key_prefix=key)
    return out


# ─────────────────────────────────────────────────────────────────
# Render de la salida normalizada
# ─────────────────────────────────────────────────────────────────

def _render_brain_output(out: dict[str, Any], *, show_raw: bool, key_prefix: str) -> None:
    if not isinstance(out, dict):
        st.warning("Respuesta del brain con formato inesperado.")
        return

    if not out.get("ok"):
        # Aviso suave (no error rojo) — el dashboard NUNCA debe romperse
        err = out.get("error") or "error desconocido"
        st.warning(f"IA no disponible ahora — {err}")
        return

    # KPIs
    c1, c2, c3, c4 = st.columns(4)
    conf = float(out.get("confidence") or 0.0)
    conf_color = GREEN if conf >= 0.7 else (AMBER if conf >= 0.4 else RED)
    c1.markdown(
        f"<div style='color:{MUTED};font-size:.7rem;letter-spacing:.1em;"
        f"text-transform:uppercase'>Confianza</div>"
        f"<div style='font-size:1.4rem;font-weight:800;color:{conf_color}'>"
        f"{conf:.2f}</div>",
        unsafe_allow_html=True,
    )
    c2.markdown(
        f"<div style='color:{MUTED};font-size:.7rem;letter-spacing:.1em;"
        f"text-transform:uppercase'>Latencia</div>"
        f"<div style='font-size:1.4rem;font-weight:800'>{int(out.get('latency_ms') or 0)} ms</div>",
        unsafe_allow_html=True,
    )
    c3.markdown(
        f"<div style='color:{MUTED};font-size:.7rem;letter-spacing:.1em;"
        f"text-transform:uppercase'>Tokens estimados</div>"
        f"<div style='font-size:1.4rem;font-weight:800'>{int(out.get('tokens_used') or 0)}</div>",
        unsafe_allow_html=True,
    )
    c4.markdown(
        f"<div style='color:{MUTED};font-size:.7rem;letter-spacing:.1em;"
        f"text-transform:uppercase'>Modelo</div>"
        f"<div style='font-size:.85rem;font-weight:700;color:{TEXT2}'>{out.get('model') or '—'}</div>",
        unsafe_allow_html=True,
    )

    if out.get("from_fallback"):
        st.info("El LLM devolvió texto no-JSON · se muestra raw debajo.")

    result = out.get("result")

    # Estrategia de render: si es dict razonable, vista friendly + JSON.
    # Si es str, markdown.
    if isinstance(result, str):
        st.markdown(result)
    elif isinstance(result, (dict, list)):
        _render_dict_friendly(result)
        with st.expander("Ver estructura completa (JSON)", expanded=False):
            st.json(result)
    else:
        st.write(result)

    # Razonamiento
    rs = out.get("reasoning_steps") or []
    if rs:
        with st.expander("Ver razonamiento", expanded=False):
            for i, step in enumerate(rs, 1):
                st.markdown(f"**{i}.** {step}")

    # Sources / citas
    srcs = out.get("sources") or []
    if srcs:
        with st.expander(f"Fuentes citadas ({len(srcs)})", expanded=False):
            for s in srcs:
                st.markdown(f"- {s}")

    # Raw
    if show_raw and out.get("raw"):
        with st.expander("Respuesta cruda del LLM", expanded=False):
            st.code(out["raw"], language="json")


def _render_dict_friendly(d: Any) -> None:
    """Heurística mínima: muestra claves de primer nivel destacadas."""
    if not isinstance(d, dict):
        st.write(d)
        return
    # Claves "narrativas" que merecen render destacado
    for key in ("headline", "title", "executive_summary", "executive_takeaway",
                "synthesis", "narrative_name", "core_claim", "summary_one_liner"):
        if key in d and isinstance(d[key], str) and d[key]:
            st.markdown(f"### {d[key]}")
            break

    # Resto de claves: pares clave-valor simples → en columnas
    simple = {k: v for k, v in d.items()
              if isinstance(v, (str, int, float, bool))
              and k not in ("confidence", "model", "tokens_used", "latency_ms")}
    if simple:
        for k, v in simple.items():
            st.markdown(f"- **{k}:** {v}")

    # Listas cortas → bullets
    lists_to_show = ("key_points", "today_actions", "watch_next", "watch_list",
                     "recommended_actions", "key_lessons", "what_worked",
                     "what_failed", "top_lessons", "vulnerabilities",
                     "attack_vectors", "early_indicators", "drivers",
                     "supporting_arguments", "big_movers", "scenarios",
                     "soft_voter_segments", "persuasive_messages",
                     "signals", "recommended_checks")
    for key in lists_to_show:
        val = d.get(key)
        if isinstance(val, list) and val:
            st.markdown(f"**{key.replace('_', ' ').capitalize()}**")
            for item in val:
                if isinstance(item, dict):
                    label = item.get("name") or item.get("action") or item.get("lesson") \
                            or item.get("vector") or item.get("driver") \
                            or item.get("type") or item.get("partido") \
                            or item.get("signal") or json.dumps(item, ensure_ascii=False)[:80]
                    st.markdown(f"- {label}")
                else:
                    st.markdown(f"- {item}")
