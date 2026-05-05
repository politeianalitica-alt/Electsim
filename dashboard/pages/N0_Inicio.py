"""
POLITEIA INTELLIGENCE — Command Center v3
Homepage personalizada: briefing matinal, pulso operativo, intel en tiempo real.
"""
from __future__ import annotations

import html as _html_mod
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ── set_page_config DEBE ser la primera llamada Streamlit ─────────────────────
import streamlit as st

st.set_page_config(
    page_title="Command Center — ElectSim España",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Imports compartidos ───────────────────────────────────────────────────────
try:
    from dashboard.shared import (
        sidebar_nav,
        mostrar_alertas_pagina,
        aplicar_estilos,
        BG, BG2, BG3, BORDER,
        CYAN, CYAN2, BLUE, PURPLE,
        TEXT, TEXT2, MUTED,
        GREEN, AMBER, RED,
        COLORES_PARTIDOS,
        kpi_card,
        section_header,
        safe_float,
        apply_plotly_theme,
        metric_delta_card,
        signal_card,
    )
except Exception as _e_shared:
    st.error(f"Error cargando shared.py: {_e_shared}")
    st.stop()

# ── Auth (degradacion graciosa si el modulo aun no existe) ───────────────────
_current_user: dict = {}
try:
    from dashboard.components.user_widget import get_current_user, require_auth  # type: ignore
    require_auth()
    _current_user = get_current_user() or {}
except Exception:
    _current_user = {
        "first_name": "Analista",
        "role": "analyst",
        "email": "demo@electsim.es",
    }

# ── Sidebar y estilos ─────────────────────────────────────────────────────────
sidebar_nav()
mostrar_alertas_pagina("inicio")
try:
    aplicar_estilos()
except Exception:
    pass

# ── Morning Briefing ──────────────────────────────────────────────────────────
try:
    from services.intelligence.morning_briefing_engine import (
        build_morning_briefing,
        get_cached_briefing,
    )
    morning_briefing = build_morning_briefing(
        tenant_id=str(_current_user.get("tenant_id", "demo")),
        workspace_id=str(_current_user.get("workspace_id", "ws_espana_2026")),
    )
except Exception as _e_mb:
    # Importacion de emergencia inline si el modulo tiene problemas de ruta
    try:
        import importlib.util
        _spec = importlib.util.spec_from_file_location(
            "morning_briefing_engine",
            str(_ROOT / "services" / "intelligence" / "morning_briefing_engine.py"),
        )
        _mod = importlib.util.module_from_spec(_spec)  # type: ignore
        _spec.loader.exec_module(_mod)  # type: ignore
        morning_briefing = _mod.build_morning_briefing("demo", "ws_espana_2026")
    except Exception:
        morning_briefing = None  # type: ignore

# Accesores seguros sobre el briefing
def _bget(key: str, default=None):
    if morning_briefing is None:
        return default
    return getattr(morning_briefing, key, default)


_KEY_ALERTS: list[dict] = _bget("key_alerts", [])
_TOP_STORIES: list[dict] = _bget("top_stories", [])
_NARRATIVES: list[dict] = _bget("active_narratives", [])
_RISK_SIGNALS: list[dict] = _bget("risk_signals", [])
_LEGISLATIVE: list[dict] = _bget("legislative_updates", [])
_ELECTORAL: dict = _bget("electoral_snapshot", {})
_THREE_QS: list[str] = _bget("three_questions", [])
_EXEC_SUMMARY: str = _bget("executive_summary", "Resumen no disponible.")
_ANALYST_NOTE: str = _bget("analyst_note", "")
_MODE: str = _bget("mode", "demo")

# ── Saludo personalizado ──────────────────────────────────────────────────────
_ahora = datetime.now(tz=timezone.utc)
_hora = _ahora.hour
_first_name = str(_current_user.get("first_name", "Analista"))
_role_label = str(_current_user.get("role", "analyst")).replace("_", " ").upper()

if _hora < 12:
    _saludo = "Buenos dias"
elif _hora < 20:
    _saludo = "Buenas tardes"
else:
    _saludo = "Buenas noches"

_DIAS_ES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]
_MESES_ES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]
_fecha_formateada = (
    f"{_DIAS_ES[_ahora.weekday()]}, "
    f"{_ahora.day} de {_MESES_ES[_ahora.month]} de {_ahora.year}"
)

