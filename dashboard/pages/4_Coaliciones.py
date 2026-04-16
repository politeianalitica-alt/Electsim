"""
Página: Análisis de Coaliciones — Dark Tech v2

Configuraciones parlamentarias viables, motivaciones de cada partido
y matriz de compatibilidad entre formaciones.
"""

from __future__ import annotations

import logging
import sys
from itertools import combinations
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import plotly.graph_objects as go
import numpy as np
import pandas as pd
import streamlit as st
from dashboard.app_state import get_app_snapshot
from dashboard.db import cargar_coaliciones_metadata, cargar_nowcasting
from dashboard.election_math import dhondt_nacional
from dashboard.shared import (
    sidebar_nav, COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER,
    CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
    color_partido,
    hex_to_rgb,
)

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Coaliciones — ElectSim", layout="wide")
sidebar_nav()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _color(siglas: str) -> str:
    return color_partido(siglas)


def _section_header(label: str, color: str, gradient_end: str | None = None):
    end = gradient_end or BG3
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.7rem;margin:1.2rem 0 .8rem">
        <div style="width:4px;height:20px;background:linear-gradient({color},{end});border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{color};
                     letter-spacing:.15em;text-transform:uppercase">{label}</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
    </div>
    """, unsafe_allow_html=True)


def _pill(label: str, color: str) -> str:
    return (
        f'<span style="background:{color}15;border:1px solid {color}44;color:{color};'
        f'padding:.2rem .5rem;border-radius:6px;font-size:.65rem;font-weight:700;'
        f'font-family:\'JetBrains Mono\',monospace;display:inline-block;margin:.1rem .15rem">'
        f'{label}</span>'
    )


def _normalizar(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    ren = {
        "estimación_pct": "estimacion_pct",
        "estimacion": "estimacion_pct",
        "fecha_estimación": "fecha_estimacion",
        "fecha_calculo": "fecha_estimacion",
        "ic95_inf": "ic_95_inf",
        "ic95_sup": "ic_95_sup",
    }
    return df.rename(columns={src: dst for src, dst in ren.items() if src in df.columns and dst not in df.columns})


@st.cache_data(ttl=1800, show_spinner=False)
def _nc_cached() -> pd.DataFrame:
    return _normalizar(cargar_nowcasting())


# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

@keyframes fadeInUp {{
  from {{ opacity: 0; transform: translateY(16px); }}
  to   {{ opacity: 1; transform: translateY(0); }}
}}
@keyframes pulseGlow {{
  0%, 100% {{ box-shadow: 0 0 0 0 rgba(0,212,255,0); }}
  50%       {{ box-shadow: 0 0 12px 3px rgba(0,212,255,0.18); }}
}}
@keyframes gradientMove {{
  0%   {{ background-position: 0% 50%; }}
  50%  {{ background-position: 100% 50%; }}
  100% {{ background-position: 0% 50%; }}
}}

.coal-animate {{ animation: fadeInUp .5s ease-out both; }}

.coal-card {{
  background: linear-gradient(135deg, {BG2}ee, {BG3}cc);
  border: 1px solid {BORDER};
  border-radius: 12px;
  transition: all .25s ease;
  padding: 1rem 1.2rem;
  margin-bottom: .8rem;
}}
.coal-card:hover {{
  border-color: {CYAN}55;
  box-shadow: 0 4px 20px rgba(0,212,255,0.08);
  transform: translateY(-1px);
}}

.pill-item {{
  display: inline-block;
  padding: .2rem .5rem;
  border-radius: 6px;
  font-size: .65rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  margin: .1rem .15rem;
}}

.kpi-card {{
  background: linear-gradient(135deg, {BG2}ee, {BG3}cc);
  border: 1px solid {BORDER};
  border-radius: 12px;
  padding: 1rem 1.2rem;
  text-align: center;
  transition: all .25s ease;
}}
.kpi-card:hover {{
  border-color: {CYAN}55;
  box-shadow: 0 4px 20px rgba(0,212,255,0.08);
  transform: translateY(-1px);
}}

.info-box {{
  background: {CYAN}0d;
  border: 1px solid {CYAN}33;
  border-left: 3px solid {CYAN};
  border-radius: 0 8px 8px 0;
  padding: .8rem 1rem;
  color: {TEXT2};
  font-size: .82rem;
  line-height: 1.55;
  margin: .5rem 0;
}}

.progress-track {{
  background: {BORDER};
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
  margin-top: .35rem;
}}
</style>
""", unsafe_allow_html=True)


