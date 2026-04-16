"""
Pagina: Nowcasting Electoral — Dark Tech v3
Estimacion en tiempo real con animacion, proyeccion D'Hondt y alertas de transferencia.
"""

from __future__ import annotations

import hashlib
import sys
from io import StringIO
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from dashboard.app_state import get_app_snapshot
from dashboard.shared import (
    sidebar_nav, COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER,
    CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.db import (
    cargar_serie_historica_nowcasting,
    cargar_series_nowcasting_batch,
)
from dashboard.election_math import dhondt_nacional

# ── Config ───────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Nowcasting — ElectSim", layout="wide")
sidebar_nav()

ORDEN_IDEO = [
    "CUP", "EH_BILDU", "EH Bildu", "BNG", "ERC", "PODEMOS", "UP", "IU",
    "SUMAR", "PSOE", "PNV", "JUNTS", "JxCAT", "CC", "CS", "UPN", "PP", "VOX",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _color(siglas: str) -> str:
    return COLORES_PARTIDOS.get(siglas, COLORES_PARTIDOS.get(siglas.upper(), CYAN))


_REQUIRED_COLS = {"partido_siglas", "estimacion_pct", "ic_95_inf", "ic_95_sup"}
_COL_ALIASES = {
    "estimación_pct": "estimacion_pct",
    "estimacion": "estimacion_pct",
    "fecha_estimación": "fecha_estimacion",
    "fecha_calculo": "fecha_estimacion",
    "ic95_inf": "ic_95_inf",
    "ic95_sup": "ic_95_sup",
    "partido": "partido_siglas",
    "siglas": "partido_siglas",
}


def _normalizar(df: pd.DataFrame, context: str = "") -> pd.DataFrame:
    if df.empty:
        return df
    rename_map = {
        src: dst for src, dst in _COL_ALIASES.items()
        if src in df.columns and dst not in df.columns
    }
    out = df.rename(columns=rename_map)

    missing = _REQUIRED_COLS - set(out.columns)
    if missing:
        ctx = f" ({context})" if context else ""
        st.warning(
            "Columnas faltantes en nowcasting"
            + ctx
            + ": "
            + ", ".join(sorted(missing))
        )
    return out


def _hash_df(df: pd.DataFrame, cols: list[str]) -> str:
    if df.empty:
        return "empty"
    payload = df[cols].copy()
    for col in payload.select_dtypes(include="number").columns:
        payload[col] = payload[col].round(3)
    return hashlib.md5(
        payload.to_json(date_format="iso", orient="split").encode("utf-8")
    ).hexdigest()


@st.cache_data(ttl=1800, show_spinner=False)
def _seat_ranges_cached(df_hash: str, df_json: str, n_boot: int = 500) -> dict[str, dict[str, int]]:
    df = pd.read_json(StringIO(df_json), orient="split")
    needed = ["partido_siglas", "estimacion_pct", "ic_95_inf", "ic_95_sup"]
    if df.empty or any(col not in df.columns for col in needed):
        return {}

    partidos = df["partido_siglas"].tolist()
    pcts = df["estimacion_pct"].to_numpy(dtype=float)
    inf_arr = df["ic_95_inf"].to_numpy(dtype=float)
    sup_arr = df["ic_95_sup"].to_numpy(dtype=float)

    # IC 95% -> sigma (aprox normal), con suelo para evitar sigma 0.
    sigmas = (sup_arr - inf_arr) / (2 * 1.96)
    sigmas = np.maximum(sigmas, 0.1)

    rng_seed = int(df_hash[:8], 16) if df_hash and df_hash != "empty" else 42
    rng = np.random.default_rng(rng_seed)
    noise_matrix = rng.normal(0, sigmas, size=(n_boot, len(partidos)))
    pct_matrix = np.clip(pcts + noise_matrix, 0.3, None)

    all_seats: dict[str, list[int]] = {p: [] for p in partidos}
    for i in range(n_boot):
        sim = pct_matrix[i]
        norm_pcts = sim / sim.sum() * 100.0
        seats = dhondt_nacional(dict(zip(partidos, norm_pcts.tolist())))
        for p in partidos:
            all_seats[p].append(int(seats.get(p, 0)))

    return {
        p: {
            "central": int(np.median(all_seats[p])),
            "low": int(np.percentile(all_seats[p], 5)),
            "high": int(np.percentile(all_seats[p], 95)),
        }
        for p in partidos
    }


def _compute_seat_ranges(df: pd.DataFrame, n_boot: int = 500) -> dict[str, dict[str, int]]:
    needed = ["partido_siglas", "estimacion_pct", "ic_95_inf", "ic_95_sup"]
    if df.empty or any(col not in df.columns for col in needed):
        return {}
    payload = df[needed].copy()
    key = _hash_df(payload, needed)
    return _seat_ranges_cached(key, payload.to_json(date_format="iso", orient="split"), n_boot=n_boot)


def seat_transfer_alerts(
    seat_ranges_now: dict[str, dict[str, int]],
    seat_ranges_prev: dict[str, dict[str, int]],
) -> list[dict]:
    """Detecta transferencias de escanos entre periodos."""
    if not seat_ranges_now or not seat_ranges_prev:
        return []

    changes = []
    all_p = set(seat_ranges_now) | set(seat_ranges_prev)
    for p in all_p:
        current = seat_ranges_now.get(p, {}).get("central", 0)
        prev = seat_ranges_prev.get(p, {}).get("central", 0)
        delta = current - prev
        if delta != 0:
            changes.append({
                "partido": p,
                "delta":   delta,
                "actual":  current,
                "previo":  prev,
            })

    changes.sort(key=lambda x: abs(x["delta"]), reverse=True)

    return changes


def _section_header(label: str, color: str):
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.7rem;margin:1.2rem 0 .8rem">
        <div style="width:4px;height:20px;background:linear-gradient({color},{BLUE});border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{color};
                     letter-spacing:.15em;text-transform:uppercase">{label}</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
    </div>
    """, unsafe_allow_html=True)


# ── Cargar datos (snapshot coherente) ────────────────────────────────────────
snapshot = get_app_snapshot()
df_nc = _normalizar(snapshot.get("nowcasting", pd.DataFrame()), context="snapshot_nowcasting")

if df_nc.empty or "estimacion_pct" not in df_nc.columns:
    st.info("Sin datos de nowcasting. Ejecuta el pipeline de modelos.")
    st.stop()

# Filtrar: todos los partidos con IC_sup > 1%  (pueden sacar escaño)
df_nc = df_nc[df_nc["ic_95_sup"] > 1.0].sort_values("estimacion_pct", ascending=False).copy()

# Obtener datos del periodo anterior para comparativa
df_all = _normalizar(cargar_serie_historica_nowcasting(n_fechas=30), context="serie_historica")

if not df_all.empty and "fecha_estimacion" in df_all.columns:
    fechas_sorted = sorted(df_all["fecha_estimacion"].unique())
    fecha_actual  = fechas_sorted[-1] if fechas_sorted else None
    fecha_prev    = fechas_sorted[-2] if len(fechas_sorted) >= 2 else None
    df_prev = df_all[df_all["fecha_estimacion"] == fecha_prev].copy() if fecha_prev else pd.DataFrame()
else:
    fecha_actual = fecha_prev = None
    df_prev = pd.DataFrame()

# Calcular escanos y alertas
seat_ranges = _compute_seat_ranges(df_nc)
df_prev_filtered = (
    df_prev[df_prev["ic_95_sup"] > 1.0].copy()
    if not df_prev.empty and "ic_95_sup" in df_prev.columns
    else df_prev
)
seat_ranges_prev = _compute_seat_ranges(df_prev_filtered)
alerts = seat_transfer_alerts(seat_ranges, seat_ranges_prev)

# ── Estilos extra ────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
  from {{ opacity: 0; transform: translateY(16px); }}
  to   {{ opacity: 1; transform: translateY(0); }}
}}
@keyframes countUp {{
  from {{ opacity: 0; transform: scale(.8); }}
  to   {{ opacity: 1; transform: scale(1); }}
}}
.nc-animate {{ animation: fadeInUp .5s ease-out both; }}
.nc-card {{
  background: linear-gradient(135deg, {BG2}ee, {BG3}cc);
  border: 1px solid {BORDER};
  border-radius: 12px;
  transition: all .25s ease;
  padding: 1rem 1.2rem;
}}
.nc-card:hover {{
  border-color: {CYAN}55;
  box-shadow: 0 4px 20px rgba(0,212,255,0.08);
  transform: translateY(-1px);
}}
.alert-card {{
  border-left: 3px solid;
  border-radius: 0 8px 8px 0;
  padding: .45rem .7rem;
  margin: .25rem 0;
  font-size: .72rem;
}}
.pill {{
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  padding: .15rem .45rem;
  border-radius: 6px;
  font-size: .65rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}}
</style>
""", unsafe_allow_html=True)

# ── Sidebar: controles + alertas ─────────────────────────────────────────────
with st.sidebar:
    st.markdown(f"""
    <div style="font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};
                text-transform:uppercase;padding:.3rem 0 .4rem">Configuracion</div>
    """, unsafe_allow_html=True)
    dias = st.slider("Ventana temporal (dias)", 30, 365, 90)

    st.markdown(f"<div style='height:.5rem'></div>", unsafe_allow_html=True)

    # ── Panel de alertas de escanos ──────────────────────────────────────────
    st.markdown(f"""
    <div style="border-top:1px solid {BORDER};padding-top:.8rem;margin-top:.3rem">
    <div style="font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{AMBER};
                text-transform:uppercase;margin-bottom:.5rem">
        &#9650; Alertas de Escanos
    </div>
    """, unsafe_allow_html=True)

    if fecha_prev:
        fecha_actual_str  = str(fecha_actual)[:10]  if fecha_actual  else "—"
        fecha_prev_str = str(fecha_prev)[:10] if fecha_prev else "—"
        st.markdown(f"""
        <div style="font-size:.58rem;color:{MUTED};margin-bottom:.5rem;
                    font-family:'JetBrains Mono',monospace">
            {fecha_prev_str} → {fecha_actual_str}
        </div>
        """, unsafe_allow_html=True)

    if not alerts:
        st.markdown(f"""
        <div style="background:{GREEN}12;border:1px solid {GREEN}33;border-radius:8px;
                    padding:.6rem .8rem;text-align:center">
            <div style="color:{GREEN};font-size:.68rem;font-weight:700">Sin cambios</div>
            <div style="color:{MUTED};font-size:.58rem">Escanos estables</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        for alert in alerts[:8]:
            p = alert["partido"]
            delta = alert["delta"]
            actual = alert["actual"]
            color = _color(p)
            bg_color = GREEN if delta > 0 else RED
            arrow = "▲" if delta > 0 else "▼"
            sign  = "+" if delta > 0 else ""

            st.markdown(f"""
            <div style="border-left:3px solid {bg_color};border-radius:0 8px 8px 0;
                        padding:.4rem .6rem;margin:.2rem 0;
                        background:linear-gradient(90deg,{bg_color}0a,{BG2});
                        border-top:1px solid {BORDER};border-right:1px solid {BORDER};
                        border-bottom:1px solid {BORDER}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:.72rem;font-weight:700;color:{color}">{p}</span>
                    <span style="font-size:.72rem;font-weight:900;color:{bg_color};
                                 font-family:'JetBrains Mono',monospace">
                        {arrow} {sign}{delta} esc.
                    </span>
                </div>
                <div style="font-size:.58rem;color:{MUTED};margin-top:.15rem">
                    {actual} escanos totales
                </div>
            </div>
            """, unsafe_allow_html=True)

        # Resumen de bloques
        izq = {"PSOE", "SUMAR", "EH_BILDU", "EH Bildu", "ERC", "BNG", "CUP", "PODEMOS"}
        der = {"PP", "VOX", "CS"}
        delta_izq = sum(a["delta"] for a in alerts if a["partido"] in izq)
        delta_der = sum(a["delta"] for a in alerts if a["partido"] in der)

        if delta_izq != 0 or delta_der != 0:
            st.markdown(f"""
            <div style="border-top:1px solid {BORDER};margin-top:.5rem;padding-top:.5rem">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};
                        text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">
                Balance de bloque
            </div>
            <div style="display:flex;gap:.3rem">
                <div style="flex:1;background:{RED}12;border:1px solid {RED}33;border-radius:6px;
                            padding:.3rem .4rem;text-align:center">
                    <div style="font-size:.55rem;color:{MUTED}">Izquierda</div>
                    <div style="font-size:.85rem;font-weight:900;
                                color:{"#10B981" if delta_izq >= 0 else RED};
                                font-family:'JetBrains Mono',monospace">
                        {"+" if delta_izq > 0 else ""}{delta_izq}
                    </div>
                </div>
                <div style="flex:1;background:{BLUE}12;border:1px solid {BLUE}33;border-radius:6px;
                            padding:.3rem .4rem;text-align:center">
                    <div style="font-size:.55rem;color:{MUTED}">Derecha</div>
                    <div style="font-size:.85rem;font-weight:900;
                                color:{"#10B981" if delta_der >= 0 else RED};
                                font-family:'JetBrains Mono',monospace">
                        {"+" if delta_der > 0 else ""}{delta_der}
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)


