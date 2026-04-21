"""
Página: Índices Politeia
Dashboard premium de los 7 índices propios de análisis político-social.
"""

from __future__ import annotations

import json

import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio
import streamlit as st
import streamlit.components.v1 as components
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import cargar_indices_politeia, cargar_serie_indice

# ── Semáforo mapping ───────────────────────────────────────────────────────────
SEMAFORO_COLOR = {"VERDE": GREEN, "AMARILLO": AMBER, "ROJO": RED}

st.set_page_config(page_title="Índices Politeia — ElectSim", layout="wide")
sidebar_nav()

# ── Dark Tech CSS ──────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes pulseGlow {{
    0%,100% {{ box-shadow: 0 0 8px {CYAN}33; }}
    50%      {{ box-shadow: 0 0 22px {CYAN}66; }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%     {{ opacity:1; transform:scale(1.3); }}
}}

/* ── Index cards ─────────────────────────────────────────────────── */
.idx-card {{
    background: {BG2};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    margin-bottom: 0.6rem;
    transition: box-shadow .2s ease, border-color .2s ease;
    animation: fadeInUp .45s ease both;
}}
.idx-card:hover {{
    box-shadow: 0 4px 24px {CYAN}1A;
    border-color: {CYAN}44;
}}
.idx-valor {{
    font-size: 2.6rem;
    font-weight: 800;
    line-height: 1;
    font-family: 'JetBrains Mono', monospace;
}}
.idx-nombre {{
    font-size: .68rem;
    font-weight: 700;
    color: {MUTED};
    letter-spacing: .12em;
    text-transform: uppercase;
}}
.idx-interp {{
    font-size: .78rem;
    color: {TEXT2};
    margin-top: .45rem;
    line-height: 1.45;
}}
.idx-badge {{
    display: inline-block;
    padding: .18rem .65rem;
    border-radius: 999px;
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .06em;
}}

/* ── Progress bars ────────────────────────────────────────────────── */
.progress-track {{
    background: {BG3};
    border-radius: 4px;
    height: 5px;
    margin-top: 4px;
    overflow: hidden;
}}
.progress-fill {{
    height: 5px;
    border-radius: 4px;
    transition: width .65s ease;
}}

/* ── Section headers ──────────────────────────────────────────────── */
.sec-hdr {{
    display: flex;
    align-items: center;
    gap: .7rem;
    margin: 1.8rem 0 1rem;
}}
.sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.sec-hdr .lbl  {{
    font-size: .65rem;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: {MUTED};
}}
.sec-hdr .line {{ flex:1; height:1px; background:{BORDER}; }}

