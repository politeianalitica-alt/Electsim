"""
Widget Streamlit para el estado del pipeline Celery.
Importado por dashboard/Home.py.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# helpers de presentacion sin emojis
# ---------------------------------------------------------------------------

def _dot(estado: str) -> str:
    """Devuelve un span HTML coloreado segun el estado del servicio."""
    colores = {
        "OK":         "#10B981",  # verde
        "DEGRADADO":  "#F59E0B",  # amarillo
        "DESCONOCIDO": "#6B7280", # gris
    }
    # cualquier cosa que empiece por ERROR -> rojo
    color = "#EF4444" if estado.startswith("ERROR") else colores.get(estado, "#6B7280")
    return f'<span style="color:{color};font-size:1rem">&#9679;</span>'


def _etiqueta(estado: str) -> str:
    if estado == "OK":
        return "OK"
    if estado == "DEGRADADO":
        return "DEGRADADO"
    if estado.startswith("ERROR"):
        return "ERROR"
    return estado or "DESCONOCIDO"


def _ts_legible(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
        ahora = datetime.now(timezone.utc)
        delta = int((ahora - dt).total_seconds())
        if delta < 60:
            return f"hace {delta}s"
        if delta < 3600:
            return f"hace {delta // 60}min"
        return dt.strftime("%H:%M")
    except Exception:
        return iso or "—"


# ---------------------------------------------------------------------------
# lectura de estado desde Redis
# ---------------------------------------------------------------------------

def _leer_healthcheck() -> dict[str, Any]:
    """Intenta leer el ultimo healthcheck almacenado en Redis."""
    try:
        import redis as _redis
        from config.settings import get_settings
        cfg = get_settings()
        rc = _redis.from_url(cfg.redis_url, decode_responses=True)
        raw = rc.get("electsim:healthcheck")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug("No se pudo leer healthcheck de Redis: %s", e)
    return {}


def _leer_stats_redis() -> dict[str, Any]:
    """Lee contadores de pipeline guardados en Redis."""
    stats: dict[str, Any] = {}
    try:
        import redis as _redis
        from config.settings import get_settings
        cfg = get_settings()
        rc = _redis.from_url(cfg.redis_url, decode_responses=True)
        claves = [
            "electsim:stats:articulos_hoy",
            "electsim:stats:ollama_procesados_hoy",
            "electsim:stats:briefings_hoy",
            "electsim:stats:fimi_alertas_activas",
        ]
        valores = rc.mget(claves)
        for clave, val in zip(claves, valores):
            nombre = clave.split(":")[-1]
            stats[nombre] = int(val) if val and val.isdigit() else 0
    except Exception:
        pass
    return stats


# ---------------------------------------------------------------------------
# Widget principal
# ---------------------------------------------------------------------------

def render_pipeline_status() -> None:
    """
    Renderiza el panel de estado del pipeline.
    Llamar desde cualquier pagina del dashboard.
    """
    import streamlit as st

    try:
        from dashboard.shared import BG2, BG3, BORDER, CYAN, TEXT, TEXT2, MUTED
    except ImportError:
        BG2 = "#1e2030"; BG3 = "#252840"; BORDER = "#2d3158"
        CYAN = "#22d3ee"; TEXT = "#e2e8f0"; TEXT2 = "#94a3b8"; MUTED = "#64748b"

    hc = _leer_healthcheck()
    stats = _leer_stats_redis()

    ts = hc.get("timestamp", "")
    ts_str = _ts_legible(ts) if ts else "sin datos"

    pg_estado = hc.get("postgres", "DESCONOCIDO")
    rd_estado = hc.get("redis", "DESCONOCIDO")
    ol_estado = hc.get("ollama", "DESCONOCIDO")

    # --- cabecera ---
    nivel_global = hc.get("nivel", "DESCONOCIDO")
    color_global = "#10B981" if nivel_global == "OK" else (
        "#F59E0B" if nivel_global == "DEGRADADO" else "#6B7280"
    )

    st.markdown(
        f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;
                    padding:1rem 1.2rem;margin-bottom:.8rem">
          <div style="display:flex;justify-content:space-between;align-items:center;
                      margin-bottom:.6rem">
            <span style="font-size:.95rem;font-weight:700;color:{TEXT}">
              Estado del pipeline
            </span>
            <span style="font-size:.7rem;color:{MUTED}">{ts_str}</span>
          </div>
          <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
            <div>
              {_dot(pg_estado)}
              <span style="font-size:.78rem;color:{TEXT2};margin-left:.3rem">
                PostgreSQL <b style="color:{TEXT}">{_etiqueta(pg_estado)}</b>
              </span>
            </div>
            <div>
              {_dot(rd_estado)}
              <span style="font-size:.78rem;color:{TEXT2};margin-left:.3rem">
                Redis <b style="color:{TEXT}">{_etiqueta(rd_estado)}</b>
              </span>
            </div>
            <div>
              {_dot(ol_estado)}
              <span style="font-size:.78rem;color:{TEXT2};margin-left:.3rem">
                Ollama <b style="color:{TEXT}">{_etiqueta(ol_estado)}</b>
              </span>
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # --- KPIs de pipeline (si hay datos) ---
    if stats:
        cols = st.columns(4)
        kpis = [
            ("Articulos hoy",       stats.get("articulos_hoy", 0),           CYAN),
            ("Procesados Ollama",   stats.get("ollama_procesados_hoy", 0),    "#A78BFA"),
            ("Briefings hoy",       stats.get("briefings_hoy", 0),           "#34D399"),
            ("Alertas FIMI activas",stats.get("fimi_alertas_activas", 0),    "#F87171"),
        ]
        for col, (etiqueta, valor, color) in zip(cols, kpis):
            with col:
                st.markdown(
                    f"""
                    <div style="background:{BG3};border:1px solid {BORDER};
                                border-radius:8px;padding:.6rem .8rem;text-align:center">
                      <div style="font-size:1.4rem;font-weight:900;color:{color}">{valor}</div>
                      <div style="font-size:.65rem;color:{MUTED};margin-top:.1rem">{etiqueta}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