# ── Header ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="nc-animate" style="
    background:linear-gradient(135deg,{BG2} 0%,#0a1628 50%,{BG3} 100%);
    border:1px solid {BORDER};border-radius:16px;
    padding:2rem 2.5rem;margin-bottom:1.5rem;
    position:relative;overflow:hidden">
    <div style="position:absolute;top:-50px;right:-30px;width:200px;height:200px;
                background:radial-gradient(circle,{CYAN}10,transparent 70%);pointer-events:none"></div>
    <div style="position:absolute;bottom:-40px;left:15%;width:160px;height:160px;
                background:radial-gradient(circle,{PURPLE}08,transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,{CYAN},{PURPLE});
                    border-radius:12px;display:flex;align-items:center;justify-content:center;
                    font-size:1.1rem;flex-shrink:0;box-shadow:0 4px 16px {CYAN}33">&#9685;</div>
        <div>
            <div style="font-size:1.6rem;font-weight:900;color:{TEXT};letter-spacing:-.03em">
                Nowcasting Electoral
            </div>
            <div style="font-size:.78rem;color:{TEXT2};margin-top:.15rem">
                Agregacion ponderada en tiempo real &mdash; {len(df_nc)} partidos con IC > 1%
                {f"&nbsp;&middot;&nbsp;Datos al {str(fecha_actual)[:10]}" if fecha_actual else ""}
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── KPI Cards con escanos proyectados ────────────────────────────────────────
_section_header("Estimacion Actual de Voto — IC 95%", CYAN)

n_col = min(len(df_nc), 5)
cols_top = st.columns(n_col)
for i, (_, row) in enumerate(df_nc.head(n_col).iterrows()):
    p = row["partido_siglas"]
    color = _color(p)
    r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    sr = seat_ranges.get(p, {"central": 0, "low": 0, "high": 0})
    ic_width = row["ic_95_sup"] - row["ic_95_inf"]

    with cols_top[i]:
        st.markdown(f"""
        <div class="nc-card" style="border-top:3px solid {color};text-align:center;
                    animation:fadeInUp .5s ease-out {i*0.08:.2f}s both">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};
                        letter-spacing:.1em;text-transform:uppercase;margin-bottom:.3rem">{p}</div>
            <div style="font-size:2rem;font-weight:900;
                        color:{color};font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 20px rgba({r_c},{g_c},{b_c},0.3)">
                {row['estimacion_pct']:.1f}%
            </div>
            <div style="font-size:.55rem;color:{MUTED};margin:.3rem 0;
                        font-family:'JetBrains Mono',monospace">
                [{row['ic_95_inf']:.1f} — {row['ic_95_sup']:.1f}]
            </div>
            <div style="display:flex;justify-content:center;gap:.3rem;margin-top:.3rem">
                <span style="background:{color}15;border:1px solid {color}44;
                             border-radius:6px;padding:.2rem .45rem;
                             font-size:.62rem;font-weight:800;color:{color};
                             font-family:'JetBrains Mono',monospace">
                    {sr['central']} esc.
                </span>
                <span style="background:{BORDER};border:1px solid {BORDER};
                             border-radius:6px;padding:.2rem .45rem;
                             font-size:.55rem;color:{MUTED};
                             font-family:'JetBrains Mono',monospace">
                    {sr['low']}—{sr['high']}
                </span>
            </div>
        </div>
        """, unsafe_allow_html=True)

# Segunda fila de partidos
if len(df_nc) > n_col:
    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    df_rest = df_nc.iloc[n_col:].reset_index(drop=True)
    cols_bot = st.columns(min(len(df_rest), 5))
    for i, (_, row) in enumerate(df_rest.head(5).iterrows()):
        p = row["partido_siglas"]
        color = _color(p)
        r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        sr = seat_ranges.get(p, {"central": 0, "low": 0, "high": 0})
        with cols_bot[i]:
            st.markdown(f"""
            <div class="nc-card" style="border-top:2px solid {color}88;text-align:center">
                <div style="font-size:.58rem;font-weight:700;color:{MUTED};
                            letter-spacing:.1em;text-transform:uppercase;margin-bottom:.2rem">{p}</div>
                <div style="font-size:1.4rem;font-weight:900;color:{color};
                            font-family:'JetBrains Mono',monospace;line-height:1">{row['estimacion_pct']:.1f}%</div>
                <div style="font-size:.5rem;color:{MUTED};margin:.2rem 0;
                            font-family:'JetBrains Mono',monospace">[{row['ic_95_inf']:.1f}—{row['ic_95_sup']:.1f}]</div>
                <div style="font-size:.6rem;font-weight:700;color:{color};
                            font-family:'JetBrains Mono',monospace">
                    {sr['central']} esc. ({sr['low']}—{sr['high']})
                </div>
            </div>
            """, unsafe_allow_html=True)

st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)

