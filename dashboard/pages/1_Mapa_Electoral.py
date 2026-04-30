"""
Pagina: Mapa Electoral — Dark Tech Edition
Choropleth interactivo por provincias, hemiciclo y comparativa.
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER,
    CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.db import (
    cargar_elecciones,
    cargar_nowcasting,
    cargar_resultados_electorales,
    cargar_resultados_nacionales,
    cargar_resultados_provinciales,
)

# ── Config ───────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Mapa Electoral — ElectSim", layout="wide")
sidebar_nav()

TIPOS_ELECCION = ["generales", "autonomicas", "municipales", "europeas"]
TIPOS_DB       = ["generales", "autonomicas", "municipales", "europeas"]

ORDEN_IDEOLOGICO = [
    "CUP", "EH Bildu", "EH_BILDU", "BNG", "ERC", "PODEMOS", "UP", "IU",
    "SUMAR", "PSOE", "PNV", "JUNTS", "JxCAT", "CC", "CS", "UPN", "PP", "VOX",
]

# Province name mapping: GeoJSON name -> DB province_id
GEOJSON_PATH = Path(__file__).parent.parent / "data" / "spain_provinces.geojson"
MAPPING_PATH = Path(__file__).parent.parent / "data" / "province_mapping.json"


def _color(siglas: str) -> str:
    return COLORES_PARTIDOS.get(siglas, COLORES_PARTIDOS.get(siglas.upper(), CYAN))


# ── Estilos extra ────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
  from {{ opacity: 0; transform: translateY(16px); }}
  to   {{ opacity: 1; transform: translateY(0); }}
}}
.map-animate {{ animation: fadeInUp .5s ease-out both; }}
.section-hdr {{
  display:flex;align-items:center;gap:.7rem;margin:1.5rem 0 1rem;
}}
.section-hdr .bar {{
  width:4px;height:20px;border-radius:2px;
}}
.section-hdr .label {{
  font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
}}
.section-hdr .line {{
  flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG});
}}
.glass {{
  background:linear-gradient(135deg,{BG2}ee,{BG3}cc);
  border:1px solid {BORDER};border-radius:12px;
  padding:1rem 1.2rem;transition:all .2s ease;
}}
.glass:hover {{ border-color:{CYAN}44;box-shadow:0 2px 16px {CYAN}0a; }}
.partido-pill {{
  display:inline-flex;align-items:center;gap:.4rem;
  padding:.25rem .6rem;border-radius:8px;font-size:.68rem;
  font-weight:700;font-family:'JetBrains Mono',monospace;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="map-animate" style="
    background:linear-gradient(135deg,{BG2} 0%,#0a1628 50%,{BG3} 100%);
    border:1px solid {BORDER};border-radius:16px;
    padding:2rem 2.5rem;margin-bottom:1.5rem;
    position:relative;overflow:hidden">
    <div style="position:absolute;top:-60px;right:-30px;width:240px;height:240px;
                background:radial-gradient(circle,{PURPLE}12,transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,{PURPLE},{BLUE});
                    border-radius:12px;display:flex;align-items:center;justify-content:center;
                    font-size:1.1rem;flex-shrink:0;box-shadow:0 4px 16px {PURPLE}33">&#9670;</div>
        <div>
            <div style="font-size:1.6rem;font-weight:900;color:{TEXT};letter-spacing:-.03em">
                Mapa Electoral
            </div>
            <div style="font-size:.78rem;color:{TEXT2};margin-top:.15rem">
                Resultados historicos, estimaciones y distribucion territorial por provincias
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(f"""
    <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;color:{MUTED};
                text-transform:uppercase;padding:.5rem 0 .3rem">Filtros del Mapa</div>
    """, unsafe_allow_html=True)
    tipo_idx = st.selectbox(
        "Tipo de eleccion",
        range(len(TIPOS_ELECCION)),
        format_func=lambda i: TIPOS_ELECCION[i].title(),
    )
    tipo_db = TIPOS_DB[tipo_idx]
    with st.spinner("Cargando datos..."):
        df_elec_sidebar = cargar_elecciones(tipo_db)
    eleccion_id: int | None = None
    if not df_elec_sidebar.empty:
        opciones_sidebar = {
            row.get("descripcion") or str(row["fecha"]): row["id"]
            for _, row in df_elec_sidebar.iterrows()
        }
        sel_sidebar = st.selectbox("Eleccion", list(opciones_sidebar.keys()))
        eleccion_id = opciones_sidebar[sel_sidebar]
    else:
        st.warning(f"No hay elecciones '{TIPOS_ELECCION[tipo_idx]}' en la BD.")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _section_header(label: str, color: str):
    st.markdown(f"""
    <div class="section-hdr">
        <div class="bar" style="background:linear-gradient({color},{BLUE})"></div>
        <span class="label" style="color:{color}">{label}</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)


def hemiciclo_chart(partidos_escanos: list[tuple[str, int, str]]) -> go.Figure:
    """Hemiciclo dark con escanos como puntos en semicirculo."""
    total = sum(e for _, e, _ in partidos_escanos)
    if total == 0:
        return go.Figure()

    traces = []
    angle_start = 0.0
    n_rows = 5
    for siglas, escanos, color in partidos_escanos:
        if escanos <= 0:
            continue
        cr, cg, cb = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        angle_span = (escanos / total) * math.pi
        angles = [angle_start + (i + 0.5) * angle_span / max(escanos, 1) for i in range(escanos)]
        rows = [angles[i::n_rows] for i in range(n_rows)]
        for row_i, row_angles in enumerate(rows):
            if not row_angles:
                continue
            r = 0.55 + row_i * 0.1
            xs = [r * math.cos(a) for a in row_angles]
            ys = [r * math.sin(a) for a in row_angles]
            traces.append(go.Scatter(
                x=xs, y=ys, mode="markers",
                marker=dict(color=color, size=7, line=dict(width=0.5, color=f"rgba({cr},{cg},{cb},0.53)")),
                name=siglas, showlegend=(row_i == 0),
                hovertemplate=f"{siglas}: {escanos} escanos<extra></extra>",
            ))
        angle_start += angle_span

    fig = go.Figure(traces)
    fig.update_layout(
        height=320,
        xaxis=dict(visible=False, range=[-1.15, 1.15]),
        yaxis=dict(visible=False, range=[-0.12, 1.15]),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        legend=dict(
            orientation="h", y=-0.08,
            font=dict(size=10, color=TEXT2, family="Inter, sans-serif"),
            bgcolor="rgba(0,0,0,0)",
        ),
        margin=dict(t=10, b=45, l=10, r=10),
    )
    # Linea central del hemiciclo
    fig.add_shape(type="line", x0=0, y0=-0.05, x1=0, y1=0.02,
                  line=dict(color=BORDER, width=1, dash="dot"))
    return fig


@st.cache_data(ttl=3600)
def _load_geojson():
    """Carga GeoJSON de provincias."""
    if GEOJSON_PATH.exists():
        with open(GEOJSON_PATH) as f:
            return json.load(f)
    return None


@st.cache_data(ttl=3600)
def _load_province_mapping():
    """Mapping GeoJSON name -> DB province_id."""
    if MAPPING_PATH.exists():
        with open(MAPPING_PATH) as f:
            return json.load(f)
    return {}


