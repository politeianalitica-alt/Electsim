"""
Página: Prensa & Agenda Mediática
Análisis en tiempo real de la cobertura mediática española.
"""
from __future__ import annotations

from collections import Counter
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
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import (
    cargar_agenda_hoy,
    cargar_agenda_historica,
    cargar_noticias_recientes,
    cargar_sentimiento_partido,
    cargar_sentimiento_todos_partidos,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

ORANGE = "#F97316"
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
    "PSOE":    ["psoe", "sanchez", "pedro sanchez", "socialista"],
    "PP":      ["pp", "feijoo", "feijóo", "partido popular"],
    "VOX":     ["vox", "abascal"],
    "SUMAR":   ["sumar", "yolanda diaz", "yolanda díaz"],
    "PODEMOS": ["podemos", "irene montero", "pablo iglesias"],
    "JUNTS":   ["junts", "puigdemont"],
    "ERC":     ["erc", "esquerra"],
}

TOPIC_CANON = {
    "vivienda": ["vivienda", "alquiler", "hipoteca", "okupa", "desahuc"],
    "terrorismo": ["terrorismo", "terrorista", "atentado", "ihad", "eta"],
    "sanidad": ["sanidad", "hospital", "médic", "lista de espera", "atención primaria"],
    "politica": ["gobierno", "congreso", "senado", "presidente", "ministro", "partido"],
    "instituciones": ["tribunal", "fiscalía", "tc", "boe", "cgpj", "instituci"],
    "economia": ["ipc", "inflación", "pib", "deuda", "euribor", "paro", "salario"],
    "inmigracion": ["inmigración", "migrante", "frontera", "asilo"],
    "energia": ["energía", "eléctrica", "luz", "gas", "renovable"],
    "empleo": ["empleo", "paro", "laboral", "trabajo"],
    "educacion": ["educación", "colegio", "universidad", "beca", "fp"],
}


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    h = (hex_color or "").lstrip("#")
    if len(h) != 6:
        return f"rgba(0,212,255,{alpha})"
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"


def sec_hdr(title: str, color: str = CYAN) -> None:
    """Encabezado de sección dark/tech."""
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:.8rem;margin:1.5rem 0 .8rem">'
        f'<div style="width:4px;height:16px;background:{color};border-radius:2px"></div>'
        f'<div style="font-size:.68rem;font-weight:700;letter-spacing:.12em;color:{MUTED};text-transform:uppercase">{title}</div>'
        f'<div style="flex:1;height:1px;background:{BORDER}"></div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def _theme_party_impact(df_noticias: pd.DataFrame, tema: str) -> pd.DataFrame:
    if df_noticias.empty:
        return pd.DataFrame(columns=["partido", "n", "sent_medio"])
    dfx = df_noticias.copy()
    dfx["categoria"] = dfx.get("categoria", "").fillna("").astype(str)
    dfx = dfx[dfx["categoria"].str.lower() == str(tema).lower()]
    if dfx.empty:
        return pd.DataFrame(columns=["partido", "n", "sent_medio"])
    rows: list[dict[str, object]] = []
    for _, r in dfx.iterrows():
        partidos_raw = str(r.get("partidos_mencionados") or "")
        parties = [p.strip() for p in partidos_raw.split(",") if p.strip()]
        if not parties:
            continue
        sent = float(pd.to_numeric(r.get("sentimiento_score"), errors="coerce") or 0.0)
        for p in parties:
            rows.append({"partido": p, "sent": sent})
    if not rows:
        return pd.DataFrame(columns=["partido", "n", "sent_medio"])
    dfr = pd.DataFrame(rows)
    out = (
        dfr.groupby("partido", as_index=False)
        .agg(n=("sent", "count"), sent_medio=("sent", "mean"))
        .sort_values(["n", "sent_medio"], ascending=[False, False])
        .head(10)
    )
    return out