/* ── Glass detail card ────────────────────────────────────────────── */
.detail-card {{
    background: {BG2};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 1.5rem;
    animation: fadeInUp .4s ease both;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;
            overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{CYAN}1A,transparent 65%);
                border-radius:50%;pointer-events:none"></div>
    <div style="position:absolute;bottom:-30px;left:28%;width:130px;height:130px;
                background:radial-gradient(circle,{PURPLE}12,transparent 65%);
                border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{CYAN};
                        animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;
                         text-transform:uppercase;color:{CYAN}">SISTEMA ACTIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;
                    color:{TEXT};line-height:1.1">
            Índices <span style="color:{CYAN}">Politeia</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Siete índices propios de análisis político, social y económico para profesionales
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Cargar datos ───────────────────────────────────────────────────────────────
df = cargar_indices_politeia()
if "metodología" not in df.columns and "metodologia" in df.columns:
    df["metodología"] = df["metodologia"]

if df.empty:
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {AMBER}44;border-left:3px solid {AMBER};
                border-radius:8px;padding:1.2rem 1.5rem;margin-bottom:1.5rem;font-size:.9rem">
        <strong style="color:{AMBER}">Sin datos de índices aún.</strong>
        <span style="color:{TEXT2}"> Ejecuta el motor de cálculo:</span><br><br>
        <code style="background:{BG3};padding:.25rem .6rem;border-radius:4px;font-size:.82rem;
                     color:{CYAN};border:1px solid {BORDER}">python -m analytics.indices.compute_all</code>
        <br><br>
        <span style="color:{TEXT2}">
        Los índices se calculan desde los datos de BD, prensa y encuestas.
        Asegúrate de tener datos en <code style="color:{CYAN}">noticias_prensa</code>,
        <code style="color:{CYAN}">resultados_electorales</code>
        y <code style="color:{CYAN}">indicadores_macroeconomicos</code>.
        </span>
    </div>
    """, unsafe_allow_html=True)

    # Catálogo dark de índices
    catalogos = [
        ("IPPS", "Índice de Polarización Política y Social",
         "Mide la distancia ideológica entre partidos, fragmentación NEP, volatilidad Pedersen y temperatura mediática."),
        ("IESP", "Índice de Estabilidad del Sistema Político",
         "Evalúa la solidez institucional: salud fiscal, cohesión parlamentaria y señal macroeconómica."),
        ("ISMA", "Índice de Sentimiento Mediático y Agenda",
         "Analiza el tono y la estructura de la cobertura de 12 medios: sentimiento, diversidad de agenda, equilibrio de cobertura."),
        ("ICED", "Índice de Crispación del Debate Público",
         "Mide la intensidad confrontacional: léxico de crisis en prensa, mociones, volatilidad del sentimiento."),
        ("ICGE", "Índice de Cohesión Gobierno-Electores",
         "Distancia entre el gobierno y su electorado: desgaste electoral, diferencial mediático, alineación macro."),
        ("IBEP", "Índice de Brecha Económica-Política",
         "Detecta la desconexión entre condiciones económicas y comportamiento electoral. Correlación paro-castigo."),
        ("IVCE", "Índice de Vulnerabilidad del Contrato Electoral",
         "Condiciones de pre-ruptura del contrato representativo: dispersión ideológica, tensión territorial, alertas."),
    ]

    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{CYAN}"></div>
        <span class="lbl">Catálogo de Índices</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    for cod, nombre, desc in catalogos:
        with st.expander(f"**{cod}** — {nombre}"):
            st.markdown(f"<span style='color:{TEXT2};font-size:.88rem'>{desc}</span>",
                        unsafe_allow_html=True)
    st.stop()

# ── Panel resumen 7 índices ────────────────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:{CYAN}"></div>
    <span class="lbl">Panel de Índices — Estado Actual</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

idx_list = df.to_dict("records")
n_total = len(idx_list)
n1 = min(4, n_total)
n2 = n_total - n1

cols_row1 = st.columns(n1) if n1 > 0 else []
cols_row2 = st.columns(n2) if n2 > 0 else []

for i, row in enumerate(idx_list):
    col = cols_row1[i] if i < n1 else cols_row2[i - n1]
    color = SEMAFORO_COLOR.get(row.get("semaforo", ""), CYAN)
    valor = float(row.get("valor") or 0)
    var7  = row.get("variacion_7d")
    arrow = "▲" if var7 and var7 > 0 else "▼" if var7 and var7 < 0 else "—"
    var_str   = f"{arrow} {abs(var7):.1f}" if var7 else "—"
    var_color = GREEN if var7 and var7 > 0 else RED if var7 and var7 < 0 else MUTED
    pct = min(100, max(0, valor))
    cr, cg, cb = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    vc_r, vc_g, vc_b = int(var_color[1:3], 16), int(var_color[3:5], 16), int(var_color[5:7], 16)
    with col:
        st.markdown(f"""
        <div class="idx-card" style="border-top:3px solid rgba({cr},{cg},{cb},0.7)">
            <div class="idx-nombre">{row['indice_codigo']}</div>
            <div class="idx-valor" style="color:{color};margin:.4rem 0">{valor:.1f}</div>
            <div style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0 .5rem">
                <span class="idx-badge"
                      style="background:rgba({vc_r},{vc_g},{vc_b},0.14);
                             color:{var_color};
                             border:1px solid rgba({vc_r},{vc_g},{vc_b},0.32);
                             font-family:'JetBrains Mono',monospace">
                    {var_str} 7d
                </span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="background:{color};width:{pct}%"></div>
            </div>
            <div class="idx-interp">{str(row.get('interpretacion',''))[:92]}…</div>
        </div>
        """, unsafe_allow_html=True)

# ── Radar de todos los índices ─────────────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:{CYAN}"></div>
    <span class="lbl">Vista de Radar Comparativa</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

codigos = [r["indice_codigo"] for r in idx_list]
valores = [float(r.get("valor") or 0) for r in idx_list]

# ── Frames animados: expanden de 0 → valor real con ease-out cúbico ──────────
_N = 50
_radar_frames = []
for fi in range(_N + 1):
    t   = fi / _N
    t_e = 1 - (1 - t) ** 3          # ease-out cubic
    r_f = [v * t_e for v in valores] + [valores[0] * t_e]
    _radar_frames.append(go.Frame(
        data=[go.Scatterpolar(
            r=r_f,
            theta=codigos + [codigos[0]],
            fill="toself",
            fillcolor=f"rgba(0,212,255,{0.10 * t_e:.4f})",
            line=dict(color=CYAN, width=2.5),
            marker=dict(size=8, color=CYAN),
        )],
        name=str(fi),
    ))

fig_radar = go.Figure(
    data=[go.Scatterpolar(
        r=[0] * (len(codigos) + 1),
        theta=codigos + [codigos[0]],
        fill="toself",
        fillcolor="rgba(0,212,255,0)",
        line=dict(color=CYAN, width=2.5),
        marker=dict(size=8, color=CYAN),
        name="Estado actual",
    )],
    frames=_radar_frames,
    layout=go.Layout(
        polar=dict(
            bgcolor="rgba(0,0,0,0)",
            radialaxis=dict(
                visible=True,
                range=[0, 100],
                tickfont=dict(size=9, color=MUTED),
                gridcolor=BORDER,
                linecolor=BORDER,
            ),
            angularaxis=dict(
                tickfont=dict(size=11, color=TEXT2),
                gridcolor=BORDER,
            ),
        ),
        height=420,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=30, b=30, l=60, r=60),
        showlegend=False,
        font=dict(color=TEXT2),
    ),
)

_radar_html = pio.to_html(
    fig_radar,
    full_html=True,
    include_plotlyjs="cdn",
    auto_play=False,
    div_id="radar-anim",
    post_script="""
setTimeout(function(){
  Plotly.animate('radar-anim', null, {
    frame: {duration: 20, redraw: true},
    transition: {duration: 15, easing: 'cubic-in-out'},
    fromcurrent: true,
    mode: 'immediate'
  });
}, 350);
""",
    config={"displayModeBar": False, "responsive": True},
    default_width="100%",
    default_height="440px",
)
components.html(_radar_html, height=460, scrolling=False)

# ── Explorador de índice individual ───────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:{BLUE}"></div>
    <span class="lbl">Análisis en Profundidad</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

sel_codigo = st.selectbox(
    "Selecciona un índice para analizar",
    options=codigos,
    format_func=lambda c: next(
        (r["indice_nombre"] for r in idx_list if r["indice_codigo"] == c), c
    ),
)

row_sel  = next((r for r in idx_list if r["indice_codigo"] == sel_codigo), {})
col_def, col_serie = st.columns([1, 2])

with col_def:
    color_sel = SEMAFORO_COLOR.get(row_sel.get("semaforo", ""), CYAN)
    sr, sg, sb = int(color_sel[1:3], 16), int(color_sel[3:5], 16), int(color_sel[5:7], 16)
    sel_var7 = row_sel.get("variacion_7d")
    sel_arrow = "▲" if sel_var7 and sel_var7 > 0 else "▼" if sel_var7 and sel_var7 < 0 else "—"
    sel_var_str = f"{sel_arrow} {abs(sel_var7):.1f}" if sel_var7 else "—"
    sel_var_color = GREEN if sel_var7 and sel_var7 > 0 else RED if sel_var7 and sel_var7 < 0 else MUTED
    svc_r, svc_g, svc_b = int(sel_var_color[1:3], 16), int(sel_var_color[3:5], 16), int(sel_var_color[5:7], 16)
    st.markdown(f"""
    <div class="detail-card" style="border-top:3px solid {color_sel}">
        <div style="font-size:.65rem;font-weight:700;color:{MUTED};
                    letter-spacing:.12em;text-transform:uppercase">
            {row_sel.get('indice_codigo','')}
        </div>
        <div style="font-size:.95rem;font-weight:600;color:{TEXT};
                    margin:.2rem 0 1rem;line-height:1.3">
            {row_sel.get('indice_nombre','')}
        </div>
        <div style="font-size:3.5rem;font-weight:900;line-height:1;
                    color:{color_sel};font-family:'JetBrains Mono',monospace">
            {float(row_sel.get('valor') or 0):.1f}
        </div>
        <div style="margin:.6rem 0">
            <span class="idx-badge"
                  style="background:rgba({svc_r},{svc_g},{svc_b},0.15);
                         color:{sel_var_color};
                         border:1px solid rgba({svc_r},{svc_g},{svc_b},0.35);
                         padding:.25rem .8rem;
                         font-family:'JetBrains Mono',monospace">
                {sel_var_str} 7d
            </span>
        </div>
        <hr style="border:none;border-top:1px solid {BORDER};margin:.8rem 0">
        <div style="font-size:.82rem;color:{TEXT2};line-height:1.55">
            {row_sel.get('interpretacion','')}
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Componentes como progress bars
    comp_raw = row_sel.get("componentes_json")
    if comp_raw:
        try:
            comp = json.loads(comp_raw) if isinstance(comp_raw, str) else comp_raw
            st.markdown(f"""
            <div style="margin-top:1rem;font-size:.65rem;font-weight:700;
                        color:{MUTED};letter-spacing:.12em;text-transform:uppercase;
                        margin-bottom:.5rem">Componentes</div>
            """, unsafe_allow_html=True)
            for nombre_comp, val_comp in comp.items():
                val_n = float(val_comp or 0)
                pct   = min(100, val_n)
                c_bar = CYAN if pct < 65 else AMBER if pct < 80 else RED
                st.markdown(f"""
                <div style="margin:.4rem 0">
                    <div style="display:flex;justify-content:space-between;
                                font-size:.78rem;color:{TEXT2}">
                        <span>{nombre_comp[:40]}</span>
                        <span style="font-weight:700;color:{c_bar}">{val_n:.1f}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="background:{c_bar};width:{pct}%"></div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        except Exception:
            pass

with col_serie:
    df_serie = cargar_serie_indice(sel_codigo, dias=90)
    if not df_serie.empty:
        fig_s = go.Figure()
        # Bandas semáforo
        fig_s.add_hrect(y0=0,  y1=35,  fillcolor="rgba(16,185,129,0.06)",  line_width=0)
        fig_s.add_hrect(y0=35, y1=65,  fillcolor="rgba(245,158,11,0.06)",  line_width=0)
        fig_s.add_hrect(y0=65, y1=100, fillcolor="rgba(239,68,68,0.06)",   line_width=0)
        # Serie principal
        fig_s.add_trace(go.Scatter(
            x=df_serie["fecha_calculo"],
            y=df_serie["valor"].astype(float),
            mode="lines+markers",
            line=dict(color=CYAN, width=2.5),
            marker=dict(size=5, color=CYAN),
            fill="tozeroy",
            fillcolor="rgba(0,212,255,0.07)",
            name=sel_codigo,
        ))
        fig_s.add_hline(y=35, line_dash="dot", line_color=GREEN, line_width=1)
        fig_s.add_hline(y=65, line_dash="dot", line_color=RED,   line_width=1)
        fig_s.update_layout(
            title=dict(text="Evolución histórica (90 días)",
                       font=dict(size=13, color=TEXT2)),
            xaxis=dict(
                showgrid=False, title=None,
                tickfont=dict(color=MUTED),
                linecolor=BORDER,
            ),
            yaxis=dict(
                range=[0, 105],
                title="Valor (0–100)",
                gridcolor=BORDER,
                tickfont=dict(color=MUTED),
            ),
            height=360,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=40, b=20, l=10, r=10),
            showlegend=False,
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_s, use_container_width=True)
    else:
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">
            Serie histórica sin datos aún. El índice se acumula con cada ejecución diaria.
        </div>
        """, unsafe_allow_html=True)

    with st.expander("Metodología del índice"):
        met = row_sel.get("metodología", "Sin metodología definida.")
        st.markdown(f"<span style='color:{TEXT2};font-size:.88rem'>{met}</span>",
                    unsafe_allow_html=True)

# ── Heatmap histórico ──────────────────────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:{PURPLE}"></div>
    <span class="lbl">Heatmap Histórico de Todos los Índices</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

heatmap_data = []
for row in idx_list:
    serie = cargar_serie_indice(row["indice_codigo"], dias=60)
    if not serie.empty:
        for _, s in serie.iterrows():
            heatmap_data.append({
                "indice": row["indice_codigo"],
                "fecha":  str(s["fecha_calculo"]),
                "valor":  float(s["valor"] or 0),
            })

if heatmap_data:
    df_heat   = pd.DataFrame(heatmap_data)
    df_pivot  = df_heat.pivot_table(index="indice", columns="fecha", values="valor", aggfunc="last").fillna(0)
    fig_heat  = go.Figure(go.Heatmap(
        z=df_pivot.values,
        x=df_pivot.columns.tolist(),
        y=df_pivot.index.tolist(),
        colorscale=[
            [0.00, "#166534"],
            [0.35, "#14532D"],
            [0.50, BG3],
            [0.65, "#78350F"],
            [1.00, "#7F1D1D"],
        ],
        zmin=0, zmax=100,
        colorbar=dict(
            title=dict(text="Valor", font=dict(size=11, color=MUTED)),
            tickfont=dict(size=10, color=MUTED),
        ),
        hoverongaps=False,
    ))
    fig_heat.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showticklabels=False, title=None),
        yaxis=dict(tickfont=dict(size=11, color=TEXT2)),
        margin=dict(t=10, b=10, l=60, r=10),
        font=dict(color=TEXT2),
    )
    st.plotly_chart(fig_heat, use_container_width=True)
