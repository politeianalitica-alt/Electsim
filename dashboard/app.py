"""
ElectSim España — Dashboard Principal (Politeia Edition · v3.1)
Inicio rediseñado: KPIs cross-módulo, panel de señales, nowcasting con sparkline,
alertas priorizadas, macro compacta y estado del sistema en tiempo real.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from etl.config import validate_env

from dashboard.shared import (
    COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER,
    CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
    sidebar_nav,
)

st.set_page_config(
    page_title="ElectSim España — Politeia",
    layout="wide",
    initial_sidebar_state="expanded",
)

validate_env()

sidebar_nav()

# ── Data ─────────────────────────────────────────────────────────────────────
from dashboard.db import (
    cargar_alertas,
    cargar_elecciones,
    cargar_nowcasting,
    cargar_macro_ultimo,
    cargar_indices_politeia,
    cargar_noticias_recientes,
)
from dashboard.components.agenda_diaria import render_agenda_diaria

@st.cache_data(ttl=120)
def _load():
    return (
        cargar_elecciones("generales"),
        cargar_macro_ultimo(),
        cargar_alertas(solo_no_leidas=False),
        cargar_nowcasting(),
        cargar_indices_politeia(),
        cargar_noticias_recientes(dias=1, limit=20),
    )

df_elec, df_macro, df_alertas, df_nc, df_indices, df_news = _load()

# ── Helpers ───────────────────────────────────────────────────────────────────
def _macro_val(indicador: str, fmt: str = ".1f", suffix: str = "") -> str:
    if df_macro.empty:
        return "—"
    fila = df_macro[df_macro["indicador"] == indicador]
    if fila.empty:
        return "—"
    try:
        v = float(fila.iloc[0]["valor"])
        return f"{v:{fmt}}{suffix}"
    except Exception:
        return str(fila.iloc[0].get("valor", "—"))

def _top_partido() -> tuple[str, float]:
    if df_nc.empty or "estimacion_pct" not in df_nc.columns:
        return "—", 0.0
    row = df_nc.sort_values("estimacion_pct", ascending=False).iloc[0]
    return str(row.get("partido_siglas", "—")), float(row.get("estimacion_pct", 0))

def _n_alertas(sev: str | None = None) -> int:
    if df_alertas.empty:
        return 0
    if sev:
        return len(df_alertas[df_alertas["severidad"] == sev])
    return len(df_alertas)

def _indice_top() -> tuple[str, float]:
    if df_indices.empty:
        return "—", 0.0
    row = df_indices.sort_values("valor", ascending=False).iloc[0]
    return str(row.get("indice_codigo", "—")), float(row.get("valor", 0))

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp  {{ from {{ opacity:0; transform:translateY(18px); }} to {{ opacity:1; transform:translateY(0); }} }}
@keyframes fadeIn    {{ from {{ opacity:0; }} to {{ opacity:1; }} }}
@keyframes dotPulse  {{ 0%,100% {{ opacity:.45; transform:scale(1); }} 50% {{ opacity:1; transform:scale(1.35); }} }}
@keyframes pulseGlow {{ 0%,100% {{ box-shadow:0 0 0 0 {CYAN}44; }} 50% {{ box-shadow:0 0 14px 4px {CYAN}22; }} }}
@keyframes logoIn    {{ 0% {{ opacity:0; transform:scale(.72) rotate(-6deg); }}
                        65% {{ opacity:1; transform:scale(1.08) rotate(2deg); }}
                        100% {{ opacity:1; transform:scale(1) rotate(0deg); }} }}
@keyframes gradShift {{ 0%,100% {{ background-position:0% 50%; }} 50% {{ background-position:100% 50%; }} }}

.es-a  {{ animation:fadeInUp .55s ease-out both; }}
.es-a1 {{ animation:fadeInUp .55s ease-out .08s both; }}
.es-a2 {{ animation:fadeInUp .55s ease-out .16s both; }}
.es-a3 {{ animation:fadeInUp .55s ease-out .24s both; }}
.es-a4 {{ animation:fadeInUp .55s ease-out .32s both; }}
.es-a5 {{ animation:fadeInUp .55s ease-out .40s both; }}
.es-a6 {{ animation:fadeInUp .55s ease-out .48s both; }}

.g-card {{
    background:linear-gradient(135deg,{BG2}f0,{BG3}dd);
    border:1px solid {BORDER};
    border-radius:12px;
    transition:border-color .22s ease, box-shadow .22s ease;
}}
.g-card:hover {{
    border-color:{CYAN}44;
    box-shadow:0 4px 22px {CYAN}0e;
}}

.sec-hdr {{
    display:flex; align-items:center; gap:.65rem; margin:1.6rem 0 .9rem;
}}
.sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.sec-hdr .lbl  {{ font-size:.65rem; font-weight:700; letter-spacing:.15em;
                  text-transform:uppercase; color:{CYAN}; }}
.sec-hdr .line {{ flex:1; height:1px; background:linear-gradient(90deg,{BORDER},{BG}); }}
.sec-hdr .tag  {{ font-size:.58rem; color:{MUTED}; background:{BG3}; padding:.18rem .5rem;
                  border-radius:6px; border:1px solid {BORDER}; }}

.signal-row {{
    display:grid; grid-template-columns:repeat(5,1fr); gap:.55rem; margin-bottom:.5rem;
}}
.signal-card {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:10px;
    padding:.9rem 1rem; position:relative; overflow:hidden;
    transition:border-color .2s ease;
}}
.signal-card:hover {{ border-color:{CYAN}55; }}
.signal-card .accent {{ position:absolute; top:0; left:0; right:0; height:3px; border-radius:10px 10px 0 0; }}
.signal-card .lbl {{ font-size:.57rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:{MUTED}; margin-bottom:.4rem; }}
.signal-card .val {{ font-size:1.55rem; font-weight:900; color:{TEXT}; font-family:'JetBrains Mono',monospace; line-height:1.1; }}
.signal-card .sub {{ font-size:.58rem; margin-top:.3rem; font-weight:600; letter-spacing:.04em; }}

.alert-item {{
    border-left:3px solid var(--ac);
    padding:.48rem .8rem;
    margin:.28rem 0;
    background:linear-gradient(90deg,rgba(var(--acr),.06),{BG2});
    border-radius:0 9px 9px 0;
    border-top:1px solid {BORDER};
    border-right:1px solid {BORDER};
    border-bottom:1px solid {BORDER};
    transition:background .2s ease;
}}

.party-strip {{
    display:flex; gap:.4rem; flex-wrap:nowrap; overflow-x:auto;
    padding-bottom:.2rem; scrollbar-width:thin;
}}
.party-chip {{
    flex:1 0 auto; min-width:64px; text-align:center;
    background:var(--bg); border:1px solid {BORDER};
    border-top:3px solid var(--c); border-radius:0 0 8px 8px;
    padding:.5rem .3rem; transition:box-shadow .2s ease;
}}
.party-chip:hover {{ box-shadow:0 3px 12px rgba(var(--cr),.25); }}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
n_crit  = _n_alertas("CRITICAL")
n_warn  = _n_alertas("WARNING")
lider, lider_pct = _top_partido()
indice_top, indice_val = _indice_top()

st.markdown(f"""
<div class="es-a" style="
    background:linear-gradient(135deg,{BG2} 0%,#091628 45%,{BG3} 100%);
    border:1px solid {BORDER}; border-radius:16px;
    padding:1.8rem 2.2rem; margin-bottom:1.6rem;
    position:relative; overflow:hidden;
">
    <div style="position:absolute;top:-70px;right:-30px;width:260px;height:260px;
                background:radial-gradient(circle,{CYAN}12 0%,{BLUE}07 45%,transparent 70%);
                animation:gradShift 9s ease infinite;background-size:200% 200%;pointer-events:none"></div>
    <div style="position:absolute;bottom:-50px;left:22%;width:180px;height:180px;
                background:radial-gradient(circle,{PURPLE}0d 0%,transparent 70%);pointer-events:none"></div>

    <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1">
        <div style="display:flex;align-items:center;gap:1.3rem">
            <div style="width:52px;height:52px;border-radius:12px;overflow:hidden;flex-shrink:0;
                        box-shadow:0 6px 22px rgba(0,212,255,.2),0 2px 8px rgba(0,0,0,.4);
                        animation:logoIn .75s cubic-bezier(.34,1.56,.64,1) both,pulseGlow 4s ease 1s infinite">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
                  <rect width="100" height="100" rx="0" fill="#F0A214"/>
                  <circle cx="22" cy="28" r="13" stroke="#1B3FA8" stroke-width="5" fill="none"/>
                  <circle cx="22" cy="28" r="5.5" fill="#F0A214"/>
                  <circle cx="22" cy="28" r="5.5" stroke="#1B3FA8" stroke-width="2.5" fill="none"/>
                  <circle cx="22" cy="28" r="2.2" fill="#1B3FA8"/>
                  <circle cx="78" cy="28" r="13" stroke="#1B3FA8" stroke-width="5" fill="none"/>
                  <circle cx="78" cy="28" r="5.5" fill="#F0A214"/>
                  <circle cx="78" cy="28" r="5.5" stroke="#1B3FA8" stroke-width="2.5" fill="none"/>
                  <circle cx="78" cy="28" r="2.2" fill="#1B3FA8"/>
                  <rect x="21" y="24" width="58" height="8" fill="#1B3FA8"/>
                  <rect x="8" y="37" width="84" height="10" rx="2" fill="#1B3FA8"/>
                  <rect x="14" y="58" width="19" height="30" rx="3" fill="#1B3FA8"/>
                  <rect x="40" y="50" width="19" height="38" rx="3" fill="#1B3FA8"/>
                  <rect x="66" y="43" width="19" height="45" rx="3" fill="#1B3FA8"/>
                </svg>
            </div>
            <div>
                <div style="font-size:.6rem;font-weight:700;letter-spacing:.26em;color:{CYAN}99;
                            text-transform:uppercase;margin-bottom:.35rem">
                    Gemelo Digital · Político · Social · Económico
                </div>
                <div style="font-size:2rem;font-weight:900;color:{TEXT};letter-spacing:-.04em;line-height:1.05">
                    Elect<span style="background:linear-gradient(90deg,{CYAN},{BLUE});
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    background-clip:text">Sim</span>
                    <span style="font-weight:400;color:{TEXT2};font-size:1.25rem;margin-left:.1rem">España</span>
                </div>
                <div style="font-size:.72rem;color:{TEXT2};margin-top:.28rem">
                    Politeia Analytics &mdash; Inteligencia electoral en tiempo real
                </div>
            </div>
        </div>

        <!-- Estado del sistema + señales rápidas -->
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.55rem">
            <div style="display:inline-flex;align-items:center;gap:.4rem;
                        background:{GREEN}12;border:1px solid {GREEN}33;
                        border-radius:20px;padding:.3rem .85rem">
                <span style="display:inline-block;width:7px;height:7px;background:{GREEN};
                              border-radius:50%;animation:dotPulse 2.2s ease infinite"></span>
                <span style="font-size:.65rem;font-weight:700;color:{GREEN};letter-spacing:.1em;text-transform:uppercase">Sistema activo</span>
            </div>
            <div style="display:flex;gap:.45rem">
                <div style="background:{'#EF444418' if n_crit>0 else BG3};border:1px solid {'#EF444433' if n_crit>0 else BORDER};
                            border-radius:8px;padding:.28rem .7rem;text-align:center">
                    <div style="font-size:.55rem;color:{MUTED};text-transform:uppercase;letter-spacing:.1em">Críticas</div>
                    <div style="font-size:.9rem;font-weight:900;color:{'#EF4444' if n_crit>0 else MUTED};
                                font-family:'JetBrains Mono',monospace">{n_crit}</div>
                </div>
                <div style="background:{'#F59E0B18' if n_warn>0 else BG3};border:1px solid {'#F59E0B33' if n_warn>0 else BORDER};
                            border-radius:8px;padding:.28rem .7rem;text-align:center">
                    <div style="font-size:.55rem;color:{MUTED};text-transform:uppercase;letter-spacing:.1em">Avisos</div>
                    <div style="font-size:.9rem;font-weight:900;color:{'#F59E0B' if n_warn>0 else MUTED};
                                font-family:'JetBrains Mono',monospace">{n_warn}</div>
                </div>
                <div style="background:{BG3};border:1px solid {BORDER};
                            border-radius:8px;padding:.28rem .7rem;text-align:center">
                    <div style="font-size:.55rem;color:{MUTED};text-transform:uppercase;letter-spacing:.1em">Líder</div>
                    <div style="font-size:.9rem;font-weight:900;color:{CYAN};
                                font-family:'JetBrains Mono',monospace">{lider}</div>
                </div>
            </div>
            <div style="font-size:.58rem;color:{MUTED};font-family:'JetBrains Mono',monospace;letter-spacing:.05em">
                v3.1 &middot; Real-time &middot; Politeia
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# SEÑALES CROSS-MÓDULO (5 KPIs)
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr es-a1">
    <div class="bar" style="background:linear-gradient({CYAN},{BLUE})"></div>
    <span class="lbl">Señales del Sistema</span>
    <div class="line"></div>
    <span class="tag">Nowcasting · Macro · Riesgo · Prensa · Alertas</span>
</div>
""", unsafe_allow_html=True)

ipc_val   = _macro_val("IPC General (%)", suffix="%")
prima_val = _macro_val("Prima Riesgo (pb)", fmt=".0f", suffix=" pb")
paro_val  = _macro_val("Tasa de Paro (%)", suffix="%")
n_news    = len(df_news) if not df_news.empty else 0

signals = [
    ("Partido líder",    f"{lider}",              f"{lider_pct:.1f}% estimado",  CYAN,   CYAN),
    ("IPC General",      ipc_val,                  "Último dato INE",              AMBER,  AMBER),
    ("Prima de Riesgo",  prima_val,                "Bono 10Y España/Alemania",     RED,    RED),
    ("Índice top riesgo",f"{indice_top}",          f"{indice_val:.1f} puntos",     PURPLE, PURPLE),
    ("Alertas activas",  str(_n_alertas()),        f"{n_crit} críticas · {n_warn} avisos",
     RED if n_crit > 0 else (AMBER if n_warn > 0 else GREEN),
     RED if n_crit > 0 else (AMBER if n_warn > 0 else GREEN)),
]

cols_sig = st.columns(5, gap="small")
for i, (lbl, val, sub, color, _) in enumerate(signals):
    with cols_sig[i]:
        st.markdown(f"""
        <div class="signal-card es-a{i+1}">
            <div class="accent" style="background:{color}"></div>
            <div class="lbl">{lbl}</div>
            <div class="val">{val}</div>
            <div class="sub" style="color:{color}">{sub}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<div style='height:.8rem'></div>", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# BLOQUE CENTRAL: Nowcasting (izq) + Alertas (der)
# ─────────────────────────────────────────────────────────────────────────────
col_nc, col_alerts = st.columns([1.75, 1], gap="large")

# ── Nowcasting ────────────────────────────────────────────────────────────────
with col_nc:
    st.markdown(f"""
    <div class="sec-hdr es-a2">
        <div class="bar" style="background:linear-gradient({CYAN},{BLUE})"></div>
        <span class="lbl">Estimación Electoral · Nowcasting</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    _df = (
        df_nc.sort_values("estimacion_pct", ascending=False).copy()
        if not df_nc.empty
        else pd.DataFrame([
            {"partido_siglas": "PP",       "estimacion_pct": 33.0, "ic_95_inf": 30.5, "ic_95_sup": 35.5},
            {"partido_siglas": "PSOE",     "estimacion_pct": 28.5, "ic_95_inf": 26.0, "ic_95_sup": 31.0},
            {"partido_siglas": "VOX",      "estimacion_pct": 12.0, "ic_95_inf":  9.5, "ic_95_sup": 14.5},
            {"partido_siglas": "SUMAR",    "estimacion_pct": 10.5, "ic_95_inf":  8.0, "ic_95_sup": 13.0},
            {"partido_siglas": "JUNTS",    "estimacion_pct":  3.5, "ic_95_inf":  2.0, "ic_95_sup":  5.0},
            {"partido_siglas": "PNV",      "estimacion_pct":  2.8, "ic_95_inf":  1.5, "ic_95_sup":  4.1},
            {"partido_siglas": "ERC",      "estimacion_pct":  2.5, "ic_95_inf":  1.2, "ic_95_sup":  3.8},
            {"partido_siglas": "EH Bildu", "estimacion_pct":  2.2, "ic_95_inf":  1.0, "ic_95_sup":  3.4},
        ])
    )

    # Normalización defensiva para evitar fallos por tipos inesperados en BD.
    for c in ["estimacion_pct", "ic_95_inf", "ic_95_sup"]:
        if c in _df.columns:
            _df[c] = pd.to_numeric(_df[c], errors="coerce")
    _df = _df.dropna(subset=["partido_siglas", "estimacion_pct"]).copy()
    if "ic_95_inf" in _df.columns and "ic_95_sup" in _df.columns:
        _df["ic_95_inf"] = _df["ic_95_inf"].fillna(_df["estimacion_pct"])
        _df["ic_95_sup"] = _df["ic_95_sup"].fillna(_df["estimacion_pct"])

    # Gráfico de barras con IC
    try:
        fig = go.Figure()
        for _, row in _df.iterrows():
            sigla = str(row.get("partido_siglas", "—"))
            color = COLORES_PARTIDOS.get(sigla.upper(), "#64748B")
            if not (isinstance(color, str) and color.startswith("#") and len(color) >= 7):
                color = "#64748B"
            r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
            est = float(row.get("estimacion_pct", 0) or 0)
            ic_inf = float(row.get("ic_95_inf", est) or est)
            ic_sup = float(row.get("ic_95_sup", est) or est)

            fig.add_trace(go.Bar(
                x=[sigla],
                y=[est],
                name=sigla,
                marker=dict(
                    color=f"rgba({r},{g},{b},0.72)",
                    line=dict(color=color, width=1.5),
                ),
                error_y=dict(
                    type="data", symmetric=False,
                    array=[max(0.0, ic_sup - est)],
                    arrayminus=[max(0.0, est - ic_inf)],
                    color=f"rgba({r},{g},{b},0.45)", thickness=1.5, width=5,
                ),
                text=[f"{est:.1f}%"],
                textposition="outside",
                textfont=dict(color=TEXT2, size=10, family="JetBrains Mono, monospace"),
                hovertemplate=(
                    f"<b style='color:{color}'>{sigla}</b><br>"
                    f"Estimación: <b>{est:.1f}%</b><br>"
                    f"IC 95%: [{ic_inf:.1f} – {ic_sup:.1f}]"
                    "<extra></extra>"
                ),
            ))

        ymax_raw = pd.to_numeric(_df.get("ic_95_sup"), errors="coerce").max()
        if pd.isna(ymax_raw):
            ymax_raw = pd.to_numeric(_df.get("estimacion_pct"), errors="coerce").max()
        ymax = float(ymax_raw) + 7 if pd.notna(ymax_raw) else 50.0

        fig.update_layout(
            height=300,
            barmode="group",
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(
                showgrid=False, fixedrange=True,
                tickfont=dict(size=11, color=TEXT2, family="Inter, sans-serif"),
                categoryorder="array",
                categoryarray=_df["partido_siglas"].astype(str).tolist(),
            ),
            yaxis=dict(
                gridcolor=f"{BORDER}88", gridwidth=1, fixedrange=True,
                range=[0, ymax],
                tickfont=dict(size=9, color=MUTED),
                ticksuffix="%",
            ),
            showlegend=False,
            margin=dict(t=16, b=4, l=4, r=4),
            hoverlabel=dict(bgcolor=BG2, bordercolor=BORDER,
                            font=dict(size=11, family="JetBrains Mono, monospace")),
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
    except Exception:
        st.warning("No se pudo renderizar el gráfico de nowcasting en portada. Revisa los datos de entrada.")

    # Tira de chips de partido
    chips_html = '<div class="party-strip">'
    for _, row in _df.iterrows():
        color  = COLORES_PARTIDOS.get(row["partido_siglas"].upper(), "#64748B")
        r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        chips_html += f"""
        <div class="party-chip"
             style="--c:{color};--cr:{r},{g},{b};--bg:linear-gradient(180deg,rgba({r},{g},{b},.09),{BG2});">
            <div style="font-size:.52rem;font-weight:700;color:{MUTED};letter-spacing:.07em;margin-bottom:.15rem">
                {row['partido_siglas']}
            </div>
            <div style="font-size:1.05rem;font-weight:900;color:{color};font-family:'JetBrains Mono',monospace">
                {row['estimacion_pct']:.1f}%
            </div>
            <div style="font-size:.46rem;color:{MUTED};font-family:'JetBrains Mono',monospace;margin-top:.1rem">
                [{row['ic_95_inf']:.1f}–{row['ic_95_sup']:.1f}]
            </div>
        </div>"""
    chips_html += "</div>"
    st.markdown(chips_html, unsafe_allow_html=True)

    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    if st.button("Ver análisis completo de nowcasting →", use_container_width=True):
        st.switch_page("pages/2_Nowcasting.py")

# ── Alertas priorizadas ───────────────────────────────────────────────────────
with col_alerts:
    st.markdown(f"""
    <div class="sec-hdr es-a3">
        <div class="bar" style="background:linear-gradient({RED},{AMBER})"></div>
        <span class="lbl" style="color:{RED}">Alertas</span>
        <div class="line"></div>
        <span class="tag">{_n_alertas()} total</span>
    </div>
    """, unsafe_allow_html=True)

    if not df_alertas.empty:
        # Ordenar: CRITICAL primero, luego WARNING, luego INFO
        _order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
        df_sorted = df_alertas.copy()
        df_sorted["_ord"] = df_sorted["severidad"].map(lambda x: _order.get(str(x).upper(), 3))
        df_sorted = df_sorted.sort_values(["_ord", "created_at"], ascending=[True, False])

        for _, a in df_sorted.head(8).iterrows():
            sev = str(a.get("severidad", "INFO")).upper()
            color_map = {"CRITICAL": RED, "WARNING": AMBER, "INFO": CYAN}
            icon_map  = {"CRITICAL": "!!", "WARNING": "!", "INFO": "i"}
            ac = color_map.get(sev, CYAN)
            icon = icon_map.get(sev, "i")
            titulo = str(a.get("titulo", ""))[:44]
            fecha  = str(a.get("created_at", ""))[:10]
            tipo   = str(a.get("tipo", ""))

            st.markdown(f"""
            <div class="alert-item" style="--ac:{ac}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:.3rem">
                    <div style="display:flex;align-items:center;gap:.4rem;flex:1;min-width:0">
                        <span style="font-size:.55rem;font-weight:900;color:{ac};
                                     background:{ac}18;width:17px;height:17px;flex-shrink:0;
                                     display:flex;align-items:center;justify-content:center;
                                     border-radius:4px;border:1px solid {ac}33">{icon}</span>
                        <span style="font-size:.72rem;font-weight:600;color:{TEXT};
                                     overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{titulo}</span>
                    </div>
                    <span style="font-size:.5rem;font-weight:700;color:{ac};
                                 background:{ac}12;border:1px solid {ac}33;
                                 padding:.1rem .38rem;border-radius:4px;white-space:nowrap;
                                 letter-spacing:.07em">{sev}</span>
                </div>
                <div style="display:flex;gap:.5rem;margin-top:.18rem;margin-left:1.4rem">
                    <span style="font-size:.54rem;color:{MUTED};font-family:'JetBrains Mono',monospace">{fecha}</span>
                    {f'<span style="font-size:.54rem;color:{MUTED};background:{BG3};padding:.05rem .35rem;border-radius:4px;border:1px solid {BORDER}">{tipo}</span>' if tipo else ''}
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="g-card" style="padding:2rem;text-align:center;margin-top:.5rem">
            <div style="width:34px;height:34px;background:{GREEN}14;border:2px solid {GREEN}33;
                        border-radius:9px;margin:0 auto .6rem;display:flex;align-items:center;
                        justify-content:center;font-size:.95rem;color:{GREEN}">✓</div>
            <div style="color:{GREEN};font-weight:700;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase">Sin alertas activas</div>
            <div style="color:{MUTED};font-size:.6rem;margin-top:.3rem">Todos los módulos operativos</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    if st.button("Ver todas las alertas →", use_container_width=True):
        st.switch_page("pages/8_Tiempo_Real.py")

# ─────────────────────────────────────────────────────────────────────────────
# BLOQUE INFERIOR: Macro (izq) + Últimas Elecciones + Noticias (der)
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.2rem 0"></div>
""", unsafe_allow_html=True)

col_macro, col_elec_news = st.columns([1, 1], gap="large")

# ── Macro compacta ────────────────────────────────────────────────────────────
with col_macro:
    st.markdown(f"""
    <div class="sec-hdr es-a4">
        <div class="bar" style="background:linear-gradient({BLUE},{PURPLE})"></div>
        <span class="lbl" style="color:{BLUE}">Indicadores Macro</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    indicadores = [
        ("IPC General (%)",        AMBER,  ".1f", "%",    "IPC"),
        ("Crec. PIB (%)",           GREEN,  ".1f", "%",    "PIB"),
        ("Tasa de Paro (%)",        RED,    ".1f", "%",    "Paro"),
        ("Prima Riesgo (pb)",       RED,    ".0f", " pb",  "Prima"),
        ("Euribor 12m (%)",         CYAN,   ".2f", "%",    "Euribor"),
        ("Deuda Publica (% PIB)",   PURPLE, ".1f", "%",    "Deuda"),
    ]

    if not df_macro.empty:
        cols_m = st.columns(3)
        shown = 0
        for ind, color, fmt, suffix, short in indicadores:
            fila = df_macro[df_macro["indicador"] == ind]
            if fila.empty:
                continue
            try:
                v = float(fila.iloc[0]["valor"])
                display = f"{v:{fmt}}{suffix}"
            except Exception:
                display = str(fila.iloc[0].get("valor", "—"))
            with cols_m[shown % 3]:
                st.markdown(f"""
                <div class="g-card" style="padding:.85rem 1rem;margin-bottom:.45rem;border-top:2px solid {color}44">
                    <div style="font-size:.55rem;font-weight:700;letter-spacing:.1em;color:{MUTED};
                                text-transform:uppercase;margin-bottom:.28rem">{short}</div>
                    <div style="font-size:1.25rem;font-weight:900;color:{TEXT};
                                font-family:'JetBrains Mono',monospace">{display}</div>
                    <div style="font-size:.52rem;color:{color};margin-top:.2rem;font-weight:600">{ind.replace(' (%)', '').replace(' (pb)', '').replace(' (% PIB)', '')}</div>
                </div>
                """, unsafe_allow_html=True)
            shown += 1
    else:
        st.markdown(f"""
        <div class="g-card" style="padding:1.4rem;text-align:center;color:{MUTED};font-size:.75rem">
            Sin datos macro · Ejecuta el ETL de INE/BDE
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
    if st.button("Ver análisis macroeconómico completo →", use_container_width=True):
        st.switch_page("pages/12_Macroeconomia.py")

# ── Últimas elecciones + noticias recientes ───────────────────────────────────
with col_elec_news:
    tab_elec, tab_news = st.tabs(["📋 Últimas Elecciones", "📰 Noticias Recientes"])

    with tab_elec:
        st.markdown(f"""
        <div class="sec-hdr" style="margin-top:.6rem">
            <div class="bar" style="background:linear-gradient({PURPLE},{CYAN})"></div>
            <span class="lbl" style="color:{PURPLE}">Histórico Electoral</span>
            <div class="line"></div>
            <span class="tag">{len(df_elec) if not df_elec.empty else 0} elecciones</span>
        </div>
        """, unsafe_allow_html=True)

        if not df_elec.empty:
            for _, e in df_elec.head(7).iterrows():
                fecha = str(e.get("fecha", ""))[:10]
                desc  = str(e.get("descripcion", "Elecciones Generales"))[:56]
                st.markdown(f"""
                <div class="g-card" style="
                    display:flex;justify-content:space-between;align-items:center;
                    padding:.52rem .9rem;margin-bottom:.3rem;
                    border-left:3px solid {PURPLE}55;border-radius:0 9px 9px 0;
                ">
                    <div style="display:flex;align-items:center;gap:.55rem;flex:1;min-width:0">
                        <div style="width:6px;height:6px;background:{PURPLE};border-radius:50%;
                                    flex-shrink:0;box-shadow:0 0 5px {PURPLE}66"></div>
                        <span style="font-size:.74rem;font-weight:600;color:{TEXT};
                                     overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{desc}</span>
                    </div>
                    <span style="font-size:.6rem;color:{MUTED};white-space:nowrap;margin-left:.5rem;
                                 font-family:'JetBrains Mono',monospace;
                                 background:{BG3};padding:.12rem .42rem;border-radius:5px;
                                 border:1px solid {BORDER}">{fecha}</span>
                </div>
                """, unsafe_allow_html=True)
            st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
            if st.button("Ir al Mapa Electoral →", use_container_width=True):
                st.switch_page("pages/1_Mapa_Electoral.py")
        else:
            st.info("Sin datos de elecciones. Carga el ETL histórico.")

    with tab_news:
        st.markdown(f"""
        <div class="sec-hdr" style="margin-top:.6rem">
            <div class="bar" style="background:linear-gradient({CYAN},{BLUE})"></div>
            <span class="lbl">Noticias (24h)</span>
            <div class="line"></div>
            <span class="tag">{n_news} noticias</span>
        </div>
        """, unsafe_allow_html=True)

        if not df_news.empty:
            _cols_news = [c for c in ["titulo", "fuente", "fecha_publicacion", "sentimiento_score"] if c in df_news.columns]
            df_show = df_news[_cols_news].head(8).copy()

            for _, n in df_show.iterrows():
                titulo = str(n.get("titulo", ""))[:60]
                fuente = str(n.get("fuente", ""))
                fecha  = str(n.get("fecha_publicacion", ""))[:10]
                score  = n.get("sentimiento_score", None)
                if score is not None:
                    try:
                        sv = float(score)
                        scolor = GREEN if sv > 0.1 else (RED if sv < -0.1 else MUTED)
                        score_badge = f'<span style="font-size:.5rem;color:{scolor};background:{scolor}12;padding:.1rem .3rem;border-radius:4px;border:1px solid {scolor}33;font-family:JetBrains Mono,monospace">{sv:+.2f}</span>'
                    except Exception:
                        score_badge = ""
                else:
                    score_badge = ""

                st.markdown(f"""
                <div class="g-card" style="padding:.5rem .85rem;margin-bottom:.28rem">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.4rem">
                        <span style="font-size:.7rem;font-weight:600;color:{TEXT};flex:1;min-width:0;
                                     overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{titulo}</span>
                        {score_badge}
                    </div>
                    <div style="display:flex;gap:.5rem;margin-top:.12rem">
                        <span style="font-size:.54rem;color:{CYAN}88;font-weight:600">{fuente}</span>
                        <span style="font-size:.54rem;color:{MUTED};font-family:'JetBrains Mono',monospace">{fecha}</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)

            if st.button("Ver prensa & agenda completa →", use_container_width=True):
                st.switch_page("pages/10_Prensa_Agenda.py")
        else:
            st.info("Sin noticias recientes. Ejecuta el scraper de prensa.")

# ─────────────────────────────────────────────────────────────────────────────
# AGENDA POLÍTICA DIARIA
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("<div style='height:.85rem'></div>", unsafe_allow_html=True)
try:
    render_agenda_diaria()
except Exception:
    st.caption("Agenda política no disponible temporalmente.")

# ─────────────────────────────────────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.4rem 0 .7rem"></div>
<div style="display:flex;justify-content:space-between;align-items:center;padding:.35rem 0;font-size:.58rem;color:{MUTED}">
    <span>ElectSim España v3.1 &middot; Politeia Analytics &middot; Todos los derechos reservados</span>
    <span style="font-family:'JetBrains Mono',monospace;color:{CYAN}55;display:flex;gap:1rem">
        <span>{len(df_elec) if not df_elec.empty else 0} elecciones</span>
        <span>{len(df_nc) if not df_nc.empty else 0} estimaciones</span>
        <span>{_n_alertas()} alertas</span>
    </span>
</div>
""", unsafe_allow_html=True)