def _theme_narratives(df_noticias: pd.DataFrame, tema: str, topn: int = 6) -> list[str]:
    if df_noticias.empty:
        return []
    dfx = df_noticias.copy()
    dfx["categoria"] = dfx.get("categoria", "").fillna("").astype(str)
    dfx = dfx[dfx["categoria"].str.lower() == str(tema).lower()]
    if dfx.empty:
        return []
    text_blob = " ".join(
        [
            f"{str(r.get('titular') or '')} {str(r.get('resumen') or '')}"
            for _, r in dfx.head(300).iterrows()
        ]
    ).lower()
    tokens = re.findall(r"[a-záéíóúñ]{4,}", text_blob)
    stop = {
        "para", "desde", "sobre", "entre", "tras", "ante", "esta", "este", "estos", "estas",
        "como", "pero", "porque", "donde", "cuando", "tambien", "segun", "sobre", "gobierno",
        "partido", "partidos", "espana", "españa", "dice", "hace", "hoy", "ayer", "toda", "todas",
        "todos", "cada", "solo", "sido", "será", "seran", "puede", "pueden", "tiene", "tienen",
    }
    freq = Counter(t for t in tokens if t not in stop)
    return [w for w, _ in freq.most_common(topn)]


def _canon_topic(raw_topic: str, text_hint: str = "") -> str:
    rt = (raw_topic or "").strip().lower()
    if rt in TOPIC_CANON:
        return rt
    base = f"{rt} {text_hint.lower()}".strip()
    for canon, kws in TOPIC_CANON.items():
        if any(k in base for k in kws):
            return canon
    return "politica" if rt in {"general", "generalista", ""} else rt


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
        "url": "",
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
        "url": "",
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
        "url": "",
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
        "url": "",
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
        "url": "",
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
        "url": "",
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
        "url": "",
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
        "url": "",
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


def cargar_bulos_desde_noticias(df_noticias: pd.DataFrame, limit: int = 20) -> list[dict]:
    if df_noticias.empty:
        return []
    out: list[dict] = []
    for _, row in df_noticias.head(300).iterrows():
        titular = str(row.get("titular", "")).strip()
        if not titular:
            continue
        txt = titular.lower()
        if not any(k in txt for k in ["bulo", "falso", "desinform", "engaños", "manipul"]):
            continue
        partidos = []
        try:
            partidos = [p.strip() for p in str(row.get("partidos_mencionados", "")).split(",") if p.strip()]
        except Exception:
            partidos = []
        out.append({
            "fecha": str(row.get("fecha_publicacion", ""))[:16] or "reciente",
            "titular_bulo": titular[:300],
            "veredicto": "SIN VERIFICAR",
            "partidos_implicados": partidos or ["SIN CLASIFICAR"],
            "fuente_origen": str(row.get("fuente", "prensa")).strip(),
            "explicacion": "Detección preliminar desde prensa monitorizada. Requiere validación de fact-check.",
            "impacto": "Pendiente",
            "fuente_verificacion": "Pendiente",
            "url": str(row.get("url", "")).strip(),
        })
        if len(out) >= limit:
            break
    dedup = {}
    for it in out:
        dedup[it["titular_bulo"]] = it
    return list(dedup.values())[:limit]


VEREDICTO_COLORS = {
    "FALSO":             RED,
    "ENGAÑOSO":          ORANGE,
    "SIN VERIFICAR":     YELLOW,
    "SIN AVAL CIENTÍFICO": PURPLE,
}

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Prensa & Agenda — ElectSim", layout="wide")
sidebar_nav()

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(16px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:1; transform:scale(1); }}
    50%     {{ opacity:.5; transform:scale(.8); }}
}}

/* ── Noticia card ─────────────────────────────── */
.news-card {{
    background:{BG2};
    border:1px solid {BORDER};
    border-left:3px solid {CYAN};
    border-radius:8px;
    padding:.8rem 1rem;
    margin-bottom:.5rem;
    animation:fadeInUp .35s ease both;
    transition:border-color .2s ease,box-shadow .2s ease;
}}
.news-card:hover {{ box-shadow:0 0 14px rgba(0,212,255,0.08); }}
.news-pos {{ border-left-color:{GREEN} !important; }}
.news-neg {{ border-left-color:{RED} !important; }}
.news-neu {{ border-left-color:{BORDER} !important; }}

/* ── Bulo card ────────────────────────────────── */
.bulo-card {{
    background:{BG2};
    border:1px solid {BORDER};
    border-radius:10px;
    padding:1rem 1.2rem;
    margin-bottom:.7rem;
    animation:fadeInUp .35s ease both;
}}