# ── Datos ─────────────────────────────────────────────────────────────────────


def _resolve_color_token(token: str | None) -> str:
    if not token:
        return CYAN
    t = str(token)
    if t == "MUTED":
        return MUTED
    if t.startswith("#"):
        return t
    return _color(t)


def _validate_compat_matrix(compat: dict[tuple[str, str], int], partidos: list[str]) -> None:
    missing: list[tuple[str, str]] = []
    for p1, p2 in combinations(partidos, 2):
        if (p1, p2) not in compat and (p2, p1) not in compat:
            missing.append((p1, p2))
    if missing:
        raise ValueError(f"Faltan pares de compatibilidad: {missing}")


def _build_metadata_defaults() -> tuple[dict[str, dict], list[dict], dict[tuple[str, str], int], list[str]]:
    meta = cargar_coaliciones_metadata() or {}
    motivaciones = meta.get("motivaciones", {})
    escenarios = meta.get("escenarios", [])
    compat_rows = meta.get("compatibilidad", [])
    partidos_orden = meta.get("partidos_orden", ["PP", "VOX", "PSOE", "SUMAR", "PNV", "EH Bildu", "ERC", "Junts"])

    motivaciones_out: dict[str, dict] = {}
    for siglas, payload in motivaciones.items():
        d = dict(payload)
        d["color"] = _color(siglas)
        motivaciones_out[siglas] = d

    escenarios_out: list[dict] = []
    for esc in escenarios:
        out = dict(esc)
        out["color"] = _resolve_color_token(str(esc.get("color", "")))
        out["bloque"] = str(esc.get("bloque", "centro"))
        escenarios_out.append(out)

    compat_out: dict[tuple[str, str], int] = {}
    for row in compat_rows:
        p1 = str(row.get("p1", "")).strip()
        p2 = str(row.get("p2", "")).strip()
        if not p1 or not p2:
            continue
        compat_out[(p1, p2)] = int(row.get("valor", 0))

    if compat_out and partidos_orden:
        _validate_compat_matrix(compat_out, list(partidos_orden))
    return motivaciones_out, escenarios_out, compat_out, list(partidos_orden)


MOTIVACIONES, ESCENARIOS_BASE, COMPATIBILIDAD, PARTIDOS_ORDEN = _build_metadata_defaults()
_WARNED_COMPAT_PAIRS: set[tuple[str, str]] = set()


def _seat(seats: dict[str, int], *aliases: str) -> int:
    return sum(seats.get(a, 0) for a in aliases)


def _compute_scenario_probs(df_nc: pd.DataFrame) -> list[dict]:
    if df_nc.empty or "estimacion_pct" not in df_nc.columns:
        return [dict(e) for e in ESCENARIOS_BASE]
    votes = {
        str(row["partido_siglas"]): float(row["estimacion_pct"])
        for _, row in df_nc.iterrows()
        if pd.notna(row.get("estimacion_pct"))
    }
    if not votes:
        return [dict(e) for e in ESCENARIOS_BASE]

    seats = dhondt_nacional(votes)
    pp_vox = _seat(seats, "PP") + _seat(seats, "VOX")
    prog = (
        _seat(seats, "PSOE")
        + _seat(seats, "SUMAR")
        + _seat(seats, "PNV")
        + _seat(seats, "ERC")
        + _seat(seats, "EH Bildu", "EH_BILDU")
        + _seat(seats, "BNG")
        + _seat(seats, "Junts", "JUNTS")
    )
    pp_pnv_cc = _seat(seats, "PP") + _seat(seats, "PNV") + _seat(seats, "CC")
    grand = _seat(seats, "PP") + _seat(seats, "PSOE")
    best_block = max(pp_vox, prog, pp_pnv_cc)

    raw = {
        "Gobierno PP con apoyo de VOX": max(2.0, min(85.0, 50.0 + 2.1 * (pp_vox - 176))),
        "Mayoría progresista ampliada": max(2.0, min(85.0, 50.0 + 2.1 * (prog - 176))),
        "PP con PNV y CC": max(1.0, min(40.0, 18.0 + 2.4 * (pp_pnv_cc - 176))),
        "Gran coalición PP-PSOE": max(1.0, min(20.0, 3.0 + max(0.0, (170.0 - float(best_block))) / 3.0)),
        "Bloqueo / elecciones repetidas": max(2.0, min(70.0, 55.0 - 1.8 * (float(best_block) - 176.0))),
    }
    total_raw = sum(raw.values()) or 1.0

    esc_map = {
        "Gobierno PP con apoyo de VOX": pp_vox,
        "Mayoría progresista ampliada": prog,
        "PP con PNV y CC": pp_pnv_cc,
        "Gran coalición PP-PSOE": grand,
        "Bloqueo / elecciones repetidas": 0,
    }

    escenarios: list[dict] = []
    for base in ESCENARIOS_BASE:
        n = base["nombre"]
        out = dict(base)
        out["prob"] = int(round(raw.get(n, float(base["prob"])) / total_raw * 100.0))
        out["escanos_est"] = int(esc_map.get(n, base["escanos_est"]))
        escenarios.append(out)

    # Ajuste de redondeo para cerrar 100.
    diff = 100 - sum(e["prob"] for e in escenarios)
    if escenarios and diff != 0:
        escenarios[0]["prob"] += diff
    return escenarios