_mode_badge = (
    f'<span style="background:#0e2a0a;color:{GREEN};font-size:.6rem;'
    f'font-weight:700;padding:.15rem .5rem;border-radius:4px;letter-spacing:.08em;'
    f'border:1px solid {GREEN}44">DATOS REALES</span>'
    if _MODE == "real"
    else
    f'<span style="background:#1a1200;color:{AMBER};font-size:.6rem;'
    f'font-weight:700;padding:.15rem .5rem;border-radius:4px;letter-spacing:.08em;'
    f'border:1px solid {AMBER}44">MODO DEMO</span>'
)

# ══════════════════════════════════════════════════════════════════════════════
# LIVE TICKER — datos en tiempo real (hace que la plataforma se sienta viva)
# ══════════════════════════════════════════════════════════════════════════════
try:
    from services.intelligence.live_ticker import get_ticker_html as _get_ticker_html
    _ticker_html = _get_ticker_html(tenant_id if "tenant_id" in dir() else "demo")
    st.markdown(_ticker_html, unsafe_allow_html=True)
except Exception:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# CABECERA PERSONALIZADA
# ══════════════════════════════════════════════════════════════════════════════

st.markdown(
    f"""
    <div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {CYAN};
    border-radius:12px;padding:1.2rem 1.6rem;margin-bottom:1rem;
    display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.8rem">
      <div>
        <div style="font-size:1.5rem;font-weight:700;color:{TEXT};letter-spacing:-.01em">
          {_saludo}, <span style="color:{CYAN}">{_html_mod.escape(_first_name)}</span>
        </div>
        <div style="font-size:.75rem;color:{TEXT2};margin-top:.2rem">{_fecha_formateada}</div>
      </div>
      <div style="display:flex;align-items:center;gap:.8rem">
        <span style="background:{BLUE}22;color:{BLUE};font-size:.62rem;font-weight:700;
          padding:.2rem .6rem;border-radius:6px;letter-spacing:.08em;
          border:1px solid {BLUE}44">{_role_label}</span>
        {_mode_badge}
        <span style="font-size:.6rem;color:{MUTED}">{_ahora.strftime('%H:%M UTC')}</span>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ══════════════════════════════════════════════════════════════════════════════
# SECCION 1: MORNING BRIEFING BANNER
# ══════════════════════════════════════════════════════════════════════════════

_n_alerts = len(_KEY_ALERTS)
_n_stories = len(_TOP_STORIES)
_n_risks = len(_RISK_SIGNALS)

# KPI bubbles
def _kpi_bubble(value: str, label: str, color: str) -> str:
    return (
        f'<div style="text-align:center;padding:.6rem 1rem;background:{BG3};'
        f'border-radius:10px;border:1px solid {color}33;min-width:80px">'
        f'<div style="font-size:1.4rem;font-weight:800;color:{color};'
        f'font-family:JetBrains Mono,monospace">{value}</div>'
        f'<div style="font-size:.58rem;color:{MUTED};margin-top:.1rem;'
        f'letter-spacing:.06em;text-transform:uppercase">{label}</div>'
        f'</div>'
    )

_bubbles_html = (
    _kpi_bubble(str(_n_alerts), "Alertas", RED if _n_alerts >= 2 else AMBER)
    + _kpi_bubble(str(_n_stories), "Noticias", CYAN)
    + _kpi_bubble(str(_n_risks), "Riesgos", AMBER)
)

# Resumen truncado (aprox 3 lineas)
_summary_preview = _EXEC_SUMMARY[:340].replace("\n\n", " ").replace("\n", " ")
if len(_EXEC_SUMMARY) > 340:
    _summary_preview += "..."

# Preguntas estrategicas
_qs_html = ""
for i, q in enumerate(_THREE_QS[:3], 1):
    _qs_html += (
        f'<div style="display:flex;gap:.6rem;margin-top:.4rem;align-items:flex-start">'
        f'<span style="color:{CYAN};font-weight:700;font-size:.7rem;'
        f'font-family:JetBrains Mono,monospace;flex-shrink:0;margin-top:.05rem">{i}.</span>'
        f'<span style="font-size:.72rem;color:{TEXT2};line-height:1.4">'
        f'{_html_mod.escape(q)}</span>'
        f'</div>'
    )

st.markdown(
    f"""
    <div style="background:{BG2};border:1px solid {CYAN}26;border-radius:12px;
    padding:1.4rem 1.6rem;margin-bottom:1rem">
      <div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap">
        <!-- Izquierda: briefing -->
        <div style="flex:3;min-width:260px">
          <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem">
            <span style="font-size:.6rem;font-weight:800;color:{CYAN};
              letter-spacing:.14em;text-transform:uppercase;font-variant:small-caps">
              BRIEFING MATINAL
            </span>
            <span style="font-size:.6rem;color:{MUTED}">{_fecha_formateada}</span>
          </div>
          <div style="font-size:.78rem;color:{TEXT};line-height:1.55;margin-bottom:.8rem">
            {_html_mod.escape(_summary_preview)}
          </div>
          <div style="border-top:1px solid {BORDER};padding-top:.7rem">
            <div style="font-size:.6rem;color:{MUTED};font-weight:700;
              letter-spacing:.1em;text-transform:uppercase;margin-bottom:.3rem">
              Preguntas estrategicas
            </div>
            {_qs_html if _qs_html else '<span style="font-size:.7rem;color:{MUTED}">Sin preguntas disponibles.</span>'}
          </div>
        </div>
        <!-- Derecha: KPIs -->
        <div style="flex:1;min-width:240px;display:flex;gap:.6rem;
          align-items:center;justify-content:flex-end;flex-wrap:wrap">
          {_bubbles_html}
        </div>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ══════════════════════════════════════════════════════════════════════════════
# SECCION 2: INTEL FEED (3 columnas)
# ══════════════════════════════════════════════════════════════════════════════

col_alertas, col_noticias, col_narrativas = st.columns([1, 1, 1], gap="medium")

# ── Col 1: Alertas activas ────────────────────────────────────────────────────
with col_alertas:
    section_header("ALERTAS ACTIVAS", RED)

    _level_color = {
        "critical": RED, "high": RED, "medium": AMBER, "low": GREEN,
    }
    _level_label = {
        "critical": "CRITICO", "high": "ALTO", "medium": "MEDIO", "low": "BAJO",
    }

    if _KEY_ALERTS:
        for alert in _KEY_ALERTS[:4]:
            _lv = str(alert.get("level", "medium")).lower()
            _lc = _level_color.get(_lv, AMBER)
            _ll = _level_label.get(_lv, "MEDIO")
            _atitle = _html_mod.escape(str(alert.get("title", "—"))[:80])
            _abody = _html_mod.escape(str(alert.get("body", ""))[:160])
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};'
                f'border-left:3px solid {_lc};border-radius:8px;'
                f'padding:.65rem .9rem;margin-bottom:.4rem">'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem">'
                f'<span style="background:{_lc}22;color:{_lc};font-size:.55rem;'
                f'font-weight:800;padding:.1rem .35rem;border-radius:4px;'
                f'letter-spacing:.06em">{_ll}</span>'
                f'<span style="font-size:.72rem;font-weight:600;color:{TEXT};'
                f'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
                f'{_atitle}</span>'
                f'</div>'
                f'<div style="font-size:.66rem;color:{TEXT2};line-height:1.4">{_abody}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.markdown(
            f'<div style="font-size:.75rem;color:{MUTED};padding:.5rem">Sin alertas activas.</div>',
            unsafe_allow_html=True,
        )

    try:
        st.page_link("pages/D6_Alertas.py", label="Ver todas las alertas")
    except Exception:
        pass