/* ── Badge ────────────────────────────────────── */
.badge {{
    display:inline-block;
    padding:.15rem .5rem;
    border-radius:4px;
    font-size:.7rem;
    font-weight:600;
    letter-spacing:.04em;
}}

/* ── Info banner ──────────────────────────────── */
.info-banner {{
    background:{BG2};
    border:1px solid {BORDER};
    border-radius:10px;
    padding:1rem 1.2rem;
    margin-bottom:1.2rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Header animado ────────────────────────────────────────────────────────────
st.markdown(
    f'<div style="position:relative;overflow:hidden;background:{BG2};border:1px solid {BORDER};'
    f'border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.5rem;animation:fadeInUp .5s ease both">'
    f'<div style="position:absolute;top:-40px;right:-40px;width:220px;height:220px;border-radius:50%;'
    f'background:radial-gradient(circle,rgba(0,212,255,0.10) 0%,transparent 70%);pointer-events:none"></div>'
    f'<div style="position:absolute;bottom:-50px;left:25%;width:160px;height:160px;border-radius:50%;'
    f'background:radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%);pointer-events:none"></div>'
    f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">'
    f'<div style="width:8px;height:8px;border-radius:50%;background:{CYAN};'
    f'animation:dotPulse 2s ease-in-out infinite;box-shadow:0 0 8px {CYAN}"></div>'
    f'<span style="font-size:.65rem;font-weight:700;letter-spacing:.16em;color:{CYAN};text-transform:uppercase">MONITORIZACIÓN ACTIVA</span>'
    f'</div>'
    f'<h1 style="font-size:1.7rem;font-weight:800;color:{TEXT};margin:0 0 .3rem;letter-spacing:-.02em">Prensa & Agenda Mediática</h1>'
    f'<p style="color:{TEXT2};font-size:.88rem;margin:0">Análisis de sentimiento · verificación de bulos · 12 medios españoles monitorizados · actualización cada hora</p>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── Sidebar controles ─────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(
        f'<div style="font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};'
        f'text-transform:uppercase;padding:.6rem .5rem .3rem">Filtros</div>',
        unsafe_allow_html=True,
    )
    dias_noticias = st.slider("Ventana noticias (días)", 1, 30, 7)
    dias_sent     = st.slider("Ventana sentimiento (días)", 7, 90, 30)

# ── KPIs ──────────────────────────────────────────────────────────────────────
df_noticias  = cargar_noticias_recientes(dias=dias_noticias, limit=100)
df_agenda    = cargar_agenda_hoy()
df_sent_all  = cargar_sentimiento_todos_partidos(dias=dias_noticias)

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Noticias analizadas", len(df_noticias) if not df_noticias.empty else 0,
              help=f"Últimos {dias_noticias} días")
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

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_agenda_t, tab_sentimiento, tab_noticias, tab_bulos = st.tabs([
    "◈  Agenda & Mapa",
    "◉  Sentimiento",
    "◎  Feed Noticias",
    "⬡  Bulos & Desinformación",
])

# ── Tab 1: Agenda & Mapa ──────────────────────────────────────────────────────
with tab_agenda_t:
    col_agenda, col_sent_partidos = st.columns([1.2, 1])

    with col_agenda:
        sec_hdr("Mapa de Agenda — Hoy")
        df_agenda_view = df_agenda.copy()
        if not df_agenda_view.empty:
            df_agenda_view["tema"] = df_agenda_view["tema"].astype(str).apply(_canon_topic)
            df_agenda_view = (
                df_agenda_view.groupby("tema", as_index=False)
                .agg(
                    n_noticias=("n_noticias", "sum"),
                    sentimiento_medio=("sentimiento_medio", "mean"),
                    peso_agenda=("peso_agenda", "sum"),
                    tendencia=("tendencia", "first"),
                )
                .sort_values("n_noticias", ascending=False)
            )
        if df_agenda_view.empty and not df_noticias.empty:
            # Fallback in-memory cuando agenda_mediatica no está cargada en la fecha actual.
            try:
                tmp = df_noticias.copy()
                tmp["tema"] = tmp.get("categoria", "general").fillna("general").astype(str).str.strip()
                tmp["tema"] = tmp.apply(
                    lambda r: _canon_topic(
                        str(r.get("tema", "")),
                        f"{str(r.get('titular',''))} {str(r.get('resumen',''))}",
                    ),
                    axis=1,
                )
                tmp["sentimiento_score"] = pd.to_numeric(tmp.get("sentimiento_score"), errors="coerce").fillna(0.0)
                df_agenda_view = (
                    tmp.groupby("tema", as_index=False)
                    .agg(
                        n_noticias=("titular", "count"),
                        sentimiento_medio=("sentimiento_score", "mean"),
                    )
                    .sort_values("n_noticias", ascending=False)
                    .head(25)
                )
                total_n = max(float(df_agenda_view["n_noticias"].sum()), 1.0)
                df_agenda_view["peso_agenda"] = df_agenda_view["n_noticias"].astype(float) / total_n
                df_agenda_view["tendencia"] = "estable"
            except Exception:
                df_agenda_view = pd.DataFrame()

        selected_theme = None
        if not df_agenda_view.empty:
            df_agenda_view["color"] = df_agenda_view["sentimiento_medio"].apply(
                lambda s: "positivo" if (s or 0) > 0.1 else "negativo" if (s or 0) < -0.1 else "neutro"
            )
            fig_tree = px.treemap(
                df_agenda_view,
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
                height=380,
                paper_bgcolor="rgba(0,0,0,0)",
                margin=dict(t=0, b=0, l=0, r=0),
                coloraxis_colorbar=dict(title="Sent.", tickfont=dict(size=9, color=TEXT2)),
            )
            selection = st.plotly_chart(
                fig_tree,
                use_container_width=True,
                key="agenda_treemap",
                on_select="rerun",
            )
            try:
                points = (selection or {}).get("selection", {}).get("points", [])
                if points:
                    selected_theme = str(points[0].get("label") or "").strip() or None
            except Exception:
                selected_theme = None
        else:
            st.info("Sin datos de agenda para la ventana actual. Ejecuta actualización ETL de prensa/agenda.")

    with col_sent_partidos:
        temas_options = df_agenda_view["tema"].astype(str).dropna().tolist() if not df_agenda_view.empty else []
        if temas_options:
            if selected_theme and selected_theme in temas_options:
                st.session_state["tema_agenda_activo"] = selected_theme
            tema_default = st.session_state.get("tema_agenda_activo", temas_options[0])
            if tema_default not in temas_options:
                tema_default = temas_options[0]
            tema_activo = st.selectbox("Tema activo (mapa)", temas_options, index=temas_options.index(tema_default), key="tema_agenda_activo_select")
            st.session_state["tema_agenda_activo"] = tema_activo

            sec_hdr(f"Impacto por Partido — {tema_activo}")
            df_impact = _theme_party_impact(df_noticias, tema_activo)
            if not df_impact.empty:
                colors = [GREEN if float(v) > 0.05 else RED if float(v) < -0.05 else AMBER for v in df_impact["sent_medio"]]
                fig_imp = go.Figure(go.Bar(
                    x=df_impact["sent_medio"].round(3),
                    y=df_impact["partido"],
                    orientation="h",
                    marker_color=colors,
                    text=[f"{x:+.2f} · n={int(n)}" for x, n in zip(df_impact["sent_medio"], df_impact["n"])],
                    textposition="outside",
                    textfont=dict(color=TEXT2, size=10),
                ))
                fig_imp.update_layout(
                    xaxis=dict(
                        title="Sentimiento medio por partido en este tema",
                        range=[-1, 1],
                        zeroline=True, zerolinecolor=MUTED, zerolinewidth=1,
                        gridcolor=BORDER,
                        tickfont=dict(color=TEXT2, size=9),
                        titlefont=dict(color=MUTED, size=10),
                    ),
                    yaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
                    height=300,
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    margin=dict(t=10, b=10, l=10, r=80),
                    showlegend=False,
                )
                fig_imp.add_vline(x=0, line_color=MUTED, line_width=1)
                st.plotly_chart(fig_imp, use_container_width=True)
            else:
                st.info("Sin suficiente señal de partidos en este tema.")

            sec_hdr("Narrativas y Debates")
            narr = _theme_narratives(df_noticias, tema_activo, topn=8)
            if narr:
                st.markdown(
                    "".join(
                        [
                            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:4px">{t}</span>'
                            for t in narr
                        ]
                    ),
                    unsafe_allow_html=True,
                )
            else:
                st.info("Sin narrativas claras para este tema en la ventana actual.")
        else:
            st.info("Sin temas disponibles para analizar en el mapa.")

    # Agenda histórica heatmap
    sec_hdr("Evolución de la Agenda — Últimos 30 Días", BLUE)
    df_agenda_hist = cargar_agenda_historica(dias=30, top_temas=12)
    if not df_agenda_hist.empty:
        df_pivot = df_agenda_hist.pivot_table(
            index="tema", columns="fecha", values="n_noticias", fill_value=0
        )
        fig_heat = go.Figure(go.Heatmap(
            z=df_pivot.values,
            x=[str(c)[:10] for c in df_pivot.columns],
            y=df_pivot.index.tolist(),
            colorscale=[
                [0.0, BG3],
                [0.3, "rgba(0,212,255,0.25)"],
                [0.7, "rgba(0,212,255,0.65)"],
                [1.0, CYAN],
            ],
            hoverongaps=False,
            hovertemplate="<b>%{y}</b><br>%{x}<br>Noticias: %{z}<extra></extra>",
        ))
        fig_heat.update_layout(
            height=360,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(tickfont=dict(size=9, color=TEXT2), title=None),
            yaxis=dict(tickfont=dict(size=11, color=TEXT2), title=None),
            margin=dict(t=10, b=10, l=120, r=10),
        )
        st.plotly_chart(fig_heat, use_container_width=True)
    else:
        st.info("Sin datos de agenda histórica aún.")

    sec_hdr("Agenda Oficial — Próximos Eventos", PURPLE)
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
            card = (
                f'<div class="news-card news-neu">'
                f'<div style="font-weight:600;color:{TEXT};font-size:.88rem">{row.get("titulo", "")}</div>'
                f'<div style="font-size:.74rem;color:{MUTED};margin-top:.2rem">{row.get("fuente", "")} · {row.get("fecha", "")}</div>'
                f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.35rem;line-height:1.45">{row.get("cita", "")}</div>'
                f'</div>'
            )
            st.markdown(card, unsafe_allow_html=True)

# ── Tab 2: Sentimiento ────────────────────────────────────────────────────────
with tab_sentimiento:
    sec_hdr("Evolución del Sentimiento — Serie Temporal")

    partidos_disponibles = (
        df_sent_all["entidad"].tolist() if not df_sent_all.empty
        else ["PP", "PSOE", "VOX", "SUMAR"]
    )
    sel_partidos = st.multiselect(
        "Partidos a comparar",
        partidos_disponibles,
        default=partidos_disponibles[:4],
    )

    if sel_partidos:
        fig_ts = go.Figure()
        palette = [CYAN, RED, AMBER, GREEN, PURPLE, ORANGE, "#EC4899"]
        for i, partido in enumerate(sel_partidos):
            df_s = cargar_sentimiento_partido(partido, dias_sent)
            if df_s.empty:
                continue
            color = palette[i % len(palette)]
            fig_ts.add_trace(go.Scatter(
                x=list(df_s["fecha"]) + list(df_s["fecha"])[::-1],
                y=(list((df_s["pct_positivo"] - 50).fillna(0) / 100) +
                   list(-(df_s["pct_negativo"] - 50).fillna(0)[::-1] / 100)),
                fill="toself",
                fillcolor=_hex_to_rgba(color, 0.10),
                line=dict(color="rgba(0,0,0,0)"),
                showlegend=False,
                hoverinfo="skip",
            ))
            fig_ts.add_trace(go.Scatter(
                x=df_s["fecha"],
                y=df_s["sentimiento_medio"],
                name=partido,
                mode="lines+markers",
                line=dict(color=color, width=2.5),
                marker=dict(size=5, color=color),
            ))
        fig_ts.add_hline(y=0, line_dash="dot", line_color=MUTED, line_width=1)
        fig_ts.update_layout(
            height=420,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False, title=None, tickfont=dict(color=TEXT2, size=9)),
            yaxis=dict(
                title="Sentimiento medio",
                gridcolor=BORDER,
                zeroline=True,
                zerolinecolor=MUTED,
                tickfont=dict(color=TEXT2, size=9),
                titlefont=dict(color=MUTED, size=10),
            ),
            hovermode="x unified",
            legend=dict(
                orientation="h", y=1.05,
                bgcolor="rgba(0,0,0,0)",
                font=dict(color=TEXT2, size=10),
            ),
            margin=dict(t=30, b=20),
        )
        st.plotly_chart(fig_ts, use_container_width=True)
    else:
        st.info("Selecciona al menos un partido para visualizar la evolución temporal.")