def _apply_mc_to_escenarios(escenarios: list[dict], mc_res: dict[str, list[int]] | None) -> list[dict]:
    if not mc_res:
        return escenarios
    n = len(next(iter(mc_res.values()), [])) if mc_res else 0
    if n <= 0:
        return escenarios

    izq_parties = {"PSOE", "SUMAR", "ERC", "EH Bildu", "EH_BILDU", "BNG", "PNV"}
    der_parties = {"PP", "VOX"}
    arr_izq = np.sum([np.array(mc_res[p], dtype=float) for p in izq_parties if p in mc_res], axis=0) if any(p in mc_res for p in izq_parties) else np.zeros(n)
    arr_der = np.sum([np.array(mc_res[p], dtype=float) for p in der_parties if p in mc_res], axis=0) if any(p in mc_res for p in der_parties) else np.zeros(n)

    out: list[dict] = []
    for esc in escenarios:
        e = dict(esc)
        partidos = [p for p in e.get("partidos", []) if p in mc_res]
        if partidos:
            arr = np.sum([np.array(mc_res[p], dtype=float) for p in partidos], axis=0)
            e["prob"] = int(round(float((arr >= 176).mean() * 100)))
            e["escanos_est"] = int(round(float(np.median(arr))))
        else:
            # Escenario de bloqueo/repetición.
            p_block = float(((arr_izq < 176) & (arr_der < 176)).mean() * 100)
            e["prob"] = int(round(p_block))
            e["escanos_est"] = 0
        out.append(e)

    diff = 100 - sum(int(e.get("prob", 0)) for e in out)
    if out and diff != 0:
        out[0]["prob"] = int(out[0].get("prob", 0)) + diff
    return out


def _get_compat(p1: str, p2: str) -> int:
    if p1 == p2:
        return 2
    key = (p1, p2) if (p1, p2) in COMPATIBILIDAD else (p2, p1)
    if key not in COMPATIBILIDAD:
        pair = tuple(sorted((p1, p2)))
        if pair not in _WARNED_COMPAT_PAIRS:
            _WARNED_COMPAT_PAIRS.add(pair)
            logging.warning("Par de compatibilidad no definido: (%s, %s) -> asumiendo 0", p1, p2)
    return int(COMPATIBILIDAD.get(key, 0))


def _compute_fortaleza(siglas: str, seats: dict[str, int], escenarios: list[dict]) -> int:
    seat_aliases = {
        "Junts": ("Junts", "JUNTS"),
        "EH Bildu": ("EH Bildu", "EH_BILDU"),
    }
    esc = _seat(seats, *(seat_aliases.get(siglas, (siglas,))))
    seat_score = min((esc / 350.0) * 60.0, 60.0)

    viable = [e for e in escenarios if e.get("escanos_est", 0) >= 176 and e.get("partidos")]
    if not viable:
        indispens = 0.0
    else:
        needed = sum(1 for e in viable if siglas in e["partidos"])
        indispens = (needed / len(viable)) * 40.0
    return int(round(min(100.0, seat_score + indispens)))