# ── Col 2: Top noticias ───────────────────────────────────────────────────────
with col_noticias:
    section_header("TOP NOTICIAS", CYAN)

    if _TOP_STORIES:
        for story in _TOP_STORIES[:5]:
            _stitle = _html_mod.escape(str(story.get("title", "—"))[:90])
            _ssource = _html_mod.escape(str(story.get("source", "—")).upper())
            _srel = min(float(story.get("relevance", 0.5)), 1.0)
            _srel_pct = int(_srel * 100)
            _rel_color = GREEN if _srel >= 0.8 else (AMBER if _srel >= 0.6 else MUTED)

            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};'
                f'border-radius:8px;padding:.6rem .9rem;margin-bottom:.35rem">'
                f'<div style="font-size:.6rem;color:{MUTED};font-weight:600;'
                f'letter-spacing:.05em;margin-bottom:.2rem">{_ssource}</div>'
                f'<div style="font-size:.73rem;color:{TEXT};line-height:1.35;'
                f'font-weight:500;margin-bottom:.3rem">{_stitle}</div>'
                f'<div style="display:flex;align-items:center;gap:.5rem">'
                f'<div style="flex:1;height:3px;background:{BORDER};border-radius:2px">'
                f'<div style="height:3px;width:{_srel_pct}%;background:{_rel_color};border-radius:2px"></div>'
                f'</div>'
                f'<span style="font-size:.6rem;color:{_rel_color};font-weight:700;'
                f'font-family:JetBrains Mono,monospace">{_srel_pct}%</span>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.markdown(
            f'<div style="font-size:.75rem;color:{MUTED};padding:.5rem">Sin noticias disponibles.</div>',
            unsafe_allow_html=True,
        )

    try:
        st.page_link("pages/D7_Medios.py", label="Monitor de medios")
    except Exception:
        pass

