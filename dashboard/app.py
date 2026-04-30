"""
ElectSim España — Dashboard Principal (Politeia Edition)
"""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER,
    CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)

st.set_page_config(
    page_title="ElectSim España — Politeia",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ── Data (todo de una vez) ────────────────────────────────────────────────────
from dashboard.db import (
    cargar_alertas, cargar_elecciones,
    cargar_nowcasting, cargar_macro_ultimo,
)

df_elec    = cargar_elecciones("generales")
df_macro   = cargar_macro_ultimo()
df_alertas = cargar_alertas(solo_no_leidas=False)
df_nc      = cargar_nowcasting()

# ── Precomputar valores ───────────────────────────────────────────────────────
n_alertas_criticas = (
    len(df_alertas[df_alertas["severidad"] == "CRITICAL"])
    if not df_alertas.empty else 0
)
n_alertas = len(df_alertas) if not df_alertas.empty else 0
n_nc      = len(df_nc)      if not df_nc.empty      else 0
n_elec    = len(df_elec)    if not df_elec.empty     else 0

def _macro(indicador: str, fmt: str = ".1f", sfx: str = "") -> str:
    if df_macro.empty:
        return "---"
    r = df_macro[df_macro["indicador"] == indicador]
    return f"{float(r.iloc[0]['valor']):{fmt}}{sfx}" if not r.empty else "---"

ipc_val   = _macro("IPC General (%)",   ".1f", "%")
prima_val = _macro("Prima Riesgo (pb)", ".0f", " pb")

# ── Generadores HTML ──────────────────────────────────────────────────────────

def _kpi_card(label: str, value: str, color: str, subtitle: str) -> str:
    return (
        f'<div style="padding:1.1rem 1.2rem;background:{BG2};border:1px solid {BORDER};'
        f'border-top:2px solid {color}66;border-radius:14px">'
        f'<div style="font-size:.6rem;font-weight:700;letter-spacing:.12em;color:{MUTED};'
        f'text-transform:uppercase;margin-bottom:.4rem">{label}</div>'
        f'<div style="font-size:1.65rem;font-weight:900;color:{TEXT};'
        f'font-family:\'JetBrains Mono\',monospace;line-height:1">{value}</div>'
        f'<div style="font-size:.6rem;color:{color};margin-top:.35rem;font-weight:600">{subtitle}</div>'
        f'</div>'
    )


def _bar_chart(df) -> str:
    if df.empty:
        return f'<p style="color:{MUTED}">Sin datos de nowcasting.</p>'
    df_s = df.sort_values("estimacion_pct", ascending=False)
    mx = float(df_s["estimacion_pct"].max()) or 1
    bars = []
    for _, row in df_s.iterrows():
        color = COLORES_PARTIDOS.get(str(row["partido_siglas"]).upper(), "#888")
        pct   = float(row["estimacion_pct"])
        h     = (pct / mx) * 100
        bars.append(
            f'<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;'
            f'align-items:center;gap:.25rem">'
            f'<span style="font-size:.68rem;font-weight:700;color:{color}">{pct:.1f}%</span>'
            f'<div style="width:70%;height:{h:.0f}%;background:{color};border-radius:4px 4px 0 0;'
            f'min-height:3px"></div>'
            f'<span style="font-size:.52rem;color:{TEXT2};font-weight:600">{row["partido_siglas"]}</span>'
            f'</div>'
        )
    return (
        f'<div style="height:220px;display:flex;align-items:flex-end;gap:3px;'
        f'padding-bottom:1.2rem;border-bottom:1px solid {BORDER}">'
        + "".join(bars) + "</div>"
    )


def _mini_tiles(df) -> str:
    if df.empty:
        return ""
    df_s = df.sort_values("estimacion_pct", ascending=False)
    tiles = []
    for _, row in df_s.iterrows():
        color = COLORES_PARTIDOS.get(str(row["partido_siglas"]).upper(), "#888")
        pct   = float(row["estimacion_pct"])
        lo    = float(row["ic_95_inf"])
        hi    = float(row["ic_95_sup"])
        tiles.append(
            f'<div style="text-align:center;padding:.55rem .2rem;background:{BG3};'
            f'border:1px solid {BORDER};border-top:2px solid {color};border-radius:0 0 8px 8px">'
            f'<div style="font-size:.52rem;font-weight:700;color:{MUTED};letter-spacing:.06em">'
            f'{row["partido_siglas"]}</div>'
            f'<div style="font-size:1rem;font-weight:900;color:{color};'
            f'font-family:\'JetBrains Mono\',monospace">{pct:.1f}%</div>'
            f'<div style="font-size:.45rem;color:{MUTED};font-family:monospace">'
            f'[{lo:.1f}–{hi:.1f}]</div>'
            f'</div>'
        )
    cols = len(tiles)
    return (
        f'<div style="display:grid;grid-template-columns:repeat({cols},1fr);gap:.3rem;margin-top:.8rem">'
        + "".join(tiles) + "</div>"
    )


def _alerts_html(df, n: int = 7) -> str:
    if df.empty:
        return (
            f'<div style="padding:1.5rem;text-align:center;color:{GREEN};'
            f'font-size:.75rem;font-weight:700">&#10003; Sin alertas activas</div>'
        )
    items = []
    for _, a in df.head(n).iterrows():
        sev   = str(a.get("severidad", "INFO")).upper()
        color = RED if sev == "CRITICAL" else (AMBER if sev == "WARNING" else CYAN)
        label = "CRÍT." if sev == "CRITICAL" else ("AVISO" if sev == "WARNING" else "INFO")
        titulo = str(a.get("titulo", ""))[:46]
        fecha  = str(a.get("created_at", ""))[:10]
        items.append(
            f'<div style="border-left:3px solid {color};padding:.45rem .7rem;margin:.2rem 0;'
            f'background:linear-gradient(90deg,{color}08,{BG2});border-radius:0 8px 8px 0;'
            f'border-top:1px solid {BORDER};border-right:1px solid {BORDER};border-bottom:1px solid {BORDER}">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;gap:.3rem">'
            f'<span style="font-size:.72rem;font-weight:600;color:{TEXT};overflow:hidden;'
            f'text-overflow:ellipsis;white-space:nowrap;flex:1">{titulo}</span>'
            f'<span style="font-size:.5rem;font-weight:700;color:{color};background:{color}12;'
            f'border:1px solid {color}33;padding:.1rem .35rem;border-radius:4px;white-space:nowrap">{label}</span>'
            f'</div>'
            f'<div style="font-size:.55rem;color:{MUTED};margin-top:.1rem;font-family:monospace">{fecha}</div>'
            f'</div>'
        )
    return "\n".join(items)


def _macro_html(df) -> str:
    if df.empty:
        return f'<p style="color:{MUTED};font-size:.75rem">Sin datos macro. Ejecuta el ETL.</p>'
    indicadores = [
        ("IPC General (%)",       AMBER,  "%",  ".1f"),
        ("Crec. PIB (%)",         GREEN,  "%",  ".1f"),
        ("Prima Riesgo (pb)",     RED,    " pb", ".0f"),
        ("Euribor 12m (%)",       CYAN,   "%",  ".2f"),
        ("IBEX 35",               BLUE,   "",   ",.0f"),
        ("Deuda Pública (% PIB)", PURPLE, "%",  ".1f"),
    ]
    cards = []
    for ind, color, sfx, fmt in indicadores:
        r = df[df["indicador"] == ind]
        if r.empty:
            continue
        val   = float(r.sort_values("fecha", ascending=False).iloc[0]["valor"])
        label = ind.replace(" (%)", "").replace(" (pb)", "").replace(" (% PIB)", "")
        disp  = f"{val:,.0f}" if ind == "IBEX 35" else f"{val:{fmt}}{sfx}"
        cards.append(
            f'<div style="padding:.9rem 1rem;background:{BG2};border:1px solid {BORDER};'
            f'border-top:2px solid {color}55;border-radius:12px">'
            f'<div style="font-size:.56rem;font-weight:700;letter-spacing:.1em;color:{MUTED};'
            f'text-transform:uppercase;margin-bottom:.3rem">{label}</div>'
            f'<div style="font-size:1.3rem;font-weight:800;color:{TEXT};'
            f'font-family:\'JetBrains Mono\',monospace">{disp}</div>'
            f'</div>'
        )
    return f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">{"".join(cards)}</div>'


def _elections_html(df, n: int = 6) -> str:
    if df.empty:
        return f'<p style="color:{MUTED};font-size:.75rem">Sin datos de elecciones.</p>'
    items = []
    for _, e in df.head(n).iterrows():
        items.append(
            f'<div style="display:flex;justify-content:space-between;align-items:center;'
            f'padding:.55rem .85rem;margin:.2rem 0;background:{BG2};border:1px solid {BORDER};'
            f'border-left:3px solid {PURPLE}55;border-radius:0 10px 10px 0">'
            f'<span style="font-size:.76rem;font-weight:600;color:{TEXT};overflow:hidden;'
            f'text-overflow:ellipsis;white-space:nowrap">{str(e.get("descripcion",""))[:52]}</span>'
            f'<span style="font-size:.62rem;color:{MUTED};font-family:monospace;'
            f'flex-shrink:0;margin-left:.5rem;background:{BG3};padding:.12rem .4rem;'
            f'border-radius:5px;border:1px solid {BORDER}">{str(e.get("fecha",""))[:10]}</span>'
            f'</div>'
        )
    return "\n".join(items)


# ── Construir bloques HTML ────────────────────────────────────────────────────
kpi_cards_html = "".join(_kpi_card(*k) for k in [
    ("Elecciones en BD",       str(n_elec),    CYAN,   "Base de datos histórica"),
    ("Partidos monitorizados", str(n_nc),       BLUE,   "Con nowcasting activo"),
    ("IPC General",            ipc_val,         AMBER,  "Último dato disponible"),
    ("Prima de Riesgo",        prima_val,       PURPLE, "Diferencial bono 10Y"),
    ("Alertas del sistema",    str(n_alertas),
     RED if n_alertas_criticas else GREEN,
     f"{n_alertas_criticas} críticas" if n_alertas_criticas else "Sin alertas críticas"),
])

bar_html    = _bar_chart(df_nc)
mini_html   = _mini_tiles(df_nc)
alerts_html = _alerts_html(df_alertas)
macro_html  = _macro_html(df_macro)
elec_html   = _elections_html(df_elec)

# ── Render: 1 bloque CSS + 1 bloque HTML ─────────────────────────────────────
st.markdown(f"""
<style>
.es-card {{
    background:linear-gradient(135deg,{BG2}ee,{BG3}cc);
    border:1px solid {BORDER};border-radius:14px;
    transition:border-color .2s ease;
}}
.es-card:hover {{ border-color:{CYAN}44; }}
.es-section-label {{
    display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem;
}}
.es-section-label .bar {{
    width:4px;height:20px;border-radius:2px;flex-shrink:0;
}}
.es-section-label span {{
    font-size:.72rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
}}
.es-divider {{
    height:1px;
    background:linear-gradient(90deg,transparent,{BORDER},transparent);
    margin:1.4rem 0;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="background:linear-gradient(135deg,{BG2} 0%,#0a1628 40%,{BG3} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:1.8rem 2.2rem;
            margin-bottom:1.4rem">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:1.2rem">
      <div style="width:48px;height:48px;
                  background:linear-gradient(135deg,{CYAN},{BLUE},{PURPLE});
                  border-radius:12px;display:flex;align-items:center;justify-content:center;
                  font-weight:900;font-size:1.1rem;color:{BG};flex-shrink:0">ES</div>
      <div>
        <div style="font-size:.6rem;font-weight:700;letter-spacing:.25em;color:{CYAN}aa;
                    text-transform:uppercase;margin-bottom:.3rem">
          Gemelo Digital · Político · Social · Económico
        </div>
        <div style="font-size:2rem;font-weight:900;color:{TEXT};letter-spacing:-.04em;line-height:1.05">
          Elect<span style="background:linear-gradient(90deg,{CYAN},{BLUE});
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text">Sim</span>
          <span style="font-weight:400;color:{TEXT2};font-size:1.3rem;margin-left:.1rem">España</span>
        </div>
        <div style="font-size:.75rem;color:{TEXT2};margin-top:.25rem">
          Politeia Analytics — Modelos electorales en tiempo real
        </div>
      </div>
    </div>
    <div style="display:inline-flex;align-items:center;gap:.4rem;
                background:{GREEN}12;border:1px solid {GREEN}33;
                border-radius:24px;padding:.3rem .85rem">
      <span style="display:inline-block;width:7px;height:7px;background:{GREEN};border-radius:50%"></span>
      <span style="font-size:.65rem;font-weight:700;color:{GREEN};letter-spacing:.1em;text-transform:uppercase">
        Sistema activo
      </span>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── KPI row ───────────────────────────────────────────────────────────────────
st.markdown(
    f'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.7rem;margin-bottom:1.4rem">'
    f'{kpi_cards_html}</div>',
    unsafe_allow_html=True,
)

# ── Nowcasting + Alertas ──────────────────────────────────────────────────────
col_nc, col_alerts = st.columns([1.7, 1], gap="large")

with col_nc:
    st.markdown(f"""
<div class="es-section-label">
  <div class="bar" style="background:linear-gradient({CYAN},{BLUE})"></div>
  <span style="color:{CYAN}">Estimación Electoral · Nowcasting</span>
</div>
{bar_html}
{mini_html}
""", unsafe_allow_html=True)

with col_alerts:
    st.markdown(f"""
<div class="es-section-label">
  <div class="bar" style="background:linear-gradient({RED},{AMBER})"></div>
  <span style="color:{RED}">Alertas</span>
  <span style="font-size:.6rem;color:{MUTED};background:{BG3};padding:.15rem .45rem;
               border-radius:8px;border:1px solid {BORDER};margin-left:auto">{n_alertas} total</span>
</div>
{alerts_html}
""", unsafe_allow_html=True)

st.markdown('<div class="es-divider"></div>', unsafe_allow_html=True)

# ── Macro + Elecciones ────────────────────────────────────────────────────────
col_macro, col_elec = st.columns([1, 1], gap="large")

with col_macro:
    st.markdown(f"""
<div class="es-section-label">
  <div class="bar" style="background:linear-gradient({BLUE},{PURPLE})"></div>
  <span style="color:{BLUE}">Indicadores Macro</span>
</div>
{macro_html}
""", unsafe_allow_html=True)

with col_elec:
    st.markdown(f"""
<div class="es-section-label">
  <div class="bar" style="background:linear-gradient({PURPLE},{CYAN})"></div>
  <span style="color:{PURPLE}">Últimas Elecciones</span>
</div>
{elec_html}
""", unsafe_allow_html=True)
    st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
    if st.button("Ver mapa electoral completo  →", use_container_width=True):
        st.switch_page("pages/1_Mapa_Electoral.py")

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="es-divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;
            font-size:.6rem;color:{MUTED};padding:.2rem 0">
  <span>ElectSim España v2.0 · Politeia Analytics</span>
  <span style="font-family:monospace;color:{CYAN}66">
    {n_elec} elecciones &nbsp;·&nbsp; {n_nc} partidos monitorizados
  </span>
</div>
""", unsafe_allow_html=True)