else:
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                padding:1rem 1.2rem;color:{TEXT2};font-size:.88rem">
        El heatmap aparecerá cuando haya al menos 3 días de datos calculados.
    </div>
    """, unsafe_allow_html=True)

# ── Metodología completa ───────────────────────────────────────────────────────
st.markdown(f'<hr style="border:none;border-top:1px solid {BORDER};margin:2rem 0">',
            unsafe_allow_html=True)
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:{AMBER}"></div>
    <span class="lbl">Metodología Completa de los Índices Politeia</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

INDICES_DOC = {
    "IPPS": {
        "nombre": "Índice de Polarización Política y Social",
        "rango": "0–100 · (100 = máxima polarización)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Distancia ideológica ponderada (30 %)",
             "Dispersión ponderada de los partidos en el eje izquierda–derecha usando posiciones CIS-Manifesto Project. Se calcula como la desviación típica ponderada por el peso electoral de cada partido."),
            ("C2 · Fragmentación NEP Laakso-Taagepera (20 %)",
             "Número Efectivo de Partidos electoral: NEP = 1 / Σpᵢ². Normalizado con el rango histórico español 1989–2023 (mín. 2,1 en 1989, máx. 6,2 en 2015)."),
            ("C3 · Volatilidad Pedersen (25 %)",
             "Pedersen = Σ|Δvᵢ| / 2, donde Δvᵢ es el cambio de voto de cada partido entre las dos últimas elecciones generales. Mide cuánto 'fluye' el voto entre partidos."),
            ("C4 · Temperatura mediática (25 %)",
             "Proporción de noticias políticas con sentimiento negativo en los últimos 30 días, calculada mediante NLP sobre 12 medios nacionales."),
        ],
        "interpretacion": "Un IPPS alto indica un sistema político fragmentado con partidos muy alejados ideológicamente y alta volatilidad electoral. Históricamente correlaciona con dificultad de formación de gobierno (2015-16, 2019).",
        "referencias": "Dalton (2008) · Laakso & Taagepera (1979) · Pedersen (1979)",
    },
    "IESP": {
        "nombre": "Índice de Estabilidad del Sistema Político",
        "rango": "0–100 · (100 = máxima estabilidad)",
        "semaforo": "VERDE ≥60 · AMARILLO 35–59 · ROJO <35",
        "componentes": [
            ("C1 · Salud fiscal y financiera (30 %)",
             "Combinación de prima de riesgo, déficit estructural y sostenibilidad de la deuda pública respecto al PIB. Se normaliza con umbrales del Pacto de Estabilidad europeo."),
            ("C2 · Cohesión parlamentaria (25 %)",
             "Capacidad del partido gobernante de aprobar legislación clave: ratio de proposiciones de ley aprobadas vs. rechazadas en la legislatura en curso."),
            ("C3 · Fluidez de investidura (25 %)",
             "Tiempo en días desde las elecciones hasta la investidura del Presidente del Gobierno, normalizado con el histórico español (mín. 0, máx. 314 días en 2015-16)."),
            ("C4 · Señal macroeconómica (20 %)",
             "Desviación del PIB y la tasa de paro respecto a la tendencia histórica de largo plazo."),
        ],
        "interpretacion": "IESP bajo indica fragilidad institucional: gobiernos en minoría, dificultad para aprobar presupuestos y tensión fiscal. Por debajo de 35, el riesgo de elecciones anticipadas se dispara.",
        "referencias": "Lijphart (1999) · Tsebelis (2002) · Banco de España",
    },
    "ISMA": {
        "nombre": "Índice de Sentimiento Mediático y Agenda",
        "rango": "0–100 · (100 = agenda más positiva y equilibrada)",
        "semaforo": "VERDE ≥60 · AMARILLO 35–59 · ROJO <35",
        "componentes": [
            ("C1 · Sentimiento neto de la prensa (35 %)",
             "Promedio ponderado del sentimiento NLP de 12 medios nacionales: El País, El Mundo, ABC, RTVE, La Vanguardia, El Confidencial, elDiario.es, Expansión, Cinco Días, El Economista, InfoLibre y La Razón."),
            ("C2 · Diversidad de agenda (25 %)",
             "Entropía de Shannon de los temas presentes en la agenda mediática del día. Mayor diversidad = información más equilibrada y menos centrada en la crisis."),
            ("C3 · Ratio progreso/crisis (20 %)",
             "Proporción de noticias con 'framing' de progreso y avance frente a las enmarcadas como crisis o conflicto."),
            ("C4 · Equilibrio de cobertura (20 %)",
             "Desviación entre la cobertura mediática de cada partido y su peso electoral real. Penaliza la sobrerepresentación o la invisibilidad."),
        ],
        "interpretacion": "ISMA bajo refleja una agenda dominada por la crisis, el conflicto y el sentimiento negativo. Correlaciona con mayor volatilidad electoral y menor participación.",
        "referencias": "Entman (1993) · Boydstun et al. (2014) · Reuters Institute",
    },
    "ICED": {
        "nombre": "Índice de Crispación del Debate Público",
        "rango": "0–100 · (100 = máxima crispación)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Léxico confrontacional (35 %)",
             "Frecuencia de términos como 'traición', 'golpe', 'invasión', 'dictador' o 'fascista' en prensa política. Se normaliza con el máximo observado en la muestra histórica."),
            ("C2 · Actividad parlamentaria adversarial (30 %)",
             "Ratio entre mociones de censura, interpelaciones urgentes y preguntas sobre gestión de crisis vs. proposiciones de ley positivas. Mide si el Congreso legisla o solo confronta."),
            ("C3 · Volatilidad del sentimiento mediático (20 %)",
             "Desviación típica del sentimiento diario en las últimas 4 semanas. Alta variabilidad indica un clima de polémica permanente."),
            ("C4 · Agenda de temas de tensión (15 %)",
             "Porcentaje de noticias sobre temas históricamente polarizantes: memoria histórica, cuestión catalana, inmigración, aborto y educación concertada."),
        ],
        "interpretacion": "ICED alto indica un clima político de alta hostilidad verbal, con el debate parlamentario centrado en la confrontación en lugar de la legislación. Predice mayor abstención entre votantes moderados.",
        "referencias": "Iyengar et al. (2019) · Abramowitz & Webster (2016) · CIS Barómetros",
    },
    "ICGE": {
        "nombre": "Índice de Cohesión Gobierno-Electores",
        "rango": "0–100 · (100 = máxima cohesión)",
        "semaforo": "VERDE ≥60 · AMARILLO 35–59 · ROJO <35",
        "componentes": [
            ("C1 · Desgaste electoral del gobierno (35 %)",
             "Diferencia entre el resultado electoral del partido o coalición gobernante en las últimas generales y su estimación actual de intención de voto (nowcasting)."),
            ("C2 · Sentimiento mediático diferencial (25 %)",
             "Diferencia del sentimiento promedio en prensa entre los partidos de gobierno y los de oposición. Si la oposición tiene mejor cobertura, penaliza al gobierno."),
            ("C3 · Alineación con promesas macroeconómicas (25 %)",
             "Grado en que los indicadores de paro, PIB e IPC cumplen los objetivos implícitos en las promesas electorales del gobierno (paro <10 %, PIB >2 %, IPC <3 %)."),
            ("C4 · Ausencia de alertas críticas (15 %)",
             "Número y severidad de alertas sistémicas activas relacionadas con el gobierno en los últimos 14 días."),
        ],
        "interpretacion": "ICGE bajo indica que el gobierno ha perdido soporte popular respecto a su mandato electoral. Un ICGE <35 predice con alta probabilidad un 'voto de castigo' en las próximas elecciones.",
        "referencias": "Powell (2000) · Duch & Stevenson (2008) · Barómetros CIS 2019-2025",
    },
    "IBEP": {
        "nombre": "Índice de Brecha Económico-Política",
        "rango": "0–100 · (100 = máxima brecha)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Correlación paro-castigo electoral (30 %)",
             "Correlación histórica entre la variación de la tasa de paro y la caída de voto al partido gobernante en España (1982-2023). Se aplica como factor de escala al cambio actual del paro."),
            ("C2 · Volatilidad de la prima de riesgo (25 %)",
             "Desviación típica de la prima de riesgo española en las últimas 20 sesiones bursátiles. Alta volatilidad refleja incertidumbre política percibida por los mercados."),
            ("C3 · Frustración económica ciudadana (25 %)",
             "Índice de confianza del consumidor y de valoración de la situación económica personal (CIS/Eurostat). Se normaliza con el rango histórico español."),
            ("C4 · Brecha presupuestaria (20 %)",
             "Desviación del déficit público real respecto al objetivo comprometido con la Comisión Europea. Incumplimientos persistentes amplifican la brecha político-económica."),
        ],
        "interpretacion": "IBEP alto indica que la economía está actuando como palanca de castigo electoral: los ciudadanos perciben que su situación económica es peor de lo que debería, y los mercados penalizan la incertidumbre política.",
        "referencias": "Lewis-Beck & Stegmaier (2000) · Alesina & Rosenthal (1995) · Banco de España",
    },
    "IVCE": {
        "nombre": "Índice de Vulnerabilidad del Contrato Electoral",
        "rango": "0–100 · (100 = máxima vulnerabilidad)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Distancia posicional entre partidos (30 %)",
             "Distancia euclidiana media entre los partidos relevantes (≥3 % de voto) en el plano ideológico bidimensional: eje izquierda-derecha × eje libertario-autoritario. Se normaliza con la diagonal del cuadrado 9×9 (≈12,73)."),
            ("C2 · Divergencia territorial del voto (25 %)",
             "Número de partidos distintos que ganan en alguna Comunidad Autónoma en las últimas elecciones generales. Un partido ganando en todas → 0; 10 partidos distintos → 100."),
            ("C3 · Densidad de alertas sistémicas (25 %)",
             "Número y severidad de alertas activas en el sistema político en los últimos 30 días. Pondera: CRÍTICA ×20 puntos, AVISO ×8, INFORMATIVA ×2."),
            ("C4 · Concentración electoral HHI (20 %)",
             "Índice Herfindahl-Hirschman del sistema electoral. El óptimo de equilibrio es HHI≈0,25 (3-4 partidos equilibrados). Se penaliza tanto el bipartidismo extremo como la fragmentación extrema."),
        ],
        "interpretacion": "IVCE alto señala condiciones propicias para un voto de castigo masivo, emergencia de nuevas fuerzas políticas o abstención significativa. Detecta 'pre-crisis electorales' 6-18 meses antes.",
        "referencias": "Norris (2011) · Schedler (1998) · Dalton & Wattenberg (2000)",
    },
}

cols_met = st.columns(2)
for i, (codigo, doc) in enumerate(INDICES_DOC.items()):
    with cols_met[i % 2]:
        with st.expander(f"{codigo} · {doc['nombre']}"):
            sem_html = (
                doc["semaforo"]
                .replace("VERDE",    f'<span style="color:{GREEN};font-weight:700">VERDE</span>')
                .replace("AMARILLO", f'<span style="color:{AMBER};font-weight:700">AMARILLO</span>')
                .replace("ROJO",     f'<span style="color:{RED};font-weight:700">ROJO</span>')
            )
            st.markdown(f"""
            <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
                        padding:.65rem .9rem;margin-bottom:.7rem;font-size:.85rem;color:{TEXT2}">
                <strong style="color:{TEXT}">Rango:</strong> {doc['rango']}<br>
                <strong style="color:{TEXT}">Semáforo:</strong> {sem_html}
            </div>
            """, unsafe_allow_html=True)

            st.markdown(f"<span style='font-size:.78rem;font-weight:700;color:{MUTED};"
                        f"letter-spacing:.1em;text-transform:uppercase'>COMPONENTES</span>",
                        unsafe_allow_html=True)
            for nombre_c, desc_c in doc["componentes"]:
                st.markdown(
                    f"<div style='margin:.55rem 0'>"
                    f"<strong style='color:{CYAN2};font-size:.85rem'>{nombre_c}</strong><br>"
                    f"<span style='font-size:.82rem;color:{TEXT2}'>{desc_c}</span>"
                    f"</div>",
                    unsafe_allow_html=True,
                )

            st.markdown(f'<hr style="border:none;border-top:1px solid {BORDER};margin:.7rem 0">',
                        unsafe_allow_html=True)
            st.markdown(
                f"<div style='font-size:.85rem;color:{TEXT2}'>"
                f"<strong style='color:{TEXT}'>Interpretación:</strong> {doc['interpretacion']}"
                f"</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                f"<div style='font-size:.75rem;color:{MUTED};margin-top:.4rem'>"
                f"Referencias: {doc['referencias']}</div>",
                unsafe_allow_html=True,
            )
