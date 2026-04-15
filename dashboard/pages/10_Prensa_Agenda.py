"""
Página: Prensa & Agenda Mediática
Análisis en tiempo real de la cobertura mediática española.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import feedparser
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import sidebar_nav

from dashboard.db import (
    cargar_agenda_hoy,
    cargar_agenda_historica,
    cargar_noticias_recientes,
    cargar_sentimiento_partido,
    cargar_sentimiento_todos_partidos,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

NAVY  = "#1E3A5F"
BLUE  = "#2563EB"
LBLUE = "#60A5FA"
PALE  = "#EFF6FF"
WHITE = "#FFFFFF"
SURF  = "#F8FAFC"
BORD  = "#CBD5E1"
TEXT  = "#0F172A"
MUTED = "#64748B"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED   = "#EF4444"
ORANGE = "#F97316"
PURPLE = "#8B5CF6"
YELLOW = "#EAB308"

NEWTRAL_FACTCHECK_FEEDS = [
    "https://www.newtral.es/tag/fact-check/feed/",
    "https://www.newtral.es/tag/verificacion/feed/",
]
AGENDA_OFICIAL_FEEDS = [
    ("Moncloa", "https://www.lamoncloa.gob.es/Paginas/index-rss.aspx"),
    ("Congreso", "https://www.congreso.es/web/guest/rss"),
    ("Casa Real", "https://casareal.es/ES/Prensa/noticias/Paginas/subhome-rss.xml"),
]

PARTIDOS_KEYWORDS = {
    "PSOE": ["psoe", "sanchez", "pedro sanchez", "socialista"],
    "PP": ["pp", "feijoo", "feijóo", "partido popular"],
    "VOX": ["vox", "abascal"],
    "SUMAR": ["sumar", "yolanda diaz", "yolanda díaz"],
    "PODEMOS": ["podemos", "irene montero", "pablo iglesias"],
    "JUNTS": ["junts", "puigdemont"],
    "ERC": ["erc", "esquerra"],
}


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    h = (hex_color or "").lstrip("#")
    if len(h) != 6:
        return f"rgba(37,99,235,{alpha})"
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"

# ── Datos sintéticos de bulos ─────────────────────────────────────────────────
BULOS_RECIENTES = [
    {
        "fecha": "12 abril 2026",
        "titular_bulo": "Vídeo viral afirma que el gobierno aprobó 'en secreto' una subida del IVA al 25%",
        "veredicto": "FALSO",
        "partidos_implicados": ["PSOE", "SUMAR"],
        "fuente_origen": "Cadena de WhatsApp / Telegram",
        "explicacion": "El vídeo es un montaje de declaraciones del 2012. El IVA general sigue en el 21% y no hay ninguna propuesta legislativa al respecto.",
        "impacto": "Alto — 2,3M visualizaciones en 48h",
        "fuente_verificacion": "Newtral / Maldita.es",
    },
    {
        "fecha": "10 abril 2026",
        "titular_bulo": "PP 'planea privatizar' el sistema sanitario según documento filtrado",
        "veredicto": "ENGAÑOSO",
        "partidos_implicados": ["PP"],
        "fuente_origen": "Twitter/X — cuenta anónima con 120K seguidores",
        "explicacion": "El documento existe pero es un paper académico de 2019, no un plan de gobierno del PP. Se omite el contexto completo.",
        "impacto": "Medio — 890K visualizaciones",
        "fuente_verificacion": "Maldita.es",
    },
    {
        "fecha": "9 abril 2026",
        "titular_bulo": "VOX afirma que 'el 80% de los delitos violentos los cometen inmigrantes' citando estadísticas del Ministerio del Interior",
        "veredicto": "FALSO",
        "partidos_implicados": ["VOX"],
        "fuente_origen": "Declaración en mitin + amplificada en redes",
        "explicacion": "Las estadísticas del Ministerio del Interior muestran que los extranjeros representan el 18% de los detenidos, no el 80%. La frase invierte los datos.",
        "impacto": "Alto — declaración en prime time",
        "fuente_verificacion": "Newtral / AFP Factual",
    },
    {
        "fecha": "8 abril 2026",
        "titular_bulo": "Imagen viral muestra a Sánchez en reunión con empresarios rusos 'en secreto'",
        "veredicto": "FALSO",
        "partidos_implicados": ["PSOE"],
        "fuente_origen": "Telegram / Twitter",
        "explicacion": "La imagen es de 2018 y corresponde a una cumbre UE-Rusia antes de la invasión de Ucrania. Ha sido usada fuera de contexto reiteradamente.",
        "impacto": "Alto — 1,8M visualizaciones",
        "fuente_verificacion": "EFE Verifica / Newtral",
    },
    {
        "fecha": "7 abril 2026",
        "titular_bulo": "El PSOE habría recibido 'donaciones ilegales de Venezuela' según informe de la UDEF",
        "veredicto": "SIN VERIFICAR",
        "partidos_implicados": ["PSOE"],
        "fuente_origen": "Medio digital sin contraste",
        "explicacion": "No existe ningún informe de la UDEF con ese contenido. La información proviene de una única fuente anónima y no ha sido confirmada por ningún medio de referencia.",
        "impacto": "Medio — 650K visualizaciones",
        "fuente_verificacion": "Pendiente de verificación",
    },
    {
        "fecha": "6 abril 2026",
        "titular_bulo": "Feijóo propuso 'eliminar las pensiones públicas' en un congreso privado del PP",
        "veredicto": "FALSO",
        "partidos_implicados": ["PP"],
        "fuente_origen": "Tweet con audio manipulado",
        "explicacion": "El audio es una edición de una conferencia sobre sostenibilidad del sistema de pensiones donde Feijóo hablaba de la necesidad de reformas, no de eliminación.",
        "impacto": "Medio — 780K reproducciones del audio",
        "fuente_verificacion": "Maldita.es / Verificat",
    },
    {
        "fecha": "4 abril 2026",
        "titular_bulo": "SUMAR 'planea legalizar las okupaciones' según borrador de ley filtrado",
        "veredicto": "ENGAÑOSO",
        "partidos_implicados": ["SUMAR"],
        "fuente_origen": "Blog político + Twitter",
        "explicacion": "El texto es una propuesta de enmienda sobre derecho a la vivienda que no legaliza la ocupación ilegal pero sí endurece los requisitos para desahucios sin alternativa habitacional.",
        "impacto": "Bajo — 280K visualizaciones",
        "fuente_verificacion": "Newtral",
    },
    {
        "fecha": "2 abril 2026",
        "titular_bulo": "Abascal: 'Con VOX en el gobierno el paro caería al 3% en un año'",
        "veredicto": "SIN AVAL CIENTÍFICO",
        "partidos_implicados": ["VOX"],
        "fuente_origen": "Declaración pública en Congreso",
        "explicacion": "La afirmación no está respaldada por ningún estudio económico independiente. Los economistas consultados califican la cifra de 'imposible en el horizonte temporal citado'.",
        "impacto": "Alto — declaración pública ampliamente difundida",
        "fuente_verificacion": "El País Verifica / Newtral",
    },
]


def _extraer_partidos(texto: str) -> list[str]:
    txt = texto.lower()
    partidos = []
    for siglas, kws in PARTIDOS_KEYWORDS.items():
        if any(kw in txt for kw in kws):
            partidos.append(siglas)
    return partidos or ["SIN CLASIFICAR"]


def _inferir_veredicto(texto: str) -> str:
    t = texto.lower()
    if any(k in t for k in ["falso", "bulo", "fake", "desinform"]):
        return "FALSO"
    if any(k in t for k in ["engañoso", "enganoso", "fuera de contexto", "manipulad"]):
        return "ENGAÑOSO"
    return "SIN VERIFICAR"


@st.cache_data(ttl=3600)
def cargar_bulos_newtral(limit: int = 20) -> list[dict]:
    items: list[dict] = []
    for feed_url in NEWTRAL_FACTCHECK_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in getattr(feed, "entries", [])[: limit * 2]:
                titulo = str(getattr(entry, "title", "")).strip()
                if not titulo:
                    continue
                resumen = re.sub(r"<[^>]+>", " ", str(getattr(entry, "summary", ""))).strip()
                link = str(getattr(entry, "link", "")).strip()
                fecha = str(getattr(entry, "published", "") or getattr(entry, "updated", "")).strip()
                texto = f"{titulo}. {resumen}"
                items.append({
                    "fecha": fecha[:16] if fecha else "reciente",
                    "titular_bulo": titulo[:300],
                    "veredicto": _inferir_veredicto(texto),
                    "partidos_implicados": _extraer_partidos(texto),
                    "fuente_origen": "Newtral",
                    "explicacion": resumen[:700] if resumen else "Verificación publicada en Newtral.",
                    "impacto": "Pendiente estimación",
                    "fuente_verificacion": "Newtral",
                    "url": link,
                })
        except Exception:
            continue

    # Deduplicado por titular
    dedup = {}
    for it in items:
        dedup[it["titular_bulo"]] = it
    return list(dedup.values())[:limit]


@st.cache_data(ttl=3600)
def cargar_agenda_oficial(limit: int = 20) -> pd.DataFrame:
    rows = fetch_all_agendas(max_items_per_source=max(6, limit // 4))
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows).drop_duplicates(subset=["titulo"]).head(limit)
    if "fuente" not in df.columns:
        df["fuente"] = "Agenda oficial"
    return df

VEREDICTO_COLORS = {
    "FALSO": RED,
    "ENGAÑOSO": ORANGE,
    "SIN VERIFICAR": YELLOW,
    "SIN AVAL CIENTÍFICO": PURPLE,
}

VEREDICTO_TEXT_COLORS = {
    "FALSO": WHITE,
    "ENGAÑOSO": WHITE,
    "SIN VERIFICAR": TEXT,
    "SIN AVAL CIENTÍFICO": WHITE,
}

st.set_page_config(page_title="Prensa & Agenda — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
body, .stApp {{ background: {WHITE}; color: {TEXT}; }}
.noticia-card {{
    background: {WHITE};
    border: 1px solid {BORD};
    border-left: 3px solid {BLUE};
    border-radius: 8px;
    padding: .8rem 1rem;
    margin-bottom: .5rem;
}}
.noticia-pos {{ border-left-color: {GREEN} !important; }}
.noticia-neg {{ border-left-color: {RED} !important; }}
.noticia-neu {{ border-left-color: {BORD} !important; }}
.badge {{
    display:inline-block;
    padding:.15rem .5rem;
    border-radius:4px;
    font-size:.7rem;
    font-weight:600;
    letter-spacing:.04em;
}}
.bulo-card {{
    background: {WHITE};
    border: 1px solid {BORD};
    border-radius: 10px;
    padding: 1rem 1.2rem;
    margin-bottom: .7rem;
}}
.section-title {{
    font-size:.75rem; font-weight:700; color:{MUTED};
    letter-spacing:.1em; text-transform:uppercase;
    border-bottom:2px solid {PALE}; padding-bottom:.4rem; margin:1.5rem 0 1rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="background:linear-gradient(135deg,{NAVY} 0%,{BLUE} 100%);
            color:white;padding:1.8rem 2.2rem;border-radius:16px;margin-bottom:1.5rem">
    <div style="font-size:1.5rem;font-weight:800">Prensa & Agenda Mediática</div>
    <div style="opacity:.8;font-size:.88rem;margin-top:.2rem">
        Análisis de sentimiento, agenda en tiempo real y verificación de bulos — 12 medios españoles monitorizados
    </div>
</div>
""", unsafe_allow_html=True)