def _build_choropleth(df_prov: pd.DataFrame, partido_filter: str | None = None) -> go.Figure | None:
    """Construye mapa choropleth de provincias."""
    geojson = _load_geojson()
    mapping = _load_province_mapping()
    if geojson is None or not mapping:
        return None

    # Reverse mapping: DB province_id -> GeoJSON name
    id_to_geo = {v: k for k, v in mapping.items()}

    if partido_filter:
        # Show one party's results
        df_map = df_prov[df_prov["siglas"] == partido_filter].copy()
        if df_map.empty:
            return None
        df_map["geo_name"] = df_map["provincia_id"].map(id_to_geo)
        df_map = df_map.dropna(subset=["geo_name"])
        color = _color(partido_filter)

        # Convert party hex color to rgba variants for color scale
        rc, gc, bc = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        fig = px.choropleth_mapbox(
            df_map,
            geojson=geojson,
            locations="geo_name",
            featureidkey="properties.name",
            color="escanos",
            color_continuous_scale=[
                [0,    "#111827"],
                [0.01, f"rgba({rc},{gc},{bc},0.20)"],
                [0.5,  f"rgba({rc},{gc},{bc},0.55)"],
                [1,    color],
            ],
            hover_name="provincia",
            hover_data={"escanos": True, "porcentaje": ":.1f", "geo_name": False},
            labels={"escanos": "Escanos", "porcentaje": "% Voto"},
            mapbox_style="carto-darkmatter",
            center={"lat": 40.0, "lon": -3.7},
            zoom=4.5,
            opacity=0.85,
        )
    else:
        # Show winning party per province
        winner_rows = []
        for prov_id in df_prov["provincia_id"].unique():
            prov_data = df_prov[df_prov["provincia_id"] == prov_id]
            winner = prov_data.loc[prov_data["escanos"].idxmax()]
            geo_name = id_to_geo.get(int(prov_id))
            if geo_name:
                winner_rows.append({
                    "geo_name": geo_name,
                    "provincia": winner["provincia"],
                    "partido_ganador": winner["siglas"],
                    "escanos": int(winner["escanos"]),
                    "porcentaje": float(winner["porcentaje"]),
                    "color": _color(winner["siglas"]),
                })
        if not winner_rows:
            return None
        df_winners = pd.DataFrame(winner_rows)

        # Assign numeric for color mapping
        partidos_unicos = df_winners["partido_ganador"].unique().tolist()
        color_map = {p: _color(p) for p in partidos_unicos}
        df_winners["color_val"] = df_winners["partido_ganador"].map(
            {p: i for i, p in enumerate(partidos_unicos)}
        )

        fig = go.Figure()
        for partido in partidos_unicos:
            df_p = df_winners[df_winners["partido_ganador"] == partido]
            color = color_map[partido]
            fig.add_trace(go.Choroplethmapbox(
                geojson=geojson,
                locations=df_p["geo_name"],
                featureidkey="properties.name",
                z=[1] * len(df_p),
                colorscale=[[0, color], [1, color]],
                showscale=False,
                name=partido,
                marker=dict(opacity=0.8, line=dict(width=1, color=BG)),
                text=df_p.apply(
                    lambda r: f"{r['provincia']}<br>{r['partido_ganador']}: {r['escanos']} esc. ({r['porcentaje']:.1f}%)",
                    axis=1,
                ),
                hovertemplate="%{text}<extra></extra>",
            ))

        fig.update_layout(
            mapbox=dict(
                style="carto-darkmatter",
                center={"lat": 40.0, "lon": -3.7},
                zoom=4.5,
            ),
        )

    fig.update_layout(
        height=520,
        paper_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=5, b=5, l=5, r=5),
        legend=dict(
            bgcolor="rgba(13,19,32,0.87)",
            bordercolor=BORDER,
            borderwidth=1,
            font=dict(color=TEXT2, size=11),
            orientation="h", y=-0.02,
        ),
    )
    return fig


def _estimate_seats_dhondt(df_prov: pd.DataFrame, df_nc: pd.DataFrame) -> pd.DataFrame:
    """Aplica D'Hondt por provincia usando las estimaciones nacionales de nowcasting."""
    if df_nc.empty or df_prov.empty:
        return pd.DataFrame()

    nc_est = {
        row["partido_siglas"]: float(row["estimacion_pct"])
        for _, row in df_nc.iterrows()
    }
    nc_ic_inf = {
        row["partido_siglas"]: float(row.get("ic_95_inf", row["estimacion_pct"]))
        for _, row in df_nc.iterrows()
    }
    nc_ic_sup = {
        row["partido_siglas"]: float(row.get("ic_95_sup", row["estimacion_pct"]))
        for _, row in df_nc.iterrows()
    }

    # Seats per province from historical reference
    prov_info = (
        df_prov.groupby(["provincia_id", "provincia", "ccaa"])["escanos"]
        .sum().reset_index().rename(columns={"escanos": "total_escanos"})
    )

    eligible = {p: v for p, v in nc_est.items() if v >= 3.0}
    if not eligible:
        return pd.DataFrame()
    total_pct = sum(eligible.values())
    norm = {p: v / total_pct * 100 for p, v in eligible.items()}

    rows = []
    for _, prov_row in prov_info.iterrows():
        total = int(prov_row["total_escanos"])
        if total <= 0:
            continue
        asignados: dict[str, int] = defaultdict(int)
        for _ in range(total):
            cocientes = {p: norm[p] / (asignados[p] + 1) for p in eligible}
            winner = max(cocientes, key=cocientes.get)  # type: ignore[arg-type]
            asignados[winner] += 1

        for partido, esc_est in asignados.items():
            hist = df_prov[
                (df_prov["provincia_id"] == prov_row["provincia_id"]) &
                (df_prov["siglas"] == partido)
            ]["escanos"].sum()
            rows.append({
                "provincia_id":  prov_row["provincia_id"],
                "provincia":     prov_row["provincia"],
                "ccaa":          prov_row["ccaa"],
                "siglas":        partido,
                "escanos_est":   esc_est,
                "escanos_hist":  int(hist),
                "delta":         esc_est - int(hist),
                "pct_est":       nc_est.get(partido, 0),
            })

    return pd.DataFrame(rows) if rows else pd.DataFrame()


def _build_choropleth_estimado(df_est: pd.DataFrame) -> go.Figure | None:
    """Choropleth de estimación de escaños: ganador por provincia."""
    geojson  = _load_geojson()
    mapping  = _load_province_mapping()
    if geojson is None or not mapping or df_est.empty:
        return None
    id_to_geo = {v: k for k, v in mapping.items()}

    winner_rows = []
    for prov_id in df_est["provincia_id"].unique():
        prov_data = df_est[df_est["provincia_id"] == prov_id]
        if prov_data.empty:
            continue
        winner = prov_data.loc[prov_data["escanos_est"].idxmax()]
        geo_name = id_to_geo.get(int(prov_id))
        if geo_name:
            winner_rows.append({
                "geo_name":        geo_name,
                "provincia":       winner["provincia"],
                "partido_ganador": winner["siglas"],
                "escanos_est":     int(winner["escanos_est"]),
                "delta":           int(winner["delta"]),
                "pct_est":         round(float(winner["pct_est"]), 1),
            })
    if not winner_rows:
        return None

    df_win = pd.DataFrame(winner_rows)
    partidos_unicos = df_win["partido_ganador"].unique().tolist()
    fig = go.Figure()
    for partido in partidos_unicos:
        dp = df_win[df_win["partido_ganador"] == partido]
        color = _color(partido)
        delta_txt = dp["delta"].apply(lambda d: f"{'▲' if d>0 else '▼' if d<0 else '—'}{abs(d)}")
        fig.add_trace(go.Choroplethmapbox(
            geojson=geojson,
            locations=dp["geo_name"],
            featureidkey="properties.name",
            z=[1] * len(dp),
            colorscale=[[0, color], [1, color]],
            showscale=False, name=partido,
            marker=dict(opacity=0.82, line=dict(width=1, color=BG)),
            text=dp.apply(
                lambda r: (
                    f"<b>{r['provincia']}</b><br>"
                    f"Ganador estimado: <b>{r['partido_ganador']}</b><br>"
                    f"Escaños est.: {r['escanos_est']} "
                    f"(vs ref.: {'+' if r['delta']>0 else ''}{r['delta']})<br>"
                    f"Voto nacional: {r['pct_est']:.1f}%"
                ), axis=1,
            ),
            hovertemplate="%{text}<extra></extra>",
        ))
    fig.update_layout(
        mapbox=dict(style="carto-darkmatter", center={"lat": 40.0, "lon": -3.7}, zoom=4.5),
        height=520,
        paper_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=5, b=5, l=5, r=5),
        legend=dict(
            bgcolor="rgba(13,19,32,0.87)", bordercolor=BORDER, borderwidth=1,
            font=dict(color=TEXT2, size=11), orientation="h", y=-0.02,
        ),
    )
    return fig