def _render_animated_bar_chart(df_input: pd.DataFrame, seat_ranges_input: dict[str, dict[str, int]]) -> None:
    bars_html = ""
    max_val = float(df_input["ic_95_sup"].max()) + 3.0
    for i, (_, row) in enumerate(df_input.iterrows()):
        partido = str(row["partido_siglas"])
        color = _color(partido)
        pct = float(row["estimacion_pct"])
        inf = float(row["ic_95_inf"])
        sup = float(row["ic_95_sup"])
        sr = seat_ranges_input.get(partido, {"central": 0})
        bar_w = max(0.0, min(100.0, pct / max_val * 100.0))
        ic_l = max(0.0, min(100.0, inf / max_val * 100.0))
        ic_r = max(0.0, min(100.0, sup / max_val * 100.0))
        delay = i * 70

        bars_html += f"""
        <div style="margin-bottom:.55rem">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.22rem">
            <span style="width:64px;font-size:.72rem;font-weight:700;color:{color};
                         font-family:'JetBrains Mono',monospace">{partido}</span>
            <div style="flex:1;position:relative;height:22px;background:{BG3};
                        border-radius:4px;overflow:visible;border:1px solid {BORDER}">
              <div style="position:absolute;top:3px;height:14px;
                          left:{ic_l:.1f}%;width:{max(ic_r - ic_l, 0.8):.1f}%;
                          background:{color}22;border:1px solid {color}55;
                          border-radius:2px"></div>
              <div style="position:absolute;top:0;left:0;height:22px;width:0;border-radius:4px;
                          background:linear-gradient(90deg,{color}cc,{color}88);
                          animation:growBar_{i} .75s cubic-bezier(.16,1,.3,1) {delay}ms forwards"></div>
            </div>
            <span style="width:44px;text-align:right;font-size:.78rem;font-weight:800;color:{color};
                         font-family:'JetBrains Mono',monospace">{pct:.1f}%</span>
            <span style="width:56px;text-align:right;font-size:.62rem;color:{MUTED};
                         font-family:'JetBrains Mono',monospace">{sr['central']} esc.</span>
          </div>
        </div>
        <style>
          @keyframes growBar_{i} {{
            from {{ width: 0; opacity: 0; }}
            to   {{ width: {bar_w:.1f}%; opacity: 1; }}
          }}
        </style>
        """

    st.markdown(f"<div style='padding:.35rem 0'>{bars_html}</div>", unsafe_allow_html=True)