# ── Sidebar controles ──────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Filtros")
    dias_noticias = st.slider("Ventana noticias (dias)", 1, 30, 7)
    dias_sent = st.slider("Ventana sentimiento (dias)", 7, 90, 30)

# ── KPIs rápidos ──────────────────────────────────────────────────────────────
df_noticias = cargar_noticias_recientes(dias=dias_noticias, limit=100)
df_agenda = cargar_agenda_hoy()
df_sent_all = cargar_sentimiento_todos_partidos(dias=dias_noticias)

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Noticias analizadas", len(df_noticias) if not df_noticias.empty else 0,
              help=f"Ultimos {dias_noticias} dias")
with col2:
    if not df_noticias.empty and "sentimiento_score" in df_noticias.columns:
        sent_medio = df_noticias["sentimiento_score"].mean()
        label = "positivo" if sent_medio > 0.1 else "negativo" if sent_medio < -0.1 else "neutro"
        st.metric("Sentimiento medio", f"{sent_medio:.3f}", delta=label)
    else:
        st.metric("Sentimiento medio", "—")
with col3:
    if not df_noticias.empty:
        pct_neg = (df_noticias["sentimiento_label"] == "negativo").sum() / len(df_noticias) * 100
        st.metric("Noticias negativas", f"{pct_neg:.1f}%")
    else:
        st.metric("Noticias negativas", "—")
