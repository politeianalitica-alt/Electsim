"""
Pagina: Mapa Electoral — Dark Tech Edition
Choropleth interactivo por provincias, hemiciclo y comparativa.
"""

from __future__ import annotations

import json
import math
import sys
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


# ── Tabs ─────────────────────────────────────────────────────────────────────
tab_pasadas, tab_futuras, tab_mapa, tab_hist = st.tabs([
    "Elecciones Pasadas",
    "Estimaciones Futuras",
    "Mapa Provincial",
    "Comparativa Historica",
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
    _section_header("Distribucion Territorial por Provincias", PURPLE)

    if eleccion_id is None:
        st.info("Selecciona una eleccion en la barra lateral.")
    else:
        df_prov = cargar_resultados_provinciales(eleccion_id)

        if df_prov.empty:
            st.warning("Sin datos provinciales para esta eleccion.")
        else:
            # Selector de vista
            col_ctrl1, col_ctrl2 = st.columns([1, 2])
            with col_ctrl1:
                vista = st.radio(
                    "Tipo de vista",
                    ["Partido ganador", "Por partido"],
                    horizontal=True, key="vista_mapa",
                )
            partido_mapa = None
            if vista == "Por partido":
                with col_ctrl2:
                    partidos_disp = sorted(df_prov["siglas"].unique().tolist())
                    partido_mapa = st.selectbox("Selecciona partido", partidos_disp, key="partido_mapa")

            # ── Mapa choropleth ──────────────────────────────────────────────
            fig_map = _build_choropleth(df_prov, partido_filter=partido_mapa)
            if fig_map:
                st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar": False})
            else:
                st.warning("No se pudo generar el mapa. Verifica que el GeoJSON existe en dashboard/data/")

            st.markdown(f"<div style='height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1rem 0'></div>", unsafe_allow_html=True)

            # ── Ranking provincial ───────────────────────────────────────────
            col_rank, col_detail = st.columns([1, 1], gap="large")

            with col_rank:
                _section_header("Escanos por Provincia", CYAN)
                # Aggregate: sum seats per province for the winning party
                partido_rank = partido_mapa or "PP"
                partidos_avail = sorted(df_prov["siglas"].unique().tolist())
                if partido_mapa is None:
                    partido_rank = st.selectbox("Partido para ranking", partidos_avail, key="partido_rank")

                df_rank = df_prov[df_prov["siglas"] == partido_rank].copy()
                df_rank = df_rank.sort_values("escanos", ascending=True)
                df_rank = df_rank[df_rank["escanos"] > 0]

                if not df_rank.empty:
                    color = _color(partido_rank)
                    r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
                    fig_rank = go.Figure(go.Bar(
                        y=df_rank["provincia"],
                        x=df_rank["escanos"],
                        orientation="h",
                        marker=dict(
                            color=f"rgba({r_c},{g_c},{b_c},0.7)",
                            line=dict(color=color, width=1),
                        ),
                        text=df_rank["escanos"].astype(int),
                        textposition="outside",
                        textfont=dict(color=TEXT, size=9, family="JetBrains Mono"),
                    ))
                    fig_rank.update_layout(
                        height=max(380, len(df_rank) * 24),
                        plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                        xaxis=dict(title="Escanos", gridcolor="rgba(30,41,59,0.40)",
                                   tickfont=dict(color=MUTED, size=9)),
                        yaxis=dict(tickfont=dict(color=TEXT2, size=9)),
                        margin=dict(t=10, b=30, l=120, r=40), showlegend=False,
                    )
                    st.plotly_chart(fig_rank, use_container_width=True, config={"displayModeBar": False})
                else:
                    st.info(f"{partido_rank} no obtuvo escanos en ninguna provincia.")

            with col_detail:
                _section_header("Detalle por Comunidad Autonoma", BLUE)
                ccaa_list = sorted(df_prov["ccaa"].dropna().unique().tolist())
                if ccaa_list:
                    ccaa_sel = st.selectbox("Comunidad Autonoma", ccaa_list, key="ccaa_detail")
                    df_ccaa = df_prov[df_prov["ccaa"] == ccaa_sel]

                    # Multi-party bars for this CCAA
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
                                color=[f"rgba({int(c[1:3],16)},{int(c[3:5],16)},{int(c[5:7],16)},0.75)"
                                       for c in colors_ccaa],
                                line=dict(color=colors_ccaa, width=1.5),
                            ),
                            text=df_ccaa_agg["escanos_sum"].astype(int),
                            textposition="outside",
                            textfont=dict(color=TEXT, size=10, family="JetBrains Mono"),
                        ))
                        fig_ccaa.update_layout(
                            title=dict(text=f"Escanos en {ccaa_sel}",
                                       font=dict(color=TEXT2, size=12)),
                            height=350,
                            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                            xaxis=dict(showgrid=False, tickfont=dict(size=10)),
                            yaxis=dict(gridcolor="rgba(30,41,59,0.40)",
                                       tickfont=dict(size=9, color=MUTED)),
                            margin=dict(t=35, b=20, l=10, r=10), showlegend=False,
                        )
                        st.plotly_chart(fig_ccaa, use_container_width=True, config={"displayModeBar": False})

                    # Province breakdown table
                    provinces_in_ccaa = sorted(df_ccaa["provincia"].unique().tolist())
                    if len(provinces_in_ccaa) > 1:
                        for prov in provinces_in_ccaa:
                            df_p = df_ccaa[df_ccaa["provincia"] == prov].sort_values("escanos", ascending=False)
                            pills = ""
                            for _, rr in df_p.head(4).iterrows():
                                c = _color(rr["siglas"])
                                pills += f'<span class="partido-pill" style="background:{c}15;border:1px solid {c}44;color:{c}">{rr["siglas"]} {int(rr["escanos"])}</span> '
                            st.markdown(f"""
                            <div class="glass" style="padding:.5rem .8rem;margin-bottom:.3rem;
                                        display:flex;justify-content:space-between;align-items:center">
                                <span style="font-size:.75rem;font-weight:600;color:{TEXT}">{prov}</span>
                                <div>{pills}</div>
                            </div>
                            """, unsafe_allow_html=True)


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