# ── Col 3: Narrativas activas ─────────────────────────────────────────────────
with col_narrativas:
    section_header("NARRATIVAS ACTIVAS", PURPLE)

    _vel_icon = {"up": "&#9650;", "down": "&#9660;", "flat": "&#8212;"}
    _vel_color = {"up": RED, "down": GREEN, "flat": MUTED}
    _vel_label = {"up": "EN ALZA", "down": "BAJANDO", "flat": "ESTABLE"}

    if _NARRATIVES:
        for narr in _NARRATIVES[:4]:
            _nlabel = _html_mod.escape(str(narr.get("frame_label", "—"))[:60])
            _vel = str(narr.get("velocity", "flat")).lower()
            _vic = _vel_icon.get(_vel, "&#8212;")
            _vc = _vel_color.get(_vel, MUTED)
            _vl = _vel_label.get(_vel, "ESTABLE")
            _action = _html_mod.escape(str(narr.get("recommended_action", ""))[:120])

            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};'
                f'border-radius:8px;padding:.65rem .9rem;margin-bottom:.4rem">'
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.25rem">'
                f'<span style="font-size:1rem;color:{_vc};font-weight:700">{_vic}</span>'
                f'<div style="flex:1">'
                f'<div style="font-size:.73rem;font-weight:600;color:{TEXT};'
                f'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{_nlabel}</div>'
                f'<span style="font-size:.55rem;color:{_vc};font-weight:700;'
                f'letter-spacing:.06em">{_vl}</span>'
                f'</div>'
                f'</div>'
                f'<div style="font-size:.64rem;color:{MUTED};line-height:1.35">{_action}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.markdown(
            f'<div style="font-size:.75rem;color:{MUTED};padding:.5rem">Sin narrativas activas.</div>',
            unsafe_allow_html=True,
        )

    try:
        st.page_link("pages/D7_Medios.py", label="Tracker de narrativas")
    except Exception:
        pass