# ── Gráfico animado con barras + IC ──────────────────────────────────────────
_section_header("Estimacion de Voto con Intervalo de Confianza 95% — Animado", CYAN)
_render_animated_bar_chart(df_nc, seat_ranges)

# ── Escanos proyectados + Timeline ──────────────────────────────────────────
col_seats, col_ts = st.columns([1, 1.3], gap="large")

with col_seats:
    _section_header("Escanos Proyectados — D'Hondt", PURPLE)

    # Bar chart de escanos con rangos IC
    df_seats = pd.DataFrame([
        {
            "partido": p,
            "central": v["central"],
            "low":     v["low"],
            "high":    v["high"],
            "color":   _color(p),
        }
        for p, v in seat_ranges.items() if v["central"] > 0
    ]).sort_values("central", ascending=True)

    if not df_seats.empty:
        fig_seats = go.Figure()

        # Background range bars (IC)
        for _, row in df_seats.iterrows():
            c = row["color"]
            r_c, g_c, b_c = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
            if row["high"] > row["low"]:
                fig_seats.add_trace(go.Bar(
                    y=[row["partido"]],
                    x=[row["high"] - row["low"]],
                    base=[row["low"]],
                    orientation="h",
                    marker=dict(color=f"rgba({r_c},{g_c},{b_c},0.15)",
                                line=dict(color=f"rgba({r_c},{g_c},{b_c},0.3)", width=1)),
                    showlegend=False,
                    hoverinfo="skip",
                ))

        # Central value bars
        for _, row in df_seats.iterrows():
            c = row["color"]
            r_c, g_c, b_c = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
            fig_seats.add_trace(go.Bar(
                y=[row["partido"]],
                x=[row["central"]],
                orientation="h",
                marker=dict(color=f"rgba({r_c},{g_c},{b_c},0.8)",
                            line=dict(color=c, width=1.5)),
                text=[f" {row['central']}  [{row['low']}–{row['high']}]"],
                textposition="outside",
                textfont=dict(color=TEXT2, size=9, family="JetBrains Mono, monospace"),
                name=row["partido"],
                showlegend=False,
                hovertemplate=f"{row['partido']}: {row['central']} esc. (IC: {row['low']}–{row['high']})<extra></extra>",
            ))

        # Linea de mayoria absoluta
        fig_seats.add_vline(
            x=176,
            line_dash="dash",
            line_color=AMBER,
            line_width=1.5,
            annotation_text="176",
            annotation_font_color=AMBER,
            annotation_font_size=9,
        )

        max_seats = df_seats["high"].max() + 20
        fig_seats.update_layout(
            height=max(380, len(df_seats) * 38),
            barmode="overlay",
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title="Escanos", gridcolor="rgba(30,41,59,0.5)", gridwidth=1,
                       range=[0, max_seats],
                       tickfont=dict(color=MUTED, size=9)),
            yaxis=dict(tickfont=dict(color=TEXT2, size=10)),
            margin=dict(t=10, b=30, l=10, r=120), showlegend=False,
        )
        st.plotly_chart(fig_seats, use_container_width=True, config={"displayModeBar": False})

        # Totales de bloque
        izq_p = {"PSOE", "SUMAR", "EH_BILDU", "EH Bildu", "ERC", "BNG", "CUP", "PODEMOS"}
        der_p = {"PP", "VOX", "CS"}
        izq_esc = sum(v["central"] for p, v in seat_ranges.items() if p in izq_p)
        der_esc = sum(v["central"] for p, v in seat_ranges.items() if p in der_p)

        c1, c2 = st.columns(2)
        with c1:
            bc = GREEN if izq_esc >= 176 else AMBER if izq_esc >= 150 else RED
            st.markdown(f"""
            <div class="nc-card" style="text-align:center;border-top:2px solid {bc}55">
                <div style="font-size:.56rem;font-weight:700;color:{MUTED};
                            letter-spacing:.1em;text-transform:uppercase">Bloque Izq.</div>
                <div style="font-size:1.6rem;font-weight:900;color:{TEXT};
                            font-family:'JetBrains Mono',monospace">{izq_esc}</div>
                <div style="font-size:.56rem;color:{bc}">
                    {"Mayoria" if izq_esc >= 176 else f"{176 - izq_esc} para mayoria"}</div>
            </div>
            """, unsafe_allow_html=True)
        with c2:
            bc = GREEN if der_esc >= 176 else AMBER if der_esc >= 150 else RED
            st.markdown(f"""
            <div class="nc-card" style="text-align:center;border-top:2px solid {bc}55">
                <div style="font-size:.56rem;font-weight:700;color:{MUTED};
                            letter-spacing:.1em;text-transform:uppercase">Bloque Der.</div>
                <div style="font-size:1.6rem;font-weight:900;color:{TEXT};
                            font-family:'JetBrains Mono',monospace">{der_esc}</div>
                <div style="font-size:.56rem;color:{bc}">
                    {"Mayoria" if der_esc >= 176 else f"{176 - der_esc} para mayoria"}</div>
            </div>
            """, unsafe_allow_html=True)