# ── Tab 3: Feed de Noticias ───────────────────────────────────────────────────
with tab_noticias:
    sec_hdr("Feed de Noticias Recientes")

    col_filtros = st.columns(3)
    with col_filtros[0]:
        fuentes_disp = df_noticias["fuente"].unique().tolist() if not df_noticias.empty else []
        fuente_sel   = st.multiselect("Filtrar por fuente", fuentes_disp, default=fuentes_disp[:3])
    with col_filtros[1]:
        sent_filtro = st.selectbox("Sentimiento", ["Todos", "positivo", "negativo", "neutro"])
    with col_filtros[2]:
        n_mostrar = st.slider("Nº de noticias", 5, 50, 20)

    if not df_noticias.empty:
        df_feed = df_noticias.copy()
        if fuente_sel:
            df_feed = df_feed[df_feed["fuente"].isin(fuente_sel)]
        if sent_filtro != "Todos":
            df_feed = df_feed[df_feed["sentimiento_label"] == sent_filtro]
        df_feed = df_feed.head(n_mostrar)

        for _, row in df_feed.iterrows():
            sent       = row.get("sentimiento_label", "neutro")
            sent_color = GREEN if sent == "positivo" else RED if sent == "negativo" else MUTED
            sent_score = float(row.get("sentimiento_score") or 0)
            partidos   = row.get("partidos_mencionados", "") or ""
            temas_raw  = row.get("temas_json", "[]") or "[]"
            try:
                temas = json.loads(temas_raw) if isinstance(temas_raw, str) else temas_raw
            except Exception:
                temas = []

            partidos_html = "".join(
                f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p.strip()}</span>'
                for p in partidos.split(",") if p.strip()
            )
            temas_html = "".join(
                f'<span class="badge" style="background:rgba(0,212,255,0.08);color:{CYAN};border:1px solid rgba(0,212,255,0.2);margin-right:3px">{t}</span>'
                for t in temas[:3]
            )
            css_cls = "news-pos" if sent == "positivo" else "news-neg" if sent == "negativo" else "news-neu"
            card = (
                f'<div class="news-card {css_cls}">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
                f'<div style="flex:1">'
                f'<a href="{row.get("url","#")}" target="_blank" style="font-weight:600;color:{TEXT};text-decoration:none;font-size:.9rem">{str(row.get("titular",""))[:100]}</a>'
                f'<div style="margin-top:.3rem;font-size:.75rem;color:{MUTED}">{row.get("fuente","—")} · {str(row.get("fecha_publicacion",""))[:10]} &nbsp; {partidos_html} {temas_html}</div>'
                f'</div>'
                f'<div style="margin-left:1rem;text-align:right;min-width:4rem">'
                f'<div style="font-size:1rem;font-weight:700;color:{sent_color};font-family:JetBrains Mono,monospace">{sent_score:+.2f}</div>'
                f'<div style="font-size:.68rem;color:{MUTED}">{sent}</div>'
                f'</div>'
                f'</div>'
                f'</div>'
            )
            st.markdown(card, unsafe_allow_html=True)
    else:
        st.info("Sin noticias. Ejecuta: `python -m etl.sources.rss_noticias`")