st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# SECCION 3: SNAPSHOT ELECTORAL (4 KPI cards)
# ══════════════════════════════════════════════════════════════════════════════

section_header("SNAPSHOT ELECTORAL", CYAN)

_top_parties = _ELECTORAL.get("top_parties", [
    {"partido": "PP", "pct": 33.2},
    {"partido": "PSOE", "pct": 28.5},
])
_itpe_val = float(_ELECTORAL.get("itpe", 52.3))
_pp_pct = next((p["pct"] for p in _top_parties if p["partido"] == "PP"), 33.2)
_psoe_pct = next((p["pct"] for p in _top_parties if p["partido"] == "PSOE"), 28.5)
_diff_pp_psoe = _pp_pct - _psoe_pct
_itpe_color = RED if _itpe_val >= 70 else (AMBER if _itpe_val >= 45 else GREEN)
_diff_color = GREEN if _diff_pp_psoe >= 5 else (AMBER if _diff_pp_psoe >= 2 else RED)

_kpi_snap1, _kpi_snap2, _kpi_snap3, _kpi_snap4 = st.columns(4)

with _kpi_snap1:
    st.markdown(
        metric_delta_card(
            label="Indice ITPE",
            value=f"{_itpe_val:.0f}",
            delta="Tension politico-electoral",
            delta_pct="/100",
            color=_itpe_color,
            sub=f"{'ALTO' if _itpe_val >= 70 else 'MEDIO' if _itpe_val >= 45 else 'BAJO'}",
        ),
        unsafe_allow_html=True,
    )

with _kpi_snap2:
    st.markdown(
        metric_delta_card(
            label="PP intencion de voto",
            value=f"{_pp_pct:.1f}%",
            delta="Primer partido",
            delta_pct="sondeos agregados",
            color=COLORES_PARTIDOS.get("PP", CYAN),
            sub="Estimacion ponderada",
        ),
        unsafe_allow_html=True,
    )

with _kpi_snap3:
    st.markdown(
        metric_delta_card(
            label="PSOE intencion de voto",
            value=f"{_psoe_pct:.1f}%",
            delta="Segundo partido",
            delta_pct="sondeos agregados",
            color=COLORES_PARTIDOS.get("PSOE", RED),
            sub="Estimacion ponderada",
        ),
        unsafe_allow_html=True,
    )

with _kpi_snap4:
    st.markdown(
        metric_delta_card(
            label="Diferencia PP - PSOE",
            value=f"{_diff_pp_psoe:+.1f}pp",
            delta="Brecha entre primeros",
            delta_pct="VENTAJA",
            color=_diff_color,
            sub=_ELECTORAL.get("trend", "Sondeos ponderados")[:50],
        ),
        unsafe_allow_html=True,
    )

st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# SECCION 4: SENALES DE RIESGO + ACTIVIDAD LEGISLATIVA
# ══════════════════════════════════════════════════════════════════════════════

col_risk, col_legis = st.columns([1, 1], gap="medium")