# ── Animated header ───────────────────────────────────────────────────────────
st.markdown(f"""
<div class="coal-animate" style="
    background:linear-gradient(135deg,{BG2} 0%,#0a1628 50%,{BG3} 100%);
    border:1px solid {BORDER};border-radius:16px;
    padding:2rem 2.5rem;margin-bottom:1.5rem;
    position:relative;overflow:hidden">
    <div style="position:absolute;top:-50px;right:-30px;width:200px;height:200px;
                background:radial-gradient(circle,{PURPLE}10,transparent 70%);pointer-events:none"></div>
    <div style="position:absolute;bottom:-40px;left:15%;width:160px;height:160px;
                background:radial-gradient(circle,{CYAN}08,transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,{PURPLE},{CYAN});
                    border-radius:12px;display:flex;align-items:center;justify-content:center;
                    font-size:1.1rem;flex-shrink:0;box-shadow:0 4px 16px {PURPLE}33">&#9878;</div>
        <div>
            <div style="font-size:1.6rem;font-weight:900;color:{TEXT};letter-spacing:-.03em">
                Análisis de Coaliciones
            </div>
            <div style="font-size:.78rem;color:{TEXT2};margin-top:.15rem">
                Configuraciones parlamentarias viables &mdash; Motivaciones por partido &mdash; Matriz de compatibilidad
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Datos dinámicos (nowcasting -> escaños/escenarios/fortaleza) ───────────
df_nc_current = _nc_cached()
if df_nc_current.empty:
    df_nc_current = _normalizar(get_app_snapshot().get("nowcasting", pd.DataFrame()))

if not df_nc_current.empty and "estimacion_pct" in df_nc_current.columns:
    df_nc_current = df_nc_current.sort_values("estimacion_pct", ascending=False).copy()

ESCENARIOS = _compute_scenario_probs(df_nc_current)
ESCENARIOS = _apply_mc_to_escenarios(ESCENARIOS, st.session_state.get("mc_resultados"))
_votes_now = (
    {str(r["partido_siglas"]): float(r["estimacion_pct"]) for _, r in df_nc_current.iterrows()}
    if not df_nc_current.empty and "estimacion_pct" in df_nc_current.columns
    else {}
)
SEATS_NOW = dhondt_nacional(_votes_now) if _votes_now else {}
FORTALEZA_BY_PARTY = {
    p: _compute_fortaleza(p, SEATS_NOW, ESCENARIOS)
    for p in MOTIVACIONES.keys()
}

if not MOTIVACIONES or not ESCENARIOS:
    st.error("No se pudo cargar metadata de coaliciones desde assets/coaliciones.json")
    st.stop()


# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "Escenarios de Coalición",
    "Motivaciones por Partido",
    "Matriz de Compatibilidad",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Escenarios de Coalición
# ═══════════════════════════════════════════════════════════════════════════════
with tab1:

    # ── KPI row ───────────────────────────────────────────────────────────────
    total_esc = len(ESCENARIOS)
    prob_derecha = sum(int(e.get("prob", 0)) for e in ESCENARIOS if e.get("bloque") == "derecha")
    prob_izq = sum(int(e.get("prob", 0)) for e in ESCENARIOS if e.get("bloque") == "izquierda")
    prob_bloqueo = sum(int(e.get("prob", 0)) for e in ESCENARIOS if e.get("bloque") == "bloqueo")
    prob_resto = 100 - prob_derecha - prob_izq - prob_bloqueo
    if abs(prob_derecha + prob_izq + prob_bloqueo + prob_resto - 100) > 1:
        st.warning("Las probabilidades de escenarios no están cerrando correctamente al 100%.")

    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    with kpi_col1:
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {CYAN};animation-delay:.00s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Escenarios</div>
            <div style="font-size:2.2rem;font-weight:900;color:{CYAN};
                        font-family:'JetBrains Mono',monospace;line-height:1">{total_esc}</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">configuraciones viables</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_col2:
        r, g, b = hex_to_rgb(_color("PP"))
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {_color('PP')};animation-delay:.08s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Bloque Derecha</div>
            <div style="font-size:2.2rem;font-weight:900;
                        color:{_color('PP')};font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 20px rgba({r},{g},{b},0.3)">{prob_derecha}%</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">prob. acumulada PP-liderado</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_col3:
        r2, g2, b2 = hex_to_rgb(_color("PSOE"))
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {_color('PSOE')};animation-delay:.16s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Bloque Izquierda</div>
            <div style="font-size:2.2rem;font-weight:900;
                        color:{_color('PSOE')};font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 20px rgba({r2},{g2},{b2},0.3)">{prob_izq}%</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">prob. acumulada PSOE-liderado</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_col4:
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {AMBER};animation-delay:.24s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Bloqueo</div>
            <div style="font-size:2.2rem;font-weight:900;color:{AMBER};
                        font-family:'JetBrains Mono',monospace;line-height:1">{prob_bloqueo}%</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">prob. elecciones repetidas</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)

    # ── Nowcasting pill strip ─────────────────────────────────────────────────
    df_nc = df_nc_current
    if not df_nc.empty and "estimacion_pct" in df_nc.columns:
        _section_header("Estimación Actual de Voto", CYAN)
        pills_html = '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">'
        for _, row in df_nc.head(8).iterrows():
            p = row["partido_siglas"]
            col = _color(p)
            pct = row["estimacion_pct"]
            pills_html += (
                f'<div style="background:{col}15;border:1px solid {col}44;'
                f'border-radius:8px;padding:.35rem .7rem;text-align:center;min-width:70px">'
                f'<div style="font-size:.6rem;font-weight:700;color:{col};'
                f'letter-spacing:.08em;text-transform:uppercase">{p}</div>'
                f'<div style="font-size:1.1rem;font-weight:900;color:{col};'
                f'font-family:\'JetBrains Mono\',monospace;line-height:1.2">{pct:.1f}%</div>'
                f'</div>'
            )
        pills_html += "</div>"
        st.markdown(pills_html, unsafe_allow_html=True)

    # ── Scenario cards ────────────────────────────────────────────────────────
    _section_header("Configuraciones más probables", PURPLE)

    for i, esc in enumerate(ESCENARIOS):
        col = esc["color"]
        prob = esc["prob"]
        prob_color = GREEN if prob >= 30 else (AMBER if prob >= 15 else MUTED)
        party_pills = "".join(_pill(p, _color(p)) for p in esc["partidos"]) if esc["partidos"] else _pill("Sin coalición", MUTED)

        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-left:3px solid {col};animation-delay:{i*0.07:.2f}s">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.6rem">
                <div>
                    <div style="font-size:1rem;font-weight:800;color:{TEXT};letter-spacing:-.01em">
                        {esc['nombre']}
                    </div>
                    <div style="font-size:.68rem;color:{TEXT2};margin-top:.1rem">{esc['tipo']} &nbsp;·&nbsp; {esc['escanos_est']} / 350 escaños est.</div>
                </div>
                <div style="background:{prob_color}18;border:1px solid {prob_color}44;
                            border-radius:8px;padding:.3rem .7rem;text-align:center;flex-shrink:0">
                    <div style="font-size:1.4rem;font-weight:900;color:{prob_color};
                                font-family:'JetBrains Mono',monospace;line-height:1">{prob}%</div>
                    <div style="font-size:.55rem;color:{MUTED};text-transform:uppercase;letter-spacing:.08em">prob.</div>
                </div>
            </div>
            <div style="margin-bottom:.55rem">{party_pills}</div>
            <div style="margin-bottom:.45rem">
                <div style="display:flex;justify-content:space-between;font-size:.62rem;
                            color:{MUTED};margin-bottom:.2rem">
                    <span>Probabilidad</span><span style="color:{prob_color};font-weight:700">{prob}%</span>
                </div>
                <div class="progress-track">
                    <div style="width:{prob}%;height:100%;
                                background:linear-gradient(90deg,{prob_color},{prob_color}99);
                                border-radius:4px;transition:width .6s ease"></div>
                </div>
            </div>
            <div style="font-size:.7rem;color:{MUTED};font-style:italic">{esc['condicion']}</div>
        </div>
        """, unsafe_allow_html=True)

        with st.expander(f"Descripción detallada — {esc['nombre']}", expanded=False):
            st.markdown(f"<span style='color:{TEXT2};font-size:.82rem'>{esc['desc']}</span>", unsafe_allow_html=True)

    # ── Horizontal bar chart ──────────────────────────────────────────────────
    _section_header("Comparativa de probabilidades", CYAN)

    nombres  = [e["nombre"][:45] + ("…" if len(e["nombre"]) > 45 else "") for e in ESCENARIOS]
    probs    = [e["prob"] for e in ESCENARIOS]
    colors_b = [e["color"] for e in ESCENARIOS]

    fig_bar = go.Figure(go.Bar(
        y=nombres, x=probs, orientation="h",
        marker=dict(
            color=colors_b,
            line=dict(width=0),
        ),
        text=[f"{p}%" for p in probs],
        textposition="outside",
        textfont=dict(color=TEXT2, size=11, family="JetBrains Mono, monospace"),
        hoverlabel=dict(
            bgcolor=BG2,
            font=dict(size=11, family="JetBrains Mono, monospace"),
            bordercolor=BORDER,
        ),
        hovertemplate="<b>%{y}</b><br>Probabilidad: %{x}%<extra></extra>",
    ))
    fig_bar.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            title="Probabilidad (%)",
            range=[0, 55],
            tickfont=dict(color=MUTED, size=9),
            gridcolor="rgba(30,41,59,0.5)",
            title_font=dict(color=TEXT2, size=10),
        ),
        yaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
        ),
        margin=dict(t=10, b=20, l=10, r=50),
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig_bar, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — Motivaciones por Partido
# ═══════════════════════════════════════════════════════════════════════════════
with tab2:
    _section_header("¿Qué busca cada partido en la negociación?", CYAN)

    partido_sel = st.selectbox(
        "Seleccionar partido",
        list(MOTIVACIONES.keys()),
        format_func=lambda k: f"{k}  —  {MOTIVACIONES[k]['nombre']}",
    )
    m = MOTIVACIONES[partido_sel]
    mc = m["color"]
    mr, mg, mb = hex_to_rgb(mc)

    # ── Party header card ─────────────────────────────────────────────────────
    st.markdown(f"""
    <div class="coal-card coal-animate" style="border-top:3px solid {mc};margin-bottom:1rem">
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:.8rem">
            <div style="width:10px;height:52px;background:linear-gradient({mc},{mc}55);
                        border-radius:3px;flex-shrink:0"></div>
            <div>
                <div style="font-size:1.25rem;font-weight:900;color:{TEXT};
                            letter-spacing:-.02em;text-shadow:0 0 24px rgba({mr},{mg},{mb},0.25)">
                    {m['nombre']}
                </div>
                <div style="font-size:.75rem;color:{TEXT2};margin-top:.15rem">
                    Líder: <span style="color:{mc};font-weight:600">{m['lider']}</span>
                    &nbsp;·&nbsp; Bloque: <span style="color:{TEXT}">{m['bloque']}</span>
                </div>
            </div>
        </div>
        <div style="background:{mc}0d;border:1px solid {mc}22;border-radius:8px;
                    padding:.75rem 1rem;font-size:.8rem;color:{TEXT2};line-height:1.55">
            <span style="color:{mc};font-weight:700;font-size:.65rem;text-transform:uppercase;
                         letter-spacing:.1em">Objetivo principal &nbsp;</span>
            {m['objetivo']}
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Main two columns: red lines + concessions ────────────────────────────
    col_l, col_r = st.columns(2)

    with col_l:
        _section_header("Líneas rojas (no negociables)", RED)
        lr_items = "".join(
            f'<div style="display:flex;gap:.5rem;align-items:flex-start;'
            f'margin-bottom:.4rem;font-size:.78rem;color:{TEXT2}">'
            f'<span style="color:{RED};font-weight:700;flex-shrink:0">✗</span>'
            f'<span>{lr}</span></div>'
            for lr in m["lineas_rojas"]
        )
        st.markdown(f"""
        <div class="coal-card" style="border-left:3px solid {RED}55;padding:.9rem 1rem">
            {lr_items}
        </div>
        """, unsafe_allow_html=True)

        _section_header("Socios vetados", RED)
        veto_pills = "".join(_pill(sv, RED) for sv in m["socios_vetados"])
        st.markdown(f"<div style='margin-bottom:.5rem'>{veto_pills}</div>", unsafe_allow_html=True)

    with col_r:
        _section_header("Concesiones posibles", GREEN)
        con_items = "".join(
            f'<div style="display:flex;gap:.5rem;align-items:flex-start;'
            f'margin-bottom:.4rem;font-size:.78rem;color:{TEXT2}">'
            f'<span style="color:{GREEN};font-weight:700;flex-shrink:0">✓</span>'
            f'<span>{c}</span></div>'
            for c in m["concesiones"]
        )
        st.markdown(f"""
        <div class="coal-card" style="border-left:3px solid {GREEN}55;padding:.9rem 1rem">
            {con_items}
        </div>
        """, unsafe_allow_html=True)

        _section_header("Socios preferentes", GREEN)
        pref_pills = "".join(_pill(sp, GREEN) for sp in m["socios_preferentes"])
        st.markdown(f"<div style='margin-bottom:.5rem'>{pref_pills}</div>", unsafe_allow_html=True)

    # ── Precio de coalición ───────────────────────────────────────────────────
    _section_header("Precio de coalición", AMBER)
    st.markdown(f"""
    <div class="info-box" style="border-color:{AMBER}33;border-left-color:{AMBER};
                background:{AMBER}0d">
        <span style="color:{AMBER};font-weight:700;font-size:.65rem;text-transform:uppercase;
                     letter-spacing:.1em">Demandas clave &nbsp;</span><br>
        <span style="color:{TEXT};font-size:.82rem">{m['precio_coalicion']}</span>
    </div>
    """, unsafe_allow_html=True)

    # ── Estrategia negociadora ────────────────────────────────────────────────
    _section_header("Estrategia negociadora", CYAN)
    st.markdown(f"""
    <div style="font-size:.82rem;color:{TEXT2};line-height:1.65;
                padding:.6rem 0 .6rem .2rem;border-left:2px solid {CYAN}33;
                padding-left:.9rem;margin-bottom:.5rem">
        {m['estrategia']}
    </div>
    """, unsafe_allow_html=True)

    # ── Fortaleza negociadora — big number + progress bar ─────────────────────
    _section_header("Fortaleza negociadora", mc)
    fort = int(FORTALEZA_BY_PARTY.get(partido_sel, 0))
    fort_color = GREEN if fort >= 75 else (AMBER if fort >= 55 else RED)
    fr, fg, fb = hex_to_rgb(fort_color)
    st.caption("Fortaleza = 60% peso parlamentario estimado + 40% indispensabilidad en coaliciones viables (>=176).")

    col_fort, col_pad = st.columns([1, 2])
    with col_fort:
        st.markdown(f"""
        <div class="coal-card" style="border-top:3px solid {fort_color};text-align:center;padding:1.2rem">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.4rem">Fortaleza negociadora</div>
            <div style="font-size:3.2rem;font-weight:900;color:{fort_color};
                        font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 28px rgba({fr},{fg},{fb},0.35)">{fort}</div>
            <div style="font-size:.7rem;color:{MUTED};margin:.2rem 0 .6rem">/ 100</div>
            <div class="progress-track" style="height:8px">
                <div style="width:{fort}%;height:100%;
                            background:linear-gradient(90deg,{fort_color},{fort_color}88);
                            border-radius:4px"></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # ── Comparison bar chart ──────────────────────────────────────────────────
    _section_header("Comparativa de fortaleza — todos los partidos", PURPLE)

    partidos_l  = list(MOTIVACIONES.keys())
    fort_vals   = [int(FORTALEZA_BY_PARTY.get(p, 0)) for p in partidos_l]
    fort_colors = [MOTIVACIONES[p]["color"] for p in partidos_l]

    fig_comp = go.Figure(go.Bar(
        x=partidos_l,
        y=fort_vals,
        marker=dict(color=fort_colors, line=dict(width=0)),
        text=fort_vals,
        textposition="outside",
        textfont=dict(color=TEXT2, size=10, family="JetBrains Mono, monospace"),
        hoverlabel=dict(
            bgcolor=BG2,
            font=dict(size=11, family="JetBrains Mono, monospace"),
            bordercolor=BORDER,
        ),
        hovertemplate="<b>%{x}</b><br>Fortaleza: %{y}/100<extra></extra>",
    ))
    fig_comp.update_layout(
        height=300,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
        ),
        yaxis=dict(
            title="Fortaleza (0–100)",
            range=[0, 105],
            tickfont=dict(color=MUTED, size=9),
            gridcolor="rgba(30,41,59,0.5)",
            title_font=dict(color=TEXT2, size=10),
        ),
        margin=dict(t=15, b=10, l=10, r=10),
        font=dict(color=TEXT),
    )
    # Highlight selected party
    sel_idx = partidos_l.index(partido_sel)
    fig_comp.add_shape(
        type="rect",
        x0=sel_idx - 0.4, x1=sel_idx + 0.4,
        y0=0, y1=fort_vals[sel_idx],
        line=dict(color=mc, width=2),
        fillcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig_comp, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — Matriz de Compatibilidad
# ═══════════════════════════════════════════════════════════════════════════════
with tab3:
    _section_header("Compatibilidad entre partidos", CYAN)

    st.markdown(f"""
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
        {_pill("+2 muy compatible", GREEN)}
        {_pill("+1 compatible", CYAN)}
        {_pill("0 neutral", MUTED)}
        {_pill("-1 difícil", AMBER)}
        {_pill("-2 veto total", RED)}
    </div>
    """, unsafe_allow_html=True)

    partidos_m = PARTIDOS_ORDEN
    matrix: list[list[int]] = []
    for p1 in partidos_m:
        row_vals: list[int] = []
        for p2 in partidos_m:
            row_vals.append(_get_compat(p1, p2))
        matrix.append(row_vals)

    matrix_np = np.array(matrix, dtype=float)
    np.fill_diagonal(matrix_np, np.nan)

    # Escala discreta (ordinal), sin interpolación perceptiva continua.
    dark_colorscale = [
        [0.000, "#7F1D1D"], [0.249, "#7F1D1D"],  # -2
        [0.250, "#B91C1C"], [0.499, "#B91C1C"],  # -1
        [0.500, BG3],       [0.749, BG3],        # 0
        [0.750, "#065F46"], [0.999, "#065F46"],  # +1
        [1.000, "#14532D"],                     # +2
    ]
    text_matrix = [[("—" if np.isnan(v) else str(int(v))) for v in row_vals] for row_vals in matrix_np]

    fig_hm = go.Figure(go.Heatmap(
        z=matrix_np.tolist(),
        x=partidos_m,
        y=partidos_m,
        colorscale=dark_colorscale,
        zmin=-2, zmax=2,
        text=text_matrix,
        texttemplate="%{text}",
        textfont=dict(color=TEXT, size=11, family="JetBrains Mono, monospace"),
        showscale=True,
        colorbar=dict(
            title=dict(text="Compatibilidad", font=dict(color=TEXT2, size=10)),
            tickvals=[-2, -1, 0, 1, 2],
            ticktext=["Veto", "−1", "Neutral", "+1", "Muy comp."],
            tickfont=dict(color=TEXT2, size=9),
            bgcolor=BG2,
            bordercolor=BORDER,
            borderwidth=1,
            len=0.85,
        ),
        hoverlabel=dict(
            bgcolor=BG2,
            font=dict(size=11, family="JetBrains Mono, monospace"),
            bordercolor=BORDER,
        ),
        hovertemplate="<b>%{y}</b> ↔ <b>%{x}</b><br>Compatibilidad: %{text}<extra></extra>",
    ))
    # Diagonal separada semánticamente.
    for p in partidos_m:
        fig_hm.add_annotation(
            x=p,
            y=p,
            text="◆",
            showarrow=False,
            font=dict(color=CYAN, size=14),
        )
    fig_hm.update_layout(
        height=500,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            side="top",
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
        ),
        yaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
            autorange="reversed",
        ),
        margin=dict(t=30, b=10, l=10, r=10),
        font=dict(color=TEXT),
    )
    for x_sep in [1.5, 3.5]:
        fig_hm.add_shape(
            type="line",
            x0=x_sep, x1=x_sep, y0=-0.5, y1=len(partidos_m) - 0.5,
            line=dict(color=BORDER, width=2, dash="dot"),
        )
        fig_hm.add_shape(
            type="line",
            x0=-0.5, x1=len(partidos_m) - 0.5, y0=x_sep, y1=x_sep,
            line=dict(color=BORDER, width=2, dash="dot"),
        )
    st.plotly_chart(fig_hm, use_container_width=True)

    # ── Bloc cards ────────────────────────────────────────────────────────────
    _section_header("Lógica de bloques parlamentarios", PURPLE)

    col_b1, col_b2, col_b3 = st.columns(3)
    with col_b1:
        bc = _color("PP")
        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-top:3px solid {bc};animation-delay:.00s">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.5rem">Bloque de derecha</div>
            <div style="margin-bottom:.6rem">
                {_pill("PP", _color("PP"))}
                {_pill("VOX", _color("VOX"))}
                {_pill("CC", _color("CC"))}
                {_pill("UPN", CYAN)}
                {_pill("PRC", CYAN)}
            </div>
            <div style="font-size:.75rem;color:{TEXT2};line-height:1.5">
                Máximo ~175 escaños. Posible con alta participación conservadora.
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_b2:
        bc2 = _color("PSOE")
        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-top:3px solid {bc2};animation-delay:.08s">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.5rem">Bloque progresista</div>
            <div style="margin-bottom:.6rem">
                {_pill("PSOE", _color("PSOE"))}
                {_pill("SUMAR", _color("SUMAR"))}
                {_pill("PNV", _color("PNV"))}
                {_pill("ERC", _color("ERC"))}
                {_pill("EH Bildu", _color("EH Bildu"))}
                {_pill("BNG", _color("BNG"))}
            </div>
            <div style="font-size:.75rem;color:{TEXT2};line-height:1.5">
                Posible con ~178–185 escaños. Alta complejidad de negociación.
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_b3:
        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-top:3px solid {PURPLE};animation-delay:.16s">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.5rem">Actores bisagra</div>
            <div style="margin-bottom:.6rem">
                {_pill("PNV", _color("PNV"))}
                {_pill("CC", _color("CC"))}
                {_pill("UPN", CYAN)}
            </div>
            <div style="font-size:.75rem;color:{TEXT2};line-height:1.5">
                Pueden inclinar la balanza. Precio: concesiones autonómicas concretas.
            </div>
        </div>
        """, unsafe_allow_html=True)