with col4:
    st.metric("Temas en agenda hoy", len(df_agenda) if not df_agenda.empty else 0)

st.divider()

# ── Tabs principales ──────────────────────────────────────────────────────────
tab_agenda, tab_sentimiento, tab_noticias, tab_bulos = st.tabs([
    "Agenda & Mapa",
    "Sentimiento por Partido",
    "Feed de Noticias",
    "Bulos y Desinformación",
])

# ── Tab 1: Agenda & Mapa ──────────────────────────────────────────────────────
with tab_agenda:
    col_agenda, col_sent_partidos = st.columns([1.2, 1])

    with col_agenda:
        st.markdown('<div class="section-title">Mapa de Agenda — Hoy</div>', unsafe_allow_html=True)
        if not df_agenda.empty:
            df_agenda["color"] = df_agenda["sentimiento_medio"].apply(
                lambda s: "positivo" if (s or 0) > 0.1 else "negativo" if (s or 0) < -0.1 else "neutro"
            )
            fig_tree = px.treemap(
                df_agenda,
                path=["tema"],
                values="n_noticias",
                color="sentimiento_medio",
                color_continuous_scale=[[0, RED], [0.5, AMBER], [1, GREEN]],
                color_continuous_midpoint=0,
                hover_data=["sentimiento_medio"],
            )
            fig_tree.update_traces(
                textfont=dict(size=13, family="Inter, sans-serif"),
                hovertemplate="<b>%{label}</b><br>Noticias: %{value}<br>Sentimiento: %{color:.3f}<extra></extra>",
            )
            fig_tree.update_layout(
                height=380, paper_bgcolor=WHITE,
                margin=dict(t=0, b=0, l=0, r=0),
                coloraxis_colorbar=dict(title="Sent.", tickfont=dict(size=9)),
            )
            st.plotly_chart(fig_tree, use_container_width=True)
        else:
            st.info("Ejecuta el scraper RSS para poblar la agenda: `python -m etl.sources.rss_noticias`")

    with col_sent_partidos:
        st.markdown('<div class="section-title">Sentimiento por Partido</div>', unsafe_allow_html=True)
        if not df_sent_all.empty:
            df_sent_all_sorted = df_sent_all.sort_values("sent_medio")
            colors = [GREEN if v > 0.05 else RED if v < -0.05 else AMBER
                      for v in df_sent_all_sorted["sent_medio"]]
            fig_sent = go.Figure(go.Bar(
                x=df_sent_all_sorted["sent_medio"].round(3),
                y=df_sent_all_sorted["entidad"],
                orientation="h",
                marker_color=colors,
                text=df_sent_all_sorted["sent_medio"].round(3).astype(str),
                textposition="outside",
            ))
            fig_sent.update_layout(
                xaxis=dict(title="Sentimiento medio (-1 negativo → +1 positivo)", range=[-1, 1],
                           zeroline=True, zerolinecolor=MUTED, zerolinewidth=1,
                           gridcolor=BORD),
                yaxis=dict(title=None),
                height=380, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
                margin=dict(t=10, b=10, l=10, r=60),
                showlegend=False,
            )
            fig_sent.add_vline(x=0, line_color=MUTED, line_width=1)
            st.plotly_chart(fig_sent, use_container_width=True)
        else:
            st.info("Sin datos de sentimiento. Ejecuta el scraper RSS.")

    # ── Agenda histórica heatmap ──────────────────────────────────────────────
    st.markdown('<div class="section-title">Evolución de la Agenda (Ultimos 30 dias)</div>', unsafe_allow_html=True)

    df_agenda_hist = cargar_agenda_historica(dias=30, top_temas=12)
    if not df_agenda_hist.empty:
        df_pivot = df_agenda_hist.pivot_table(
            index="tema", columns="fecha", values="n_noticias", fill_value=0
        )
        fig_heat = go.Figure(go.Heatmap(
            z=df_pivot.values,
            x=[str(c)[:10] for c in df_pivot.columns],
            y=df_pivot.index.tolist(),
            colorscale=[[0, WHITE], [0.3, PALE], [0.7, LBLUE], [1, NAVY]],
            hoverongaps=False,
            hovertemplate="<b>%{y}</b><br>%{x}<br>Noticias: %{z}<extra></extra>",
        ))
        fig_heat.update_layout(
            height=360, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            xaxis=dict(tickfont=dict(size=9), title=None),
            yaxis=dict(tickfont=dict(size=11), title=None),
            margin=dict(t=10, b=10, l=120, r=10),
            coloraxis_showscale=True,
        )
        st.plotly_chart(fig_heat, use_container_width=True)
    else:
        st.info("Sin datos de agenda histórica aun.")

    st.markdown('<div class="section-title">Agenda Oficial Próximos Eventos</div>', unsafe_allow_html=True)
    df_oficial = cargar_agenda_oficial(limit=18)
    if df_oficial.empty:
        st.info("Sin agenda oficial en tiempo real disponible en este momento.")
    else:
        fuente_off = st.selectbox(
            "Fuente oficial",
            ["Todas"] + sorted(df_oficial["fuente"].unique().tolist()),
            key="agenda_oficial_fuente",
        )
        if fuente_off != "Todas":
            df_oficial = df_oficial[df_oficial["fuente"] == fuente_off]
        for _, row in df_oficial.iterrows():
            st.markdown(
                f"""
                <div class="noticia-card noticia-neu">
                    <div style="font-weight:600;color:{TEXT};font-size:.88rem">{row.get('titulo','')}</div>
                    <div style="font-size:.74rem;color:{MUTED};margin-top:.2rem">{row.get('fuente','')} · {row.get('fecha','')}</div>
                    <div style="font-size:.8rem;color:{TEXT};margin-top:.35rem;line-height:1.45">
                        {row.get('cita','')}
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

# ── Tab 2: Sentimiento ────────────────────────────────────────────────────────
with tab_sentimiento:
    st.markdown('<div class="section-title">Evolución del Sentimiento (Serie Temporal)</div>', unsafe_allow_html=True)

    partidos_disponibles = df_sent_all["entidad"].tolist() if not df_sent_all.empty else ["PP", "PSOE", "VOX", "SUMAR"]
    sel_partidos = st.multiselect(
        "Partidos a comparar",
        partidos_disponibles,
        default=partidos_disponibles[:4],
    )

    if sel_partidos:
        fig_ts = go.Figure()
        palette = [BLUE, RED, AMBER, GREEN, "#8B5CF6", "#F97316", "#EC4899"]
        for i, partido in enumerate(sel_partidos):
            df_s = cargar_sentimiento_partido(partido, dias_sent)
            if df_s.empty:
                continue
            color = palette[i % len(palette)]
            fig_ts.add_trace(go.Scatter(
                x=list(df_s["fecha"]) + list(df_s["fecha"])[::-1],
                y=list((df_s["pct_positivo"] - 50).fillna(0) / 100) +
                  list(-(df_s["pct_negativo"] - 50).fillna(0)[::-1] / 100),
                fill="toself",
                fillcolor=_hex_to_rgba(color, 0.15),
                line=dict(color="rgba(0,0,0,0)"),
                showlegend=False, hoverinfo="skip",
            ))
            fig_ts.add_trace(go.Scatter(
                x=df_s["fecha"], y=df_s["sentimiento_medio"],
                name=partido, mode="lines+markers",
                line=dict(color=color, width=2.5),
                marker=dict(size=5),
            ))
        fig_ts.add_hline(y=0, line_dash="dot", line_color=MUTED, line_width=1)
        fig_ts.update_layout(
            height=400, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            xaxis=dict(showgrid=False, title=None),
            yaxis=dict(title="Sentimiento medio", gridcolor=BORD, zeroline=True, zerolinecolor=MUTED),
            hovermode="x unified",
            legend=dict(orientation="h", y=1.05, bgcolor="rgba(0,0,0,0)"),
            margin=dict(t=30, b=20),
        )
        st.plotly_chart(fig_ts, use_container_width=True)
    else:
        st.info("Selecciona al menos un partido para visualizar la evolución temporal.")

# ── Tab 3: Feed de noticias ───────────────────────────────────────────────────
with tab_noticias:
    st.markdown('<div class="section-title">Feed de Noticias Recientes</div>', unsafe_allow_html=True)

    col_filtros = st.columns(3)
    with col_filtros[0]:
        fuentes_disp = df_noticias["fuente"].unique().tolist() if not df_noticias.empty else []
        fuente_sel = st.multiselect("Filtrar por fuente", fuentes_disp, default=fuentes_disp[:3])
    with col_filtros[1]:
        sent_filtro = st.selectbox("Sentimiento", ["Todos", "positivo", "negativo", "neutro"])
    with col_filtros[2]:
        n_mostrar = st.slider("Numero de noticias", 5, 50, 20)

    if not df_noticias.empty:
        df_feed = df_noticias.copy()
        if fuente_sel:
            df_feed = df_feed[df_feed["fuente"].isin(fuente_sel)]
        if sent_filtro != "Todos":
            df_feed = df_feed[df_feed["sentimiento_label"] == sent_filtro]
        df_feed = df_feed.head(n_mostrar)

        for _, row in df_feed.iterrows():
            sent = row.get("sentimiento_label", "neutro")
            css_cls = f"noticia-{sent}"
            sent_color = GREEN if sent == "positivo" else RED if sent == "negativo" else MUTED
            sent_score = float(row.get("sentimiento_score") or 0)
            partidos = row.get("partidos_mencionados", "") or ""
            temas_raw = row.get("temas_json", "[]") or "[]"
            try:
                temas = json.loads(temas_raw) if isinstance(temas_raw, str) else temas_raw
            except Exception:
                temas = []

            partidos_html = "".join(
                f'<span class="badge" style="background:{PALE};color:{NAVY};margin-right:3px">{p.strip()}</span>'
                for p in partidos.split(",") if p.strip()
            )
            temas_html = "".join(
                f'<span class="badge" style="background:#F0FDF4;color:#166534;margin-right:3px">{t}</span>'
                for t in temas[:3]
            )

            st.markdown(f"""
            <div class="noticia-card {css_cls}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="flex:1">
                        <a href="{row.get('url','#')}" target="_blank"
                           style="font-weight:600;color:{TEXT};text-decoration:none;font-size:.9rem">
                            {row.get('titular','')[:100]}
                        </a>
                        <div style="margin-top:.3rem;font-size:.75rem;color:{MUTED}">
                            {row.get('fuente','—')} · {str(row.get('fecha_publicacion',''))[:10]}
                            &nbsp; {partidos_html} {temas_html}
                        </div>
                    </div>
                    <div style="margin-left:1rem;text-align:right;min-width:4rem">
                        <div style="font-size:1rem;font-weight:700;color:{sent_color}">{sent_score:+.2f}</div>
                        <div style="font-size:.68rem;color:{MUTED}">{sent}</div>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("Sin noticias. Ejecuta: `python -m etl.sources.rss_noticias`")

# ── Tab 4: Bulos y Desinformación ─────────────────────────────────────────────
with tab_bulos:
    bulos_fuente = cargar_bulos_newtral(limit=18)
    bulos_data = bulos_fuente if bulos_fuente else BULOS_RECIENTES
    st.markdown(f"""
    <div style="background:{SURF};border:1px solid {BORD};border-radius:10px;padding:1rem 1.2rem;margin-bottom:1.2rem">
        <div style="font-weight:700;font-size:.95rem;color:{TEXT}">Monitor de Desinformación — Abril 2026</div>
        <div style="font-size:.82rem;color:{MUTED};margin-top:.3rem">
            Seguimiento de bulos verificados por Newtral, Maldita.es, EFE Verifica y AFP Factual.
            Datos sintéticos representativos del ecosistema de desinformación político español.
        </div>
    </div>
    """, unsafe_allow_html=True)

    # KPIs bulos
    total_bulos = len(bulos_data)
    falsos = sum(1 for b in bulos_data if b["veredicto"] == "FALSO")
    enganosos = sum(1 for b in bulos_data if b["veredicto"] == "ENGAÑOSO")
    sin_ver = sum(1 for b in bulos_data if b["veredicto"] == "SIN VERIFICAR")
    sin_aval = sum(1 for b in bulos_data if b["veredicto"] == "SIN AVAL CIENTÍFICO")

    kcol1, kcol2, kcol3, kcol4, kcol5 = st.columns(5)
    with kcol1:
        st.metric("Total bulos (30 dias)", total_bulos)
    with kcol2:
        st.metric("FALSO", falsos)
    with kcol3:
        st.metric("ENGAÑOSO", enganosos)
    with kcol4:
        st.metric("SIN VERIFICAR", sin_ver)
    with kcol5:
        st.metric("SIN AVAL CIENTÍFICO", sin_aval)

    st.divider()

    # Gráficos de análisis
    col_bar_b, col_pie_b = st.columns(2)

    with col_bar_b:
        st.markdown('<div class="section-title">Bulos por Partido Implicado</div>', unsafe_allow_html=True)
        conteo_partidos: dict[str, int] = {}
        for b in bulos_data:
            for p in b["partidos_implicados"]:
                conteo_partidos[p] = conteo_partidos.get(p, 0) + 1
        partidos_ord = sorted(conteo_partidos.items(), key=lambda x: x[1], reverse=True)
        PARTY_COL = {"PP": "#0057A8", "PSOE": "#E4000F", "VOX": "#63BE21", "SUMAR": "#E91E8C"}
        fig_bulos_bar = go.Figure(go.Bar(
            x=[x[0] for x in partidos_ord],
            y=[x[1] for x in partidos_ord],
            marker_color=[PARTY_COL.get(x[0], MUTED) for x in partidos_ord],
            text=[x[1] for x in partidos_ord],
            textposition="outside",
        ))
        fig_bulos_bar.update_layout(
            height=300, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            xaxis=dict(title=None),
            yaxis=dict(title="Numero de bulos implicados", gridcolor=BORD),
            margin=dict(t=10, b=10),
            showlegend=False,
        )
        st.plotly_chart(fig_bulos_bar, use_container_width=True)

    with col_pie_b:
        st.markdown('<div class="section-title">Distribución por Veredicto</div>', unsafe_allow_html=True)
        ver_labels = ["FALSO", "ENGAÑOSO", "SIN VERIFICAR", "SIN AVAL CIENTÍFICO"]
        ver_values = [falsos, enganosos, sin_ver, sin_aval]
        ver_colors = [RED, ORANGE, YELLOW, PURPLE]
        fig_pie_ver = go.Figure(go.Pie(
            labels=ver_labels,
            values=ver_values,
            marker_colors=ver_colors,
            hole=0.45,
            textinfo="label+percent",
            textfont=dict(size=11),
        ))
        fig_pie_ver.update_layout(
            height=300, paper_bgcolor=WHITE,
            margin=dict(t=10, b=10, l=10, r=10),
            showlegend=False,
            annotations=[dict(text="Veredictos", x=0.5, y=0.5, font_size=11, showarrow=False, font_color=MUTED)],
        )
        st.plotly_chart(fig_pie_ver, use_container_width=True)

    # Timeline visual de bulos
    st.markdown('<div class="section-title">Línea Temporal de Bulos — Abril 2026</div>', unsafe_allow_html=True)

    timeline_fechas = [b["fecha"] for b in bulos_data]
    timeline_titulares = [b["titular_bulo"][:60] + "..." if len(b["titular_bulo"]) > 60 else b["titular_bulo"] for b in bulos_data]
    timeline_veredictos = [b["veredicto"] for b in bulos_data]
    timeline_colors = [VEREDICTO_COLORS.get(v, MUTED) for v in timeline_veredictos]

    fig_timeline = go.Figure()
    for i, bulo in enumerate(bulos_data):
        fig_timeline.add_trace(go.Scatter(
            x=[bulo["fecha"]],
            y=[i],
            mode="markers+text",
            marker=dict(
                size=18,
                color=VEREDICTO_COLORS.get(bulo["veredicto"], MUTED),
                line=dict(color=WHITE, width=2),
            ),
            text=[bulo["veredicto"]],
            textposition="middle right",
            textfont=dict(size=9, color=TEXT),
            hovertemplate=(
                f"<b>{bulo['fecha']}</b><br>"
                f"{bulo['titular_bulo'][:80]}<br>"
                f"Veredicto: <b>{bulo['veredicto']}</b><br>"
                f"Impacto: {bulo['impacto']}<br>"
                f"Fuente: {bulo['fuente_verificacion']}"
                "<extra></extra>"
            ),
            name=bulo["veredicto"],
            showlegend=False,
        ))
    fig_timeline.update_layout(
        height=320, paper_bgcolor=WHITE, plot_bgcolor=SURF,
        xaxis=dict(title=None, showgrid=False, tickfont=dict(size=9)),
        yaxis=dict(
            tickvals=list(range(len(bulos_data))),
            ticktext=[t[:45] + "..." if len(t) > 45 else t for t in timeline_titulares],
            tickfont=dict(size=9),
            title=None,
        ),
        margin=dict(t=10, b=10, l=280, r=20),
        showlegend=False,
    )
    st.plotly_chart(fig_timeline, use_container_width=True)

    # Feed detallado de bulos
    st.markdown('<div class="section-title">Detalle de Bulos Verificados</div>', unsafe_allow_html=True)

    # Filtro por veredicto
    veredictos_disp = ["Todos", "FALSO", "ENGAÑOSO", "SIN VERIFICAR", "SIN AVAL CIENTÍFICO"]
    filtro_ver = st.selectbox("Filtrar por veredicto", veredictos_disp, key="filtro_veredicto")

    bulos_mostrar = bulos_data if filtro_ver == "Todos" else [
        b for b in bulos_data if b["veredicto"] == filtro_ver
    ]

    for bulo in bulos_mostrar:
        ver_color = VEREDICTO_COLORS.get(bulo["veredicto"], MUTED)
        ver_text = VEREDICTO_TEXT_COLORS.get(bulo["veredicto"], WHITE)
        partidos_html = "".join(
            f'<span class="badge" style="background:{PALE};color:{NAVY};margin-right:3px">{p}</span>'
            for p in bulo["partidos_implicados"]
        )
        st.markdown(f"""
        <div class="bulo-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
                <div style="flex:1">
                    <div style="font-weight:700;font-size:.92rem;color:{TEXT};margin-bottom:.3rem">
                        {bulo['titular_bulo']}
                    </div>
                    <div style="font-size:.75rem;color:{MUTED}">
                        {bulo['fecha']} &nbsp;&bull;&nbsp; Origen: {bulo['fuente_origen']}
                        &nbsp;&bull;&nbsp; {partidos_html}
                    </div>
                </div>
                <div style="margin-left:1rem;flex-shrink:0">
                    <span class="badge" style="background:{ver_color};color:{ver_text};font-size:.75rem;padding:.25rem .7rem">
                        {bulo['veredicto']}
                    </span>
                </div>
            </div>
            <div style="font-size:.82rem;color:{TEXT};background:{SURF};border-radius:6px;padding:.6rem .8rem;margin-bottom:.4rem;line-height:1.5">
                {bulo['explicacion']}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.75rem;color:{MUTED}">
                <span>Impacto: <b style="color:{TEXT}">{bulo['impacto']}</b></span>
                <span>Verificado por: <b style="color:{BLUE}">{bulo['fuente_verificacion']}</b></span>
            </div>
        </div>
        """, unsafe_allow_html=True)
        if bulo.get("url"):
            st.markdown(f"[Ver fuente]({bulo['url']})")

st.caption("Fuentes monitorizadas: El Pais, El Mundo, ABC, RTVE, La Vanguardia, El Confidencial, elDiario.es, Expansion, Cinco Dias, El Economista, InfoLibre + mas. Actualizacion cada hora. Bulos: Newtral, Maldita.es, EFE Verifica, AFP Factual.")