with col_ts:
    _section_header("Evolucion Temporal del Nowcasting", BLUE)

    partidos_disp = df_nc["partido_siglas"].tolist()
    partidos_sel = st.multiselect(
        "Partidos a mostrar",
        partidos_disp,
        default=partidos_disp[:min(5, len(partidos_disp))],
        key="nc_partidos",
    )

    if partidos_sel:
        fig_ts = go.Figure()
        df_series_all = _normalizar(
            cargar_series_nowcasting_batch(tuple(sorted(partidos_sel)), dias),
            context="series_batch",
        )

        for partido in partidos_sel:
            df_serie = df_series_all[df_series_all["partido_siglas"] == partido]
            if df_serie.empty or "estimacion_pct" not in df_serie.columns:
                continue

            color = _color(partido)
            r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)

            # Banda IC (relleno)
            if "ic_95_sup" in df_serie.columns and "ic_95_inf" in df_serie.columns:
                x_band = pd.concat([df_serie["fecha_estimacion"],
                                    df_serie["fecha_estimacion"].iloc[::-1]])
                y_band = pd.concat([df_serie["ic_95_sup"],
                                    df_serie["ic_95_inf"].iloc[::-1]])
                fig_ts.add_trace(go.Scatter(
                    x=x_band, y=y_band,
                    fill="toself",
                    fillcolor=f"rgba({r_c},{g_c},{b_c},0.12)",
                    line=dict(color="rgba(255,255,255,0)"),
                    showlegend=False, hoverinfo="skip",
                ))

            # Linea principal
            fig_ts.add_trace(go.Scatter(
                x=df_serie["fecha_estimacion"],
                y=df_serie["estimacion_pct"],
                name=partido,
                mode="lines+markers",
                line=dict(width=2.5, color=color),
                marker=dict(size=7, color=color,
                            line=dict(width=1.5, color=BG)),
                hovertemplate=f"<b>{partido}</b>: %{{y:.1f}}%<br>%{{x}}<extra></extra>",
            ))

        fig_ts.update_layout(
            height=480,
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(gridcolor="rgba(30,41,59,0.5)",
                       tickfont=dict(color=MUTED, size=9)),
            yaxis=dict(title="% Voto", gridcolor="rgba(30,41,59,0.5)",
                       tickfont=dict(color=MUTED, size=9), ticksuffix="%"),
            hovermode="x unified",
            hoverlabel=dict(bgcolor=BG2, font=dict(size=11), bordercolor=BORDER),
            legend=dict(orientation="h", y=-0.12,
                        font=dict(color=TEXT2, size=10),
                        bgcolor="rgba(0,0,0,0)"),
            margin=dict(t=10, b=50, l=40, r=10),
        )
        st.plotly_chart(fig_ts, use_container_width=True, config={"displayModeBar": False})
    else:
        st.info("Selecciona al menos un partido.")