# ── Tabs ─────────────────────────────────────────────────────────────────────
tab_pasadas, tab_futuras, tab_mapa, tab_hist = st.tabs([
    "▣  Elecciones Pasadas",
    "▷  Estimaciones Futuras",
    "◎  Mapa Provincial",
    "≡  Comparativa Histórica",
])


# ═════════════════════════════════════════════════════════════════════════════
# TAB 1 — ELECCIONES PASADAS
# ═════════════════════════════════════════════════════════════════════════════
with tab_pasadas:
    if eleccion_id is None:
        st.info("Selecciona una eleccion en la barra lateral.")
    else:
        df_nac = cargar_resultados_nacionales(eleccion_id)
        if df_nac.empty:
            st.info("No hay resultados para esta eleccion. Carga datos con el ETL.")
        else:
            # ── Tarjetas nacionales ──────────────────────────────────────────
            _section_header("Resultados Nacionales", CYAN)
            n_cards = min(len(df_nac), 8)
            cols = st.columns(min(n_cards, 4))
            for i, (_, row) in enumerate(df_nac.head(n_cards).iterrows()):
                escanos = int(row["escanos_totales"]) if pd.notna(row.get("escanos_totales")) else 0
                pct = f"{row['pct_medio']:.1f}%" if pd.notna(row.get("pct_medio")) else "---"
                color = _color(row["siglas"])
                r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
                with cols[i % 4]:
                    st.markdown(f"""
                    <div class="glass" style="text-align:center;margin-bottom:.5rem;
                                border-top:3px solid {color}">
                        <div style="font-size:.65rem;font-weight:700;color:{MUTED};
                                    letter-spacing:.08em;margin-bottom:.25rem">{row['siglas']}</div>
                        <div style="font-size:1.8rem;font-weight:900;color:{color};
                                    font-family:'JetBrains Mono',monospace;
                                    text-shadow:0 0 20px rgba({r_c},{g_c},{b_c},0.3)">{escanos}</div>
                        <div style="font-size:.7rem;color:{TEXT2};margin-top:.15rem">escanos &middot; {pct}</div>
                    </div>
                    """, unsafe_allow_html=True)

            st.markdown(f"<div style='height:.8rem'></div>", unsafe_allow_html=True)

            # ── Graficos: barras + hemiciclo ─────────────────────────────────
            col_bar, col_hem = st.columns(2, gap="large")

            with col_bar:
                _section_header("% Voto por Partido", BLUE)
                colores_bar = [_color(s) for s in df_nac["siglas"]]
                fig_bar = go.Figure(go.Bar(
                    x=df_nac["siglas"],
                    y=df_nac["pct_medio"].round(2),
                    marker=dict(
                        color=[f"rgba({int(c[1:3],16)},{int(c[3:5],16)},{int(c[5:7],16)},0.75)"
                               for c in colores_bar],
                        line=dict(color=colores_bar, width=1.5),
                    ),
                    text=df_nac["pct_medio"].round(1).astype(str) + "%",
                    textposition="outside",
                    textfont=dict(color=TEXT, size=10, family="JetBrains Mono, monospace"),
                ))
                fig_bar.update_layout(
                    height=380,
                    plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                    xaxis=dict(showgrid=False, tickfont=dict(size=10)),
                    yaxis=dict(gridcolor="rgba(30,41,59,0.53)",
                               tickfont=dict(size=9, color=MUTED), ticksuffix="%"),
                    margin=dict(t=20, b=20, l=10, r=10), showlegend=False,
                )
                st.plotly_chart(fig_bar, use_container_width=True, config={"displayModeBar": False})

            with col_hem:
                df_esc = df_nac[df_nac["escanos_totales"].notna() & (df_nac["escanos_totales"] > 0)].copy()
                if not df_esc.empty:
                    _section_header("Hemiciclo — Escanos", PURPLE)
                    partidos_hem = [
                        (row["siglas"], int(row["escanos_totales"]), _color(row["siglas"]))
                        for _, row in df_esc.iterrows()
                    ]
                    partidos_hem.sort(key=lambda x: ORDEN_IDEOLOGICO.index(x[0])
                                     if x[0] in ORDEN_IDEOLOGICO else 99)
                    st.plotly_chart(hemiciclo_chart(partidos_hem), use_container_width=True,
                                   config={"displayModeBar": False})

                    # Bloques
                    izq = ["PSOE", "SUMAR", "EH_BILDU", "EH Bildu", "ERC", "BNG", "CUP", "PODEMOS", "UP"]
                    der = ["PP", "VOX", "CS", "UPN"]
                    e_izq = int(df_esc[df_esc["siglas"].isin(izq)]["escanos_totales"].sum())
                    e_der = int(df_esc[df_esc["siglas"].isin(der)]["escanos_totales"].sum())
                    c1, c2 = st.columns(2)
                    with c1:
                        st.markdown(f"""
                        <div class="glass" style="text-align:center;border-top:2px solid {RED}55">
                            <div style="font-size:.58rem;font-weight:700;color:{MUTED};
                                        letter-spacing:.1em;text-transform:uppercase">Bloque Izquierda</div>
                            <div style="font-size:1.5rem;font-weight:900;color:{TEXT};
                                        font-family:'JetBrains Mono',monospace">{e_izq}</div>
                            <div style="font-size:.58rem;color:{'#10B981' if e_izq>=176 else AMBER}">
                                {'Mayoria' if e_izq>=176 else f'{176-e_izq} para mayoria'}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    with c2:
                        st.markdown(f"""
                        <div class="glass" style="text-align:center;border-top:2px solid {BLUE}55">
                            <div style="font-size:.58rem;font-weight:700;color:{MUTED};
                                        letter-spacing:.1em;text-transform:uppercase">Bloque Derecha</div>
                            <div style="font-size:1.5rem;font-weight:900;color:{TEXT};
                                        font-family:'JetBrains Mono',monospace">{e_der}</div>
                            <div style="font-size:.58rem;color:{'#10B981' if e_der>=176 else AMBER}">
                                {'Mayoria' if e_der>=176 else f'{176-e_der} para mayoria'}</div>
                        </div>
                        """, unsafe_allow_html=True)

            # ── Posicionamiento ideologico ────────────────────────────────────
            if "eje_izda_dcha" in df_nac.columns:
                df_ideo = df_nac.dropna(subset=["eje_izda_dcha", "pct_medio"])
                if not df_ideo.empty:
                    st.markdown(f"<div style='height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.2rem 0'></div>", unsafe_allow_html=True)
                    _section_header("Posicionamiento Ideologico vs Resultado", CYAN)
                    fig_sc = go.Figure()
                    for _, rr in df_ideo.iterrows():
                        c = _color(rr["siglas"])
                        cr2, cg2, cb2 = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
                        sz = max(12, int(rr.get("escanos_totales", 10) or 10) / 3)
                        fig_sc.add_trace(go.Scatter(
                            x=[rr["eje_izda_dcha"]], y=[rr["pct_medio"]],
                            mode="markers+text", text=[rr["siglas"]],
                            textposition="top center",
                            textfont=dict(color=c, size=10, family="Inter"),
                            marker=dict(color=f"rgba({cr2},{cg2},{cb2},0.33)", size=sz, line=dict(color=c, width=1.5)),
                            name=rr["siglas"], showlegend=False,
                            hovertemplate=f"{rr['siglas']}: {rr['pct_medio']:.1f}%<extra></extra>",
                        ))
                    fig_sc.update_layout(
                        height=350, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                        xaxis=dict(title="Izquierda  ←  →  Derecha", gridcolor="rgba(30,41,59,0.40)",
                                   tickfont=dict(color=MUTED, size=9)),
                        yaxis=dict(title="% Voto", gridcolor="rgba(30,41,59,0.40)",
                                   tickfont=dict(color=MUTED, size=9), ticksuffix="%"),
                        margin=dict(t=15, b=40, l=50, r=10),
                    )
                    st.plotly_chart(fig_sc, use_container_width=True, config={"displayModeBar": False})


# ═════════════════════════════════════════════════════════════════════════════
# TAB 2 — ESTIMACIONES FUTURAS
# ═════════════════════════════════════════════════════════════════════════════
with tab_futuras:
    _section_header("Proyeccion Electoral — Nowcasting", CYAN)

    df_nc = cargar_nowcasting()
    if df_nc.empty:
        st.info("Sin datos de nowcasting. Ejecuta el pipeline de modelos.")
    else:
        df_nc_sorted = df_nc.sort_values("estimacion_pct", ascending=False)

        # Tarjetas de estimacion
        n_show = min(len(df_nc_sorted), 8)
        cols_nc = st.columns(min(n_show, 4))
        for i, (_, row) in enumerate(df_nc_sorted.head(n_show).iterrows()):
            color = _color(row["partido_siglas"])
            ic_str = f"[{row['ic_95_inf']:.1f} - {row['ic_95_sup']:.1f}]"
            with cols_nc[i % 4]:
                st.markdown(f"""
                <div class="glass" style="text-align:center;margin-bottom:.5rem;
                            border-top:3px solid {color}">
                    <div style="font-size:.62rem;font-weight:700;color:{MUTED};
                                letter-spacing:.08em">{row['partido_siglas']}</div>
                    <div style="font-size:1.6rem;font-weight:900;color:{color};
                                font-family:'JetBrains Mono',monospace">{row['estimacion_pct']:.1f}%</div>
                    <div style="font-size:.55rem;color:{MUTED};margin-top:.2rem;
                                font-family:'JetBrains Mono',monospace">IC 95% {ic_str}</div>
                </div>
                """, unsafe_allow_html=True)

        st.markdown(f"<div style='height:.8rem'></div>", unsafe_allow_html=True)

        col_b, col_h = st.columns(2, gap="large")

        with col_b:
            _section_header("% Voto Estimado con IC 95%", BLUE)
            fig_nc = go.Figure()
            for _, row in df_nc_sorted.iterrows():
                color = _color(row["partido_siglas"])
                r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
                fig_nc.add_trace(go.Bar(
                    name=row["partido_siglas"],
                    x=[row["partido_siglas"]], y=[row["estimacion_pct"]],
                    error_y=dict(
                        type="data", symmetric=False,
                        array=[max(0, row["ic_95_sup"] - row["estimacion_pct"])],
                        arrayminus=[max(0, row["estimacion_pct"] - row["ic_95_inf"])],
                        color=f"rgba({r_c},{g_c},{b_c},0.5)", thickness=1.5, width=4,
                    ),
                    text=[f"{row['estimacion_pct']:.1f}%"],
                    textposition="outside",
                    textfont=dict(color=TEXT, size=10, family="JetBrains Mono"),
                    marker=dict(color=f"rgba({r_c},{g_c},{b_c},0.75)",
                                line=dict(color=color, width=1.5)),
                ))
            fig_nc.update_layout(
                barmode="group", height=400,
                plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                showlegend=False,
                xaxis=dict(showgrid=False, tickfont=dict(size=10)),
                yaxis=dict(gridcolor="rgba(30,41,59,0.53)",
                           tickfont=dict(size=9, color=MUTED), ticksuffix="%"),
                margin=dict(t=20, b=20, l=10, r=10),
            )
            st.plotly_chart(fig_nc, use_container_width=True, config={"displayModeBar": False})

        with col_h:
            _section_header("Hemiciclo Proyectado (350 esc.)", PURPLE)
            total_escanos = 350
            df_hem2 = df_nc_sorted[df_nc_sorted["estimacion_pct"] >= 2.0].copy()
            pct_sum = df_hem2["estimacion_pct"].sum()
            if pct_sum > 0:
                df_hem2["escanos_est"] = (
                    df_hem2["estimacion_pct"] / pct_sum * total_escanos
                ).round(0).astype(int)
                partidos_hem2 = [
                    (row["partido_siglas"], int(row["escanos_est"]), _color(row["partido_siglas"]))
                    for _, row in df_hem2.iterrows()
                ]
                partidos_hem2.sort(key=lambda x: ORDEN_IDEOLOGICO.index(x[0])
                                   if x[0] in ORDEN_IDEOLOGICO else 99)
                st.plotly_chart(hemiciclo_chart(partidos_hem2), use_container_width=True,
                               config={"displayModeBar": False})

                izq_p = ["PSOE", "SUMAR", "EH_BILDU", "EH Bildu", "ERC", "BNG", "CUP"]
                der_p = ["PP", "VOX", "CS"]
                esc_izq = int(df_hem2[df_hem2["partido_siglas"].isin(izq_p)]["escanos_est"].sum())
                esc_der = int(df_hem2[df_hem2["partido_siglas"].isin(der_p)]["escanos_est"].sum())
                c1, c2 = st.columns(2)
                with c1:
                    st.metric("Bloque Izquierda", esc_izq,
                              delta="mayoria" if esc_izq >= 176 else f"{176-esc_izq} para mayoria",
                              delta_color="normal" if esc_izq >= 176 else "inverse")
                with c2:
                    st.metric("Bloque Derecha", esc_der,
                              delta="mayoria" if esc_der >= 176 else f"{176-esc_der} para mayoria",
                              delta_color="normal" if esc_der >= 176 else "inverse")

        # Tabla detallada
        st.markdown(f"<div style='height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1rem 0'></div>", unsafe_allow_html=True)
        _section_header("Detalle de Estimaciones", CYAN)
        cols_show = [c for c in ["partido_siglas", "estimacion_pct", "ic_95_inf", "ic_95_sup", "n_encuestas"]
                     if c in df_nc.columns]
        st.dataframe(
            df_nc_sorted[cols_show].rename(columns={
                "partido_siglas": "Partido",
                "estimacion_pct": "Estimacion (%)",
                "ic_95_inf": "IC 95% Inf",
                "ic_95_sup": "IC 95% Sup",
                "n_encuestas": "N Encuestas",
            }).round(2),
            hide_index=True, use_container_width=True,
        )


# ═════════════════════════════════════════════════════════════════════════════
# TAB 3 — MAPA PROVINCIAL
# ═════════════════════════════════════════════════════════════════════════════
with tab_mapa:
    _section_header("Distribución Territorial por Provincias", PURPLE)

    if eleccion_id is None:
        st.markdown(f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {CYAN};border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">Selecciona una elección en la barra lateral.</div>', unsafe_allow_html=True)
    else:
        df_prov    = cargar_resultados_provinciales(eleccion_id)
        df_nc_mapa = cargar_nowcasting()

        if df_prov.empty:
            st.markdown(f'<div style="background:{BG2};border:1px solid {AMBER}44;border-left:3px solid {AMBER};border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">Sin datos provinciales para esta elección.</div>', unsafe_allow_html=True)
        else:
            # ── Selector de vista + modo estimado ────────────────────────────
            col_ctrl1, col_ctrl2, col_ctrl3 = st.columns([1, 1, 2])
            with col_ctrl1:
                modo_mapa = st.radio(
                    "Modo del mapa",
                    ["Histórico", "Estimación actual"],
                    horizontal=True, key="modo_mapa",
                )
            vista = "Partido ganador"
            partido_mapa = None
            if modo_mapa == "Histórico":
                with col_ctrl2:
                    vista = st.radio(
                        "Vista histórica",
                        ["Partido ganador", "Por partido"],
                        horizontal=True, key="vista_mapa",
                    )
                if vista == "Por partido":
                    with col_ctrl3:
                        partidos_disp = sorted(df_prov["siglas"].unique().tolist())
                        partido_mapa = st.selectbox("Partido", partidos_disp, key="partido_mapa")

            # ── Choropleth principal ──────────────────────────────────────────
            if modo_mapa == "Estimación actual":
                df_est = _estimate_seats_dhondt(df_prov, df_nc_mapa)
                fig_map = _build_choropleth_estimado(df_est)
                if fig_map:
                    st.markdown(
                        f'<div style="background:{BG2};border:1px solid {CYAN}33;border-left:3px solid {CYAN};border-radius:8px;padding:.6rem 1rem;font-size:.8rem;color:{TEXT2};margin-bottom:.5rem">'
                        f'<strong style="color:{CYAN}">Estimación D\'Hondt</strong> · Distribuye las estimaciones nacionales de nowcasting '
                        f'aplicando D\'Hondt provincia a provincia usando los escaños históricos de referencia como base.'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
                    st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar": False})
                else:
                    st.markdown(f'<div style="background:{BG2};border:1px solid {AMBER}44;border-left:3px solid {AMBER};border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">Sin GeoJSON o nowcasting para generar la estimación.</div>', unsafe_allow_html=True)
            else:
                fig_map = _build_choropleth(df_prov, partido_filter=partido_mapa)
                if fig_map:
                    st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar": False})
                else:
                    st.markdown(f'<div style="background:{BG2};border:1px solid {AMBER}44;border-left:3px solid {AMBER};border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">No se pudo generar el mapa. Verifica que el GeoJSON existe en dashboard/data/</div>', unsafe_allow_html=True)

            st.markdown(f'<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.2rem 0"></div>', unsafe_allow_html=True)

            # ── Ranking + CCAA ────────────────────────────────────────────────
            col_rank, col_detail = st.columns([1, 1], gap="large")

            with col_rank:
                _section_header("Escaños por Provincia", CYAN)
                partidos_avail = sorted(df_prov["siglas"].unique().tolist())
                if modo_mapa == "Estimación actual" and not df_est.empty:
                    partido_rank = st.selectbox("Partido para ranking", partidos_avail, key="partido_rank")
                    df_rank = df_est[df_est["siglas"] == partido_rank][["provincia", "escanos_est"]].rename(columns={"escanos_est": "escanos"})
                    df_rank = df_rank[df_rank["escanos"] > 0].sort_values("escanos", ascending=True)
                else:
                    partido_rank = partido_mapa or partidos_avail[0]
                    if partido_mapa is None:
                        partido_rank = st.selectbox("Partido para ranking", partidos_avail, key="partido_rank")
                    df_rank = df_prov[df_prov["siglas"] == partido_rank][["provincia", "escanos"]].copy()
                    df_rank = df_rank[df_rank["escanos"] > 0].sort_values("escanos", ascending=True)

                if not df_rank.empty:
                    color_r = _color(partido_rank)
                    rr, gg, bb = int(color_r[1:3], 16), int(color_r[3:5], 16), int(color_r[5:7], 16)
                    fig_rank = go.Figure(go.Bar(
                        y=df_rank["provincia"],
                        x=df_rank["escanos"],
                        orientation="h",
                        marker=dict(
                            color=f"rgba({rr},{gg},{bb},0.7)",
                            line=dict(color=color_r, width=1),
                        ),
                        text=df_rank["escanos"].astype(int),
                        textposition="outside",
                        textfont=dict(color=TEXT, size=9, family="JetBrains Mono"),
                    ))
                    fig_rank.update_layout(
                        height=max(380, len(df_rank) * 24),
                        plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                        xaxis=dict(title="Escaños", gridcolor="rgba(30,41,59,0.40)", tickfont=dict(color=MUTED, size=9)),
                        yaxis=dict(tickfont=dict(color=TEXT2, size=9)),
                        margin=dict(t=10, b=30, l=120, r=40), showlegend=False,
                        font=dict(color=TEXT2),
                    )
                    st.plotly_chart(fig_rank, use_container_width=True, config={"displayModeBar": False})
                else:
                    st.markdown(f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:.8rem 1rem;color:{TEXT2};font-size:.85rem">{partido_rank} no obtuvo escaños en ninguna provincia.</div>', unsafe_allow_html=True)

            with col_detail:
                _section_header("Detalle por Comunidad Autónoma", BLUE)
                ccaa_list = sorted(df_prov["ccaa"].dropna().unique().tolist())
                if ccaa_list:
                    ccaa_sel = st.selectbox("Comunidad Autónoma", ccaa_list, key="ccaa_detail")
                    df_ccaa = df_prov[df_prov["ccaa"] == ccaa_sel]
                    df_ccaa_agg = (
                        df_ccaa.groupby("siglas")
                        .agg(escanos_sum=("escanos", "sum"), pct_media=("porcentaje", "mean"))
                        .reset_index()
                        .sort_values("escanos_sum", ascending=False)
                    )
                    if not df_ccaa_agg.empty:
                        colors_ccaa = [_color(s) for s in df_ccaa_agg["siglas"]]
                        fig_ccaa = go.Figure(go.Bar(
                            x=df_ccaa_agg["siglas"],
                            y=df_ccaa_agg["escanos_sum"],
                            marker=dict(
                                color=[f"rgba({int(c[1:3],16)},{int(c[3:5],16)},{int(c[5:7],16)},0.75)" for c in colors_ccaa],
                                line=dict(color=colors_ccaa, width=1.5),
                            ),
                            text=df_ccaa_agg["escanos_sum"].astype(int),
                            textposition="outside",
                            textfont=dict(color=TEXT, size=10, family="JetBrains Mono"),
                        ))
                        fig_ccaa.update_layout(
                            title=dict(text=f"Escaños en {ccaa_sel}", font=dict(color=TEXT2, size=12)),
                            height=350,
                            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                            xaxis=dict(showgrid=False, tickfont=dict(size=10, color=TEXT2)),
                            yaxis=dict(gridcolor="rgba(30,41,59,0.40)", tickfont=dict(size=9, color=MUTED)),
                            margin=dict(t=35, b=20, l=10, r=10), showlegend=False,
                            font=dict(color=TEXT2),
                        )
                        st.plotly_chart(fig_ccaa, use_container_width=True, config={"displayModeBar": False})

                    provinces_in_ccaa = sorted(df_ccaa["provincia"].unique().tolist())
                    if len(provinces_in_ccaa) > 1:
                        for prov in provinces_in_ccaa:
                            df_p = df_ccaa[df_ccaa["provincia"] == prov].sort_values("escanos", ascending=False)
                            pills = "".join(
                                f'<span class="partido-pill" style="background:{_color(rr["siglas"])}15;border:1px solid {_color(rr["siglas"])}44;color:{_color(rr["siglas"])}">{rr["siglas"]} {int(rr["escanos"])}</span> '
                                for _, rr in df_p.head(4).iterrows()
                            )
                            st.markdown(
                                f'<div class="glass" style="padding:.5rem .8rem;margin-bottom:.3rem;display:flex;justify-content:space-between;align-items:center">'
                                f'<span style="font-size:.75rem;font-weight:600;color:{TEXT}">{prov}</span>'
                                f'<div>{pills}</div></div>',
                                unsafe_allow_html=True,
                            )

            # ═══════════════════════════════════════════════════════════════
            # BANNER: CAMBIOS EN ESTIMACIONES POR PROVINCIA
            # ═══════════════════════════════════════════════════════════════
            st.markdown(f'<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.5rem 0"></div>', unsafe_allow_html=True)
            _section_header("Cambios en Estimación vs Referencia Histórica", AMBER)

            df_est_banner = _estimate_seats_dhondt(df_prov, df_nc_mapa)

            if df_est_banner.empty:
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {AMBER};border-radius:8px;padding:.9rem 1.2rem;color:{TEXT2};font-size:.85rem">'
                    f'El banner de cambios se activará cuando haya datos de nowcasting en la BD.'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            else:
                # ── Summary KPIs ──────────────────────────────────────────────
                n_ganadas = len(df_est_banner[df_est_banner["delta"] > 0]["provincia"].unique())
                n_perdidas = len(df_est_banner[df_est_banner["delta"] < 0]["provincia"].unique())
                mayor_gain = df_est_banner.loc[df_est_banner["delta"].idxmax()] if not df_est_banner.empty else None
                mayor_loss = df_est_banner.loc[df_est_banner["delta"].idxmin()] if not df_est_banner.empty else None

                k1, k2, k3, k4 = st.columns(4)
                for col_k, lbl, val, sub, accent in [
                    (k1, "Provincias con ganancia", str(n_ganadas), "vs referencia histórica", GREEN),
                    (k2, "Provincias con pérdida",  str(n_perdidas), "vs referencia histórica", RED),
                    (k3, "Mayor ganancia",
                     f"+{mayor_gain['delta']} {mayor_gain['siglas']}" if mayor_gain is not None else "—",
                     str(mayor_gain["provincia"]) if mayor_gain is not None else "", GREEN),
                    (k4, "Mayor pérdida",
                     f"{mayor_loss['delta']} {mayor_loss['siglas']}" if mayor_loss is not None else "—",
                     str(mayor_loss["provincia"]) if mayor_loss is not None else "", RED),
                ]:
                    with col_k:
                        st.markdown(
                            f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {accent}55;border-radius:10px;padding:.9rem 1.1rem;text-align:center">'
                            f'<div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.1em;text-transform:uppercase;margin-bottom:.3rem">{lbl}</div>'
                            f'<div style="font-size:1.4rem;font-weight:800;color:{accent};font-family:\'JetBrains Mono\',monospace">{val}</div>'
                            f'<div style="font-size:.65rem;color:{MUTED};margin-top:.2rem">{sub}</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )

                st.markdown("<div style='height:.8rem'></div>", unsafe_allow_html=True)

                # ── Scrollable province cards ─────────────────────────────────
                _section_header("Escaños Estimados vs Referencia — Por Provincia", CYAN)

                provs_sorted = (
                    df_est_banner.groupby("provincia")["delta"]
                    .apply(lambda s: s.abs().sum())
                    .sort_values(ascending=False)
                    .index.tolist()
                )

                # Build the horizontal scrolling HTML banner
                cards_html = ""
                for prov_name in provs_sorted:
                    df_p = df_est_banner[df_est_banner["provincia"] == prov_name].sort_values("escanos_est", ascending=False)
                    if df_p.empty:
                        continue
                    winner_color = _color(df_p.iloc[0]["siglas"])
                    wc_r, wc_g, wc_b = int(winner_color[1:3], 16), int(winner_color[3:5], 16), int(winner_color[5:7], 16)
                    total_prov = int(df_p["escanos_est"].sum())

                    pills_html = ""
                    for _, rp in df_p[df_p["escanos_est"] > 0].head(5).iterrows():
                        pc = _color(rp["siglas"])
                        d  = int(rp["delta"])
                        d_color = GREEN if d > 0 else RED if d < 0 else MUTED
                        arrow = "▲" if d > 0 else "▼" if d < 0 else "—"
                        d_str  = f"{arrow}{abs(d)}" if d != 0 else "="
                        pr2, pg2, pb2 = int(pc[1:3], 16), int(pc[3:5], 16), int(pc[5:7], 16)
                        pills_html += (
                            f'<div style="display:flex;align-items:center;justify-content:space-between;'
                            f'margin:.18rem 0;padding:.18rem .4rem;'
                            f'background:rgba({pr2},{pg2},{pb2},0.1);border-radius:5px">'
                            f'<span style="font-size:.62rem;font-weight:700;color:{pc}">{rp["siglas"]}</span>'
                            f'<span style="font-size:.62rem;font-weight:800;color:{TEXT2};font-family:\'JetBrains Mono\',monospace">{int(rp["escanos_est"])}</span>'
                            f'<span style="font-size:.58rem;font-weight:700;color:{d_color}">{d_str}</span>'
                            f'</div>'
                        )

                    cards_html += (
                        f'<div style="min-width:148px;max-width:148px;'
                        f'background:linear-gradient(180deg,rgba({wc_r},{wc_g},{wc_b},0.08),{BG2});'
                        f'border:1px solid {BORDER};border-top:3px solid {winner_color};'
                        f'border-radius:0 0 10px 10px;padding:.65rem .7rem;flex-shrink:0">'
                        f'<div style="font-size:.72rem;font-weight:700;color:{TEXT};margin-bottom:.1rem;'
                        f'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{prov_name}</div>'
                        f'<div style="font-size:.55rem;color:{MUTED};margin-bottom:.4rem">{total_prov} escaños</div>'
                        f'{pills_html}'
                        f'</div>'
                    )

                st.markdown(
                    f'<div style="overflow-x:auto;display:flex;gap:.45rem;padding:.4rem 0 .8rem;'
                    f'scrollbar-width:thin;scrollbar-color:{BORDER} transparent">'
                    f'{cards_html}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

                # ── Heatmap de deltas ─────────────────────────────────────────
                _section_header("Mapa de Calor: Delta Escaños (est. − ref.)", PURPLE)
                df_heat = df_est_banner[df_est_banner["delta"] != 0].copy()
                if not df_heat.empty:
                    top_parties = (
                        df_heat.groupby("siglas")["escanos_est"].sum()
                        .sort_values(ascending=False).head(8).index.tolist()
                    )
                    df_heat_filt = df_heat[df_heat["siglas"].isin(top_parties)]
                    df_pivot = df_heat_filt.pivot_table(
                        index="siglas", columns="provincia", values="delta", fill_value=0
                    )
                    fig_hm = go.Figure(go.Heatmap(
                        z=df_pivot.values,
                        x=df_pivot.columns.tolist(),
                        y=df_pivot.index.tolist(),
                        colorscale=[
                            [0.0, "#7F1D1D"],
                            [0.4, "#991B1B"],
                            [0.5, BG3],
                            [0.6, "#14532D"],
                            [1.0, "#166534"],
                        ],
                        zmid=0,
                        colorbar=dict(
                            title="Δ esc.",
                            tickfont=dict(size=10, color=MUTED),
                            titlefont=dict(size=11, color=MUTED),
                        ),
                        hoverongaps=False,
                        hovertemplate="<b>%{y}</b> en %{x}<br>Delta: %{z:+d} escaños<extra></extra>",
                    ))
                    fig_hm.update_layout(
                        height=320,
                        paper_bgcolor="rgba(0,0,0,0)",
                        plot_bgcolor="rgba(0,0,0,0)",
                        margin=dict(t=10, b=10, l=70, r=10),
                        xaxis=dict(tickfont=dict(size=9, color=MUTED), tickangle=-45),
                        yaxis=dict(tickfont=dict(size=11, color=TEXT2)),
                        font=dict(color=TEXT2),
                    )
                    st.plotly_chart(fig_hm, use_container_width=True, config={"displayModeBar": False})

    # ═══════════════════════════════════════════════════════════════════════════
    # SECCIÓN: ATLAS ELECTORAL — MAPA HISTÓRICO POR ELECCIÓN GENERAL
    # ═══════════════════════════════════════════════════════════════════════════
    st.markdown(
        f'<div style="height:2px;background:linear-gradient(90deg,transparent,{PURPLE}55,{CYAN}55,transparent);'
        f'margin:2.5rem 0 1.5rem"></div>',
        unsafe_allow_html=True,
    )
    _section_header("Atlas Electoral — Mapa Histórico por Elección General", CYAN)

    df_gen_all = cargar_elecciones("generales")

    if df_gen_all.empty:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {AMBER};'
            f'border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">'
            f'No hay elecciones generales registradas en la base de datos.</div>',
            unsafe_allow_html=True,
        )
    else:
        df_gen_sorted = df_gen_all.sort_values("fecha", ascending=False)
        opciones_atlas = {
            row.get("descripcion") or str(row["fecha"])[:10]: row["id"]
            for _, row in df_gen_sorted.iterrows()
        }

        col_atlas_sel, col_atlas_vista, col_atlas_partido = st.columns([2, 1, 1])
        with col_atlas_sel:
            atlas_label = st.selectbox(
                "Elección General",
                list(opciones_atlas.keys()),
                key="atlas_elec_selector",
            )
        atlas_elec_id = opciones_atlas[atlas_label]

        with col_atlas_vista:
            atlas_vista = st.radio(
                "Vista",
                ["Partido ganador", "Por partido"],
                horizontal=True,
                key="atlas_vista",
            )

        df_prov_atlas = cargar_resultados_provinciales(atlas_elec_id)
        df_nac_atlas  = cargar_resultados_nacionales(atlas_elec_id)

        if df_prov_atlas.empty:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {AMBER}44;border-left:3px solid {AMBER};'
                f'border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">'
                f'Sin datos provinciales para esta elección. Carga los datos con el ETL.</div>',
                unsafe_allow_html=True,
            )
        else:
            atlas_partido = None
            if atlas_vista == "Por partido":
                partidos_atlas_disp = sorted(df_prov_atlas["siglas"].unique().tolist())
                with col_atlas_partido:
                    atlas_partido = st.selectbox("Partido", partidos_atlas_disp, key="atlas_partido_sel")

            # ── Tarjetas de resultado nacional ────────────────────────────────
            if not df_nac_atlas.empty:
                n_cards_a = min(len(df_nac_atlas), 7)
                cols_a = st.columns(min(n_cards_a, 7))
                for i, (_, row) in enumerate(df_nac_atlas.head(n_cards_a).iterrows()):
                    esc_a = int(row["escanos_totales"]) if pd.notna(row.get("escanos_totales")) else 0
                    pct_a = f"{row['pct_medio']:.1f}%" if pd.notna(row.get("pct_medio")) else "—"
                    color_a = _color(row["siglas"])
                    ra, ga, ba = int(color_a[1:3], 16), int(color_a[3:5], 16), int(color_a[5:7], 16)
                    with cols_a[i]:
                        st.markdown(
                            f'<div class="glass" style="text-align:center;margin-bottom:.5rem;'
                            f'border-top:3px solid {color_a}">'
                            f'<div style="font-size:.58rem;font-weight:700;color:{MUTED};letter-spacing:.08em">'
                            f'{row["siglas"]}</div>'
                            f'<div style="font-size:1.5rem;font-weight:900;color:{color_a};'
                            f'font-family:\'JetBrains Mono\',monospace;'
                            f'text-shadow:0 0 16px rgba({ra},{ga},{ba},0.3)">{esc_a}</div>'
                            f'<div style="font-size:.65rem;color:{TEXT2};margin-top:.1rem">'
                            f'esc &middot; {pct_a}</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
                st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)

            # ── Mapa + Hemiciclo ───────────────────────────────────────────────
            col_amap, col_ahem = st.columns([3, 2], gap="large")

            with col_amap:
                _section_header("Resultados Provinciales", PURPLE)
                fig_atlas = _build_choropleth(df_prov_atlas, partido_filter=atlas_partido)
                if fig_atlas:
                    st.plotly_chart(fig_atlas, use_container_width=True, config={"displayModeBar": False})
                else:
                    st.markdown(
                        f'<div style="background:{BG2};border:1px solid {AMBER}44;border-left:3px solid {AMBER};'
                        f'border-radius:8px;padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">'
                        f'No se pudo generar el mapa. Verifica que el GeoJSON existe en dashboard/data/</div>',
                        unsafe_allow_html=True,
                    )

            with col_ahem:
                if not df_nac_atlas.empty:
                    _section_header("Hemiciclo", BLUE)
                    df_esc_atlas = df_nac_atlas[
                        df_nac_atlas["escanos_totales"].notna() & (df_nac_atlas["escanos_totales"] > 0)
                    ].copy()
                    if not df_esc_atlas.empty:
                        partidos_hem_a = [
                            (r["siglas"], int(r["escanos_totales"]), _color(r["siglas"]))
                            for _, r in df_esc_atlas.iterrows()
                        ]
                        partidos_hem_a.sort(
                            key=lambda x: ORDEN_IDEOLOGICO.index(x[0]) if x[0] in ORDEN_IDEOLOGICO else 99
                        )
                        st.plotly_chart(
                            hemiciclo_chart(partidos_hem_a),
                            use_container_width=True,
                            config={"displayModeBar": False},
                        )

                        izq_a = ["PSOE", "SUMAR", "EH_BILDU", "EH Bildu", "ERC", "BNG", "CUP", "PODEMOS", "UP", "IU"]
                        der_a = ["PP", "VOX", "CS", "UPN"]
                        e_izq_a = int(df_esc_atlas[df_esc_atlas["siglas"].isin(izq_a)]["escanos_totales"].sum())
                        e_der_a = int(df_esc_atlas[df_esc_atlas["siglas"].isin(der_a)]["escanos_totales"].sum())
                        ca1, ca2 = st.columns(2)
                        with ca1:
                            st.markdown(
                                f'<div class="glass" style="text-align:center;border-top:2px solid {RED}55">'
                                f'<div style="font-size:.55rem;font-weight:700;color:{MUTED};'
                                f'letter-spacing:.1em;text-transform:uppercase">Bloque Izq.</div>'
                                f'<div style="font-size:1.4rem;font-weight:900;color:{TEXT};'
                                f'font-family:\'JetBrains Mono\',monospace">{e_izq_a}</div>'
                                f'<div style="font-size:.55rem;color:{"#10B981" if e_izq_a>=176 else AMBER}">'
                                f'{"✓ Mayoría" if e_izq_a>=176 else f"{176-e_izq_a} para mayoría"}'
                                f'</div></div>',
                                unsafe_allow_html=True,
                            )
                        with ca2:
                            st.markdown(
                                f'<div class="glass" style="text-align:center;border-top:2px solid {BLUE}55">'
                                f'<div style="font-size:.55rem;font-weight:700;color:{MUTED};'
                                f'letter-spacing:.1em;text-transform:uppercase">Bloque Der.</div>'
                                f'<div style="font-size:1.4rem;font-weight:900;color:{TEXT};'
                                f'font-family:\'JetBrains Mono\',monospace">{e_der_a}</div>'
                                f'<div style="font-size:.55rem;color:{"#10B981" if e_der_a>=176 else AMBER}">'
                                f'{"✓ Mayoría" if e_der_a>=176 else f"{176-e_der_a} para mayoría"}'
                                f'</div></div>',
                                unsafe_allow_html=True,
                            )

                    # ── Tabla provincia → ganador ──────────────────────────────
                    st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)
                    _section_header("Ganador por Provincia", AMBER)
                    prov_winner_atlas = []
                    for prov_id in df_prov_atlas["provincia_id"].unique():
                        df_pp = df_prov_atlas[df_prov_atlas["provincia_id"] == prov_id]
                        if df_pp.empty:
                            continue
                        top = df_pp.loc[df_pp["escanos"].idxmax()]
                        prov_winner_atlas.append({
                            "Provincia": top.get("provincia", str(prov_id)),
                            "Ganador": top["siglas"],
                            "Esc.": int(top["escanos"]),
                            "%": round(float(top["porcentaje"]), 1) if pd.notna(top.get("porcentaje")) else None,
                        })
                    if prov_winner_atlas:
                        df_pw = pd.DataFrame(prov_winner_atlas).sort_values("Esc.", ascending=False)
                        st.dataframe(df_pw, hide_index=True, use_container_width=True, height=300)


# ═════════════════════════════════════════════════════════════════════════════
# TAB 4 — COMPARATIVA HISTORICA
# ═════════════════════════════════════════════════════════════════════════════
with tab_hist:
    _section_header("Tendencias Historicas por Partido", AMBER)

    tipo_hist_idx = st.selectbox(
        "Tipo de eleccion para comparativa",
        range(len(TIPOS_ELECCION)),
        format_func=lambda i: TIPOS_ELECCION[i].title(),
        key="tipo_hist",
    )
    tipo_hist_db = TIPOS_DB[tipo_hist_idx]
    df_hist_elec = cargar_elecciones(tipo_hist_db)

    if df_hist_elec.empty:
        st.info(f"No hay elecciones '{TIPOS_ELECCION[tipo_hist_idx]}' registradas.")
    else:
        registros = []
        for _, row_e in df_hist_elec.iterrows():
            df_r = cargar_resultados_nacionales(row_e["id"])
            if df_r.empty:
                continue
            fecha_str = str(row_e.get("fecha", ""))[:10]
            for _, row_r in df_r.iterrows():
                registros.append({
                    "fecha": fecha_str,
                    "descripcion": row_e.get("descripcion") or fecha_str,
                    "siglas": row_r["siglas"],
                    "pct_medio": row_r.get("pct_medio"),
                    "escanos_totales": row_r.get("escanos_totales"),
                })

        if not registros:
            st.info("Sin resultados historicos para este tipo.")
        else:
            df_trend = pd.DataFrame(registros)
            df_trend["fecha"] = pd.to_datetime(df_trend["fecha"], errors="coerce")
            df_trend = df_trend.dropna(subset=["pct_medio"]).sort_values("fecha")

            partidos_disp = sorted(df_trend["siglas"].unique().tolist())
            partidos_def = partidos_disp[:min(6, len(partidos_disp))]
            partidos_sel = st.multiselect("Partidos", partidos_disp, default=partidos_def, key="hist_p")

            if partidos_sel:
                col_l, col_b = st.columns(2, gap="large")

                with col_l:
                    _section_header("% Voto — Evolucion", CYAN)
                    fig_trend = go.Figure()
                    for siglas in partidos_sel:
                        df_p = df_trend[df_trend["siglas"] == siglas].sort_values("fecha")
                        if df_p.empty:
                            continue
                        color = _color(siglas)
                        fig_trend.add_trace(go.Scatter(
                            x=df_p["fecha"], y=df_p["pct_medio"],
                            name=siglas, mode="lines+markers",
                            line=dict(color=color, width=2.5),
                            marker=dict(size=8, color=color, line=dict(width=1, color=BG)),
                        ))
                    fig_trend.update_layout(
                        height=400, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                        xaxis=dict(gridcolor="rgba(30,41,59,0.40)",
                                   tickfont=dict(color=MUTED, size=9)),
                        yaxis=dict(title="% Voto", gridcolor="rgba(30,41,59,0.40)",
                                   tickfont=dict(color=MUTED, size=9), ticksuffix="%"),
                        hovermode="x unified",
                        hoverlabel=dict(bgcolor=BG2, font=dict(size=11), bordercolor=BORDER),
                        legend=dict(orientation="h", y=-0.18, font=dict(color=TEXT2, size=10),
                                    bgcolor="rgba(0,0,0,0)"),
                        margin=dict(t=20, b=60, l=50, r=10),
                    )
                    st.plotly_chart(fig_trend, use_container_width=True, config={"displayModeBar": False})

                with col_b:
                    _section_header("Escanos Historicos", PURPLE)
                    df_esc_hist = df_trend[
                        df_trend["siglas"].isin(partidos_sel) &
                        df_trend["escanos_totales"].notna()
                    ].copy()
                    if not df_esc_hist.empty:
                        fig_esc = go.Figure()
                        for siglas in partidos_sel:
                            df_ps = df_esc_hist[df_esc_hist["siglas"] == siglas].sort_values("fecha")
                            if df_ps.empty:
                                continue
                            color = _color(siglas)
                            r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
                            fig_esc.add_trace(go.Bar(
                                x=df_ps["fecha"].dt.strftime("%Y"),
                                y=df_ps["escanos_totales"].astype(int),
                                name=siglas,
                                marker=dict(
                                    color=f"rgba({r_c},{g_c},{b_c},0.75)",
                                    line=dict(color=color, width=1),
                                ),
                            ))
                        fig_esc.update_layout(
                            barmode="group", height=400,
                            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                            xaxis=dict(title="Ano", showgrid=False,
                                       tickfont=dict(color=TEXT2, size=10)),
                            yaxis=dict(title="Escanos", gridcolor="rgba(30,41,59,0.40)",
                                       tickfont=dict(color=MUTED, size=9)),
                            legend=dict(orientation="h", y=-0.18, font=dict(color=TEXT2, size=10),
                                        bgcolor="rgba(0,0,0,0)"),
                            margin=dict(t=20, b=60, l=50, r=10),
                        )
                        st.plotly_chart(fig_esc, use_container_width=True, config={"displayModeBar": False})

                # Tabla resumen
                st.markdown(f"<div style='height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1rem 0'></div>", unsafe_allow_html=True)
                _section_header("Tabla Comparativa", BLUE)
                df_pivot = df_trend[df_trend["siglas"].isin(partidos_sel)].pivot_table(
                    index="siglas", columns="descripcion", values="pct_medio"
                ).round(2)
                st.dataframe(df_pivot, use_container_width=True)

# ── Footer ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);
            margin:1.5rem 0 .5rem"></div>
<div style="text-align:center;font-size:.58rem;color:{MUTED};padding:.3rem 0">
    ElectSim Espana v2.0 &middot; Mapa Electoral &middot; Politeia Analytics
</div>
""", unsafe_allow_html=True)