# ── Col izquierda: Risk signals ───────────────────────────────────────────────
with col_risk:
    section_header("SENALES DE RIESGO", RED)

    if _RISK_SIGNALS:
        for sig in _RISK_SIGNALS[:4]:
            _stitle_r = _html_mod.escape(str(sig.get("title", "—"))[:80])
            _prob = min(float(sig.get("probability", 0.5)), 1.0)
            _prob_pct = int(_prob * 100)
            _impact = str(sig.get("impact", "moderado")).lower()
            _desc = _html_mod.escape(str(sig.get("description", ""))[:160])
            _impact_color_map = {
                "critico": RED, "alto": RED, "moderado": AMBER,
                "bajo": GREEN, "critical": RED, "high": RED, "medium": AMBER, "low": GREEN,
            }
            _ic = _impact_color_map.get(_impact, AMBER)

            st.markdown(
                f'<div style="background:{BG3};border:1px solid {BORDER};'
                f'border-radius:8px;padding:.7rem .95rem;margin-bottom:.4rem">'
                f'<div style="display:flex;align-items:center;justify-content:space-between;'
                f'margin-bottom:.3rem">'
                f'<span style="font-size:.73rem;font-weight:600;color:{TEXT};flex:1;'
                f'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{_stitle_r}</span>'
                f'<span style="background:{_ic}22;color:{_ic};font-size:.55rem;font-weight:700;'
                f'padding:.1rem .35rem;border-radius:4px;letter-spacing:.06em;margin-left:.5rem;'
                f'flex-shrink:0">{_impact.upper()}</span>'
                f'</div>'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                f'<div style="flex:1;height:4px;background:{BORDER};border-radius:2px">'
                f'<div style="height:4px;width:{_prob_pct}%;background:{_ic};border-radius:2px"></div>'
                f'</div>'
                f'<span style="font-size:.62rem;color:{_ic};font-weight:700;'
                f'font-family:JetBrains Mono,monospace">{_prob_pct}%</span>'
                f'</div>'
                f'<div style="font-size:.66rem;color:{TEXT2};line-height:1.35">{_desc}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.markdown(
            f'<div style="font-size:.75rem;color:{MUTED};padding:.5rem">Sin senales de riesgo activas.</div>',
            unsafe_allow_html=True,
        )

# ── Col derecha: Actividad legislativa ────────────────────────────────────────
with col_legis:
    section_header("ACTIVIDAD LEGISLATIVA", BLUE)

    _legis_data = _LEGISLATIVE or [
        {"title": "RD 412/2026 — Vivienda asequible", "status": "Publicado BOE", "date": "02 may 2026"},
        {"title": "Reforma CGPJ — Pleno Congreso", "status": "En tramitacion", "date": "05 may 2026"},
        {"title": "Ley 8/2026 — Reforma pensiones", "status": "Aprobado Senado", "date": "30 abr 2026"},
    ]

    _status_color_map = {
        "publicado boe": GREEN, "aprobado": GREEN, "en tramitacion": AMBER,
        "pendiente": AMBER, "rechazado": RED, "retirado": RED,
    }

    for leg in _legis_data[:5]:
        _ltitle = _html_mod.escape(str(leg.get("title", "—"))[:85])
        _lstatus = str(leg.get("status", "—"))
        _ldate = str(leg.get("date", "—"))
        _lsc = _status_color_map.get(_lstatus.lower(), CYAN)

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};'
            f'border-left:3px solid {_lsc};border-radius:8px;'
            f'padding:.65rem .9rem;margin-bottom:.35rem">'
            f'<div style="display:flex;justify-content:space-between;'
            f'align-items:flex-start;gap:.4rem;margin-bottom:.25rem">'
            f'<span style="background:{_lsc}20;color:{_lsc};font-size:.55rem;'
            f'font-weight:700;padding:.1rem .35rem;border-radius:4px;'
            f'letter-spacing:.05em;white-space:nowrap">{_html_mod.escape(_lstatus).upper()}</span>'
            f'<span style="font-size:.6rem;color:{MUTED};white-space:nowrap">{_ldate}</span>'
            f'</div>'
            f'<div style="font-size:.72rem;color:{TEXT};font-weight:500;line-height:1.35">'
            f'{_ltitle}'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    try:
        st.page_link("pages/D4_Legislativo.py", label="Monitor legislativo completo")
    except Exception:
        pass

st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# SECCION 5: GRID DE ACCESO RAPIDO A MODULOS
# ══════════════════════════════════════════════════════════════════════════════

section_header("ACCESO RAPIDO — MODULOS", MUTED)