# ── Tabla detallada ──────────────────────────────────────────────────────────
st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);
            margin:1.5rem 0 1rem"></div>
""", unsafe_allow_html=True)
_section_header("Tabla Completa de Estimaciones", CYAN)

# Combinar con datos de escanos
df_tabla = df_nc.copy()
df_tabla["escanos_est"]  = df_tabla["partido_siglas"].map(lambda p: seat_ranges.get(p, {}).get("central", 0))
df_tabla["escanos_min"]  = df_tabla["partido_siglas"].map(lambda p: seat_ranges.get(p, {}).get("low", 0))
df_tabla["escanos_max"]  = df_tabla["partido_siglas"].map(lambda p: seat_ranges.get(p, {}).get("high", 0))

# Delta vs periodo anterior
if not df_prev.empty:
    prev_map = dict(zip(df_prev["partido_siglas"], df_prev["estimacion_pct"]))
    df_tabla["delta_semana"] = df_tabla.apply(
        lambda row: round(row["estimacion_pct"] - prev_map.get(row["partido_siglas"], row["estimacion_pct"]), 2),
        axis=1,
    )
else:
    df_tabla["delta_semana"] = 0.0

cols_show = ["partido_siglas", "estimacion_pct", "ic_95_inf", "ic_95_sup",
             "escanos_est", "escanos_min", "escanos_max", "delta_semana", "n_encuestas"]
cols_show = [c for c in cols_show if c in df_tabla.columns]

st.dataframe(
    df_tabla[cols_show].rename(columns={
        "partido_siglas":  "Partido",
        "estimacion_pct":  "Estimacion (%)",
        "ic_95_inf":       "IC 95% Inf",
        "ic_95_sup":       "IC 95% Sup",
        "escanos_est":     "Escanos (central)",
        "escanos_min":     "Escanos (min)",
        "escanos_max":     "Escanos (max)",
        "delta_semana":    "Δ Semana (%)",
        "n_encuestas":     "N Encuestas",
    }).round(2),
    hide_index=True,
    use_container_width=True,
)

st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);
            margin:1rem 0 .5rem"></div>
<div style="text-align:center;font-size:.58rem;color:{MUTED};padding:.3rem 0">
    Nowcasting: agregacion con decay exp(-&lambda;&middot;dias) &middot; correccion house effects &middot;
    ponderacion &radic;N &middot; D'Hondt provincial (52 circunscripciones) &middot;
    umbral 3% (partidos nacionales) / 1% (regionales)
</div>
""", unsafe_allow_html=True)