# ── Tab 4: Bulos y Desinformación ─────────────────────────────────────────────
with tab_bulos:
    bulos_fuente = cargar_bulos_newtral(limit=18)
    bulos_data = bulos_fuente if bulos_fuente else cargar_bulos_desde_noticias(df_noticias, limit=18)
    if not bulos_data:
        bulos_data = BULOS_RECIENTES[:18]

    st.markdown(
        f'<div class="info-banner">'
        f'<div style="font-weight:700;font-size:.95rem;color:{TEXT}">Monitor de Desinformación — Abril 2026</div>'
        f'<div style="font-size:.82rem;color:{TEXT2};margin-top:.3rem">Seguimiento de bulos verificados por Newtral/Maldita/EFE y detección preliminar desde prensa monitorizada. Sin datos sintéticos.</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if not bulos_data:
        st.info("No se detectaron bulos en las fuentes verificadas ni en la prensa ingestada para esta ventana temporal.")

    # KPIs bulos
    total_bulos = len(bulos_data)
    falsos      = sum(1 for b in bulos_data if b["veredicto"] == "FALSO")
    enganosos   = sum(1 for b in bulos_data if b["veredicto"] == "ENGAÑOSO")
    sin_ver     = sum(1 for b in bulos_data if b["veredicto"] == "SIN VERIFICAR")
    sin_aval    = sum(1 for b in bulos_data if b["veredicto"] == "SIN AVAL CIENTÍFICO")

    kcol1, kcol2, kcol3, kcol4, kcol5 = st.columns(5)
    with kcol1:
        st.metric("Total bulos (30 días)", total_bulos)
    with kcol2:
        st.metric("FALSO", falsos)
    with kcol3:
        st.metric("ENGAÑOSO", enganosos)
    with kcol4:
        st.metric("SIN VERIFICAR", sin_ver)
    with kcol5:
        st.metric("SIN AVAL CIENTÍFICO", sin_aval)

    st.divider()

    col_bar_b, col_pie_b = st.columns(2)

    with col_bar_b:
        sec_hdr("Bulos por Partido Implicado", RED)
        conteo_partidos: dict[str, int] = {}
        for b in bulos_data:
            for p in b["partidos_implicados"]:
                conteo_partidos[p] = conteo_partidos.get(p, 0) + 1
        partidos_ord = sorted(conteo_partidos.items(), key=lambda x: x[1], reverse=True)
        PARTY_COL    = {"PP": "#3B82F6", "PSOE": "#EF4444", "VOX": "#22C55E", "SUMAR": "#EC4899"}
        fig_bulos_bar = go.Figure(go.Bar(
            x=[x[0] for x in partidos_ord],
            y=[x[1] for x in partidos_ord],
            marker_color=[PARTY_COL.get(x[0], MUTED) for x in partidos_ord],
            text=[x[1] for x in partidos_ord],
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        ))
        fig_bulos_bar.update_layout(
            height=300,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
            yaxis=dict(title="Nº de bulos", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
            margin=dict(t=10, b=10),
            showlegend=False,
        )
        st.plotly_chart(fig_bulos_bar, use_container_width=True)

    with col_pie_b:
        sec_hdr("Distribución por Veredicto", PURPLE)
        ver_labels = ["FALSO", "ENGAÑOSO", "SIN VERIFICAR", "SIN AVAL CIENTÍFICO"]
        ver_values = [falsos, enganosos, sin_ver, sin_aval]
        ver_colors = [RED, ORANGE, YELLOW, PURPLE]
        fig_pie_ver = go.Figure(go.Pie(
            labels=ver_labels,
            values=ver_values,
            marker_colors=ver_colors,
            hole=0.45,
            textinfo="label+percent",
            textfont=dict(size=11, color=TEXT),
        ))
        fig_pie_ver.update_layout(
            height=300,
            paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=10, b=10, l=10, r=10),
            showlegend=False,
            annotations=[dict(text="Veredictos", x=0.5, y=0.5, font_size=11,
                              showarrow=False, font_color=TEXT2)],
        )
        st.plotly_chart(fig_pie_ver, use_container_width=True)

    # Timeline visual
    sec_hdr("Línea Temporal de Bulos — Abril 2026", AMBER)
    timeline_titulares = [
        b["titular_bulo"][:60] + "..." if len(b["titular_bulo"]) > 60 else b["titular_bulo"]
        for b in bulos_data
    ]
    fig_timeline = go.Figure()
    for i, bulo in enumerate(bulos_data):
        fig_timeline.add_trace(go.Scatter(
            x=[bulo["fecha"]],
            y=[i],
            mode="markers+text",
            marker=dict(
                size=18,
                color=VEREDICTO_COLORS.get(bulo["veredicto"], MUTED),
                line=dict(color=BG2, width=2),
            ),
            text=[bulo["veredicto"]],
            textposition="middle right",
            textfont=dict(size=9, color=TEXT2),
            hovertemplate=(
                f"<b>{bulo['fecha']}</b><br>"
                f"{bulo['titular_bulo'][:80]}<br>"
                f"Veredicto: <b>{bulo['veredicto']}</b><br>"
                f"Impacto: {bulo['impacto']}<br>"
                f"Fuente: {bulo['fuente_verificacion']}"
                "<extra></extra>"
            ),
            showlegend=False,
        ))
    fig_timeline.update_layout(
        height=320,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(title=None, showgrid=False, tickfont=dict(size=9, color=TEXT2)),
        yaxis=dict(
            tickvals=list(range(len(bulos_data))),
            ticktext=[t[:45] + "..." if len(t) > 45 else t for t in timeline_titulares],
            tickfont=dict(size=9, color=TEXT2),
            title=None,
        ),
        margin=dict(t=10, b=10, l=280, r=20),
        showlegend=False,
    )
    st.plotly_chart(fig_timeline, use_container_width=True)

    # Feed detallado
    sec_hdr("Detalle de Bulos Verificados")

    filtro_ver   = st.selectbox(
        "Filtrar por veredicto",
        ["Todos", "FALSO", "ENGAÑOSO", "SIN VERIFICAR", "SIN AVAL CIENTÍFICO"],
        key="filtro_veredicto",
    )
    bulos_mostrar = bulos_data if filtro_ver == "Todos" else [
        b for b in bulos_data if b["veredicto"] == filtro_ver
    ]

    for bulo in bulos_mostrar:
        ver_color    = VEREDICTO_COLORS.get(bulo["veredicto"], MUTED)
        partidos_html = "".join(
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p}</span>'
            for p in bulo["partidos_implicados"]
        )
        card = (
            f'<div class="bulo-card" style="border-left:3px solid {ver_color}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
            f'<div style="flex:1">'
            f'<div style="font-weight:700;font-size:.92rem;color:{TEXT};margin-bottom:.3rem">{bulo["titular_bulo"]}</div>'
            f'<div style="font-size:.75rem;color:{MUTED}">{bulo["fecha"]} &nbsp;&bull;&nbsp; Origen: {bulo["fuente_origen"]} &nbsp;&bull;&nbsp; {partidos_html}</div>'
            f'</div>'
            f'<div style="margin-left:1rem;flex-shrink:0">'
            f'<span class="badge" style="background:{ver_color}25;color:{ver_color};border:1px solid {ver_color}55;font-size:.75rem;padding:.25rem .7rem">{bulo["veredicto"]}</span>'
            f'</div>'
            f'</div>'
            f'<div style="font-size:.82rem;color:{TEXT2};background:{BG3};border-radius:6px;padding:.6rem .8rem;margin-bottom:.4rem;line-height:1.5">{bulo["explicacion"]}</div>'
            f'<div style="display:flex;justify-content:space-between;font-size:.75rem;color:{MUTED}">'
            f'<span>Impacto: <b style="color:{TEXT2}">{bulo["impacto"]}</b></span>'
            f'<span>Verificado por: <b style="color:{CYAN}">{bulo["fuente_verificacion"]}</b></span>'
            f'</div>'
            f'</div>'
        )
        st.markdown(card, unsafe_allow_html=True)
        if bulo.get("url"):
            st.markdown(f"[Ver fuente]({bulo['url']})")

st.caption(
    "Fuentes: El País, El Mundo, ABC, RTVE, La Vanguardia, El Confidencial, elDiario.es, "
    "Expansión, Cinco Días, El Economista, InfoLibre + más. Actualización cada hora. "
    "Bulos: Newtral, Maldita.es, EFE Verifica, AFP Factual."
)