_MODULES = [
    ("D1_Briefings",     "Briefings",          "Inteligencia diaria y reportes ejecutivos",   "pages/D1_Briefings.py",    CYAN),
    ("D2_Actores",       "Mapa de Actores",     "Perfiles politicos y redes de influencia",    "pages/D2_Actores.py",      PURPLE),
    ("D3_Termometro",    "Termometro Riesgo",   "ITPE, riesgo politico y tension electoral",   "pages/D3_Termometro.py",   RED),
    ("D4_Legislativo",   "Monitor Legislativo", "BOE, Congreso, Senado e iniciativas activas", "pages/D4_Legislativo.py",  BLUE),
    ("D5_Coalicion",     "Coalicion",           "Aritmetica parlamentaria y pactos",           "pages/D5_Coalicion.py",    GREEN),
    ("D6_Alertas",       "Alertas",             "Panel de senales criticas en tiempo real",    "pages/D6_Alertas.py",      RED),
    ("D7_Medios",        "Medios y Narrativa",  "Monitor mediatico y tracker de narrativas",   "pages/D7_Medios.py",       AMBER),
    ("D8_Geopolitica",   "Geopolitica",         "Riesgos internacionales y RRII",              "pages/D8_Geopolitica.py",  CYAN2),
    ("D9_Communication", "Comms Intel",         "Estrategia de comunicacion y mensajes",       "pages/D9_Communication.py",PURPLE),
    ("D10_Workspace",    "Workspace",           "Centro de operaciones y configuracion",        "pages/D10_Workspace.py",   MUTED),
    ("N8_ChatIA",        "Politeia Brain",      "Asistente IA local — RAG politico",           "pages/N8_ChatIA.py",       GREEN),
    ("N9_CommandCenter", "Command Center",      "Dashboard ejecutivo multimodulo",             "pages/N9_CommandCenter.py", CYAN),
]

# Grid 4 columnas x 3 filas
_grid_cols = st.columns(4, gap="small")

for idx, (page_id, name, desc, page_path, color) in enumerate(_MODULES):
    with _grid_cols[idx % 4]:
        # Intentar renderizar como page_link con HTML custom
        _card_html = (
            f'<div style="background:{BG2};border:1px solid {BORDER};'
            f'border-top:2px solid {color};border-radius:10px;'
            f'padding:.75rem .9rem;margin-bottom:.5rem;cursor:pointer;'
            f'transition:border-color .15s">'
            f'<div style="font-size:.78rem;font-weight:700;color:{TEXT};margin-bottom:.2rem">'
            f'{name}</div>'
            f'<div style="font-size:.64rem;color:{MUTED};line-height:1.35">{desc}</div>'
            f'</div>'
        )
        st.markdown(_card_html, unsafe_allow_html=True)
        try:
            st.page_link(page_path, label=f"Ir a {name}")
        except Exception:
            pass

st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# NOTA DEL ANALISTA (si existe)
# ══════════════════════════════════════════════════════════════════════════════

if _ANALYST_NOTE:
    st.markdown(
        f'<div style="background:{BG2};border:1px solid {BORDER};'
        f'border-radius:8px;padding:.8rem 1.1rem;margin-top:.3rem;'
        f'border-left:3px solid {CYAN}">'
        f'<span style="font-size:.58rem;color:{CYAN};font-weight:700;'
        f'letter-spacing:.1em;text-transform:uppercase">Nota del Analista</span>'
        f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.3rem;line-height:1.45">'
        f'{_html_mod.escape(_ANALYST_NOTE)}'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown(
    f'<div style="margin-top:1.5rem;padding:.8rem 1rem;border-top:1px solid {BORDER};'
    f'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">'
    f'<span style="font-size:.6rem;color:{MUTED}">ElectSim Espana · Politeia Intelligence Platform · '
    f'Datos actualizados: {_ahora.strftime("%d %b %Y %H:%M")} UTC</span>'
    f'<span style="font-size:.6rem;color:{MUTED}">Inteligencia politico-electoral para profesionales · '
    f'No para uso publico · Confidencial</span>'
    f'</div>',
    unsafe_allow_html=True,
)
