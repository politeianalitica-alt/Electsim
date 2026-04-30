"""
Monitor de Sentimiento de Prensa — versión ampliada.

Tabs:
  ▦ Resumen general · ● Detalle por partido · ⬡ Comparador · △ Alertas
"""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.db import (
    cargar_alertas_sentimiento,
    cargar_alertas_prensa_dinamicas,
    cargar_heatmap_fuente_partido,
    cargar_momentum_sentimiento_partidos,
    cargar_noticias_recientes,
    cargar_tracking_palabras_clave,
    cargar_sentimiento_partido,
    cargar_sentimiento_serie,
    cargar_sentimiento_todos_partidos,
)
from dashboard.shared import (
    AMBER,
    BG,
    BG2,
    BG3,
    BORDER,
    COLORES_PARTIDOS,
    CYAN,
    GREEN,
    MUTED,
    RED,
    TEXT,
    TEXT2,
    color_partido,
    hex_to_rgba,
    safe_numeric,
    section_header,
)

# ── Helpers ──────────────────────────────────────────────────────────────────


def _fmt_sent(v: float) -> str:
    if v is None or v != v:
        return "—"
    return f"{v:+.2f}"


def _color_sent(v: float) -> str:
    """Verde si positivo, rojo si negativo, ámbar si neutro."""
    try:
        x = float(v)
    except (TypeError, ValueError):
        return MUTED
    if x >= 0.15:
        return GREEN
    if x <= -0.15:
        return RED
    return AMBER


def _kpi(label: str, value: str, sub: str = "", color: str = CYAN) -> str:
    # HTML en una sola línea: los saltos + indentación disparan el parser de
    # code-block de markdown en Streamlit y el bloque acaba renderizándose
    # como texto plano en vez de como tarjeta.
    sub_html = (
        f'<div style="font-size:.62rem;color:{TEXT2};margin-top:.25rem">{sub}</div>'
        if sub
        else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
        f'border-top:2px solid {color};padding:.85rem 1rem">'
        f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;'
        f'text-transform:uppercase;color:{MUTED}">{label}</div>'
        f'<div style="font-size:1.5rem;font-weight:900;color:{color};'
        f"font-family:'JetBrains Mono',monospace;line-height:1.1;margin-top:.3rem\">{value}</div>"
        f"{sub_html}</div>"
    )


def _layout_dark(fig: go.Figure, height: int = 360, **kw) -> go.Figure:
    """Aplica tema oscuro a una figura Plotly.

    Si el caller pasa `xaxis`, `yaxis`, `margin` o `legend` via kwargs,
    se mergean con los defaults para no chocar.
    """
    base = dict(
        height=height,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"family": "Inter, sans-serif", "color": TEXT2, "size": 12},
        margin=dict(t=50, b=40, l=40, r=20),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
            bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2, size=11),
        ),
        xaxis=dict(gridcolor=BORDER, zerolinecolor=BORDER, color=TEXT2),
        yaxis=dict(gridcolor=BORDER, zerolinecolor=BORDER, color=TEXT2),
    )
    # Mergear kwargs sobre defaults (override completo de cada clave dada).
    for k, v in kw.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            merged = dict(base[k])
            merged.update(v)
            base[k] = merged
        else:
            base[k] = v
    fig.update_layout(**base)
    return fig


# ── KPI strip ────────────────────────────────────────────────────────────────


def _render_kpis(df_serie: pd.DataFrame, df_ranking: pd.DataFrame, df_alertas: pd.DataFrame, df_heat: pd.DataFrame) -> None:
    n_partidos = int(df_serie["partido"].nunique()) if not df_serie.empty else 0
    sent_global = float(df_ranking["sent_medio"].mean()) if not df_ranking.empty else 0.0
    n_total = int(df_ranking["n_total"].sum()) if not df_ranking.empty else 0
    n_alertas = int(len(df_alertas)) if not df_alertas.empty else 0
    fuente_top = "—"
    if not df_heat.empty:
        agg = df_heat.groupby("fuente_id", as_index=False)["n_noticias"].sum()
        if not agg.empty:
            fuente_top = str(agg.sort_values("n_noticias", ascending=False).iloc[0]["fuente_id"])

    color_sent = _color_sent(sent_global)
    cards = [
        _kpi("Partidos cubiertos", f"{n_partidos}", "30 días", CYAN),
        _kpi("Noticias 14d", f"{n_total:,}", "menciones a partidos", CYAN),
        _kpi("Sentimiento global", _fmt_sent(sent_global), "media de medias", color_sent),
        _kpi("Alertas activas", f"{n_alertas}", "negativas (umbral -0.5)", RED if n_alertas else GREEN),
        _kpi("Medio más activo", fuente_top[:22], "por nº de noticias", CYAN),
    ]
    st.markdown(
        f"<div style='display:grid;grid-template-columns:repeat(5,1fr);gap:.7rem;margin:.5rem 0 1rem'>{''.join(cards)}</div>",
        unsafe_allow_html=True,
    )


# ── Ranking partidos ─────────────────────────────────────────────────────────


def _render_ranking(df_ranking: pd.DataFrame) -> None:
    if df_ranking.empty:
        st.info("Sin datos de ranking de partidos.")
        return
    df = df_ranking.copy().sort_values("sent_medio", ascending=True)
    df["color"] = df["sent_medio"].apply(_color_sent)

    fig = go.Figure(
        go.Bar(
            x=df["sent_medio"],
            y=df["entidad"],
            orientation="h",
            marker=dict(color=df["color"], line=dict(color=BORDER, width=0.5)),
            text=df["sent_medio"].map(lambda v: f"{v:+.2f}"),
            textposition="outside",
            textfont=dict(color=TEXT, size=11),
            hovertemplate=(
                "<b>%{y}</b><br>"
                "Sentimiento medio: %{x:+.3f}<br>"
                "Noticias 14d: %{customdata[0]:,}<br>"
                "% pos: %{customdata[1]:.1f}%<br>"
                "% neg: %{customdata[2]:.1f}%<extra></extra>"
            ),
            customdata=df[["n_total", "pct_pos", "pct_neg"]].values,
        )
    )
    fig.add_vline(x=0, line_dash="dot", line_color=MUTED, opacity=0.5)
    _layout_dark(
        fig,
        height=max(280, len(df) * 32),
        title=dict(text="Ranking de partidos por sentimiento (14 días)", font=dict(color=TEXT, size=14)),
        xaxis=dict(range=[-1, 1], gridcolor=BORDER, zerolinecolor=MUTED, color=TEXT2),
        yaxis=dict(gridcolor=BORDER, color=TEXT2),
    )
    st.plotly_chart(fig, use_container_width=True)


# ── Serie temporal (con suavizado opcional) ─────────────────────────────────


def _render_serie(df_serie: pd.DataFrame, partidos_sel: list[str], suavizar: bool) -> None:
    if df_serie.empty or not partidos_sel:
        st.info("Selecciona al menos un partido para ver la evolución.")
        return
    df = df_serie[df_serie["partido"].astype(str).isin(partidos_sel)].copy()
    if df.empty:
        st.info("No hay serie disponible para los partidos seleccionados.")
        return
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha"]).sort_values(["partido", "fecha"])

    if suavizar:
        df["sent_smooth"] = (
            df.groupby("partido")["sentimiento"]
              .transform(lambda s: s.rolling(window=3, min_periods=1).mean())
        )
        ycol = "sent_smooth"
    else:
        ycol = "sentimiento"

    fig = go.Figure()
    for p, sub in df.groupby("partido"):
        fig.add_trace(
            go.Scatter(
                x=sub["fecha"],
                y=sub[ycol],
                mode="lines+markers",
                name=p,
                line=dict(color=color_partido(p), width=2.2),
                marker=dict(size=5, color=color_partido(p), line=dict(color=BG, width=1)),
                hovertemplate=f"<b>{p}</b><br>%{{x|%d %b}}<br>Sent: %{{y:+.3f}}<extra></extra>",
            )
        )
    fig.add_hline(y=0, line_dash="dot", line_color=MUTED, opacity=0.6)
    _layout_dark(
        fig,
        height=400,
        title=dict(text="Evolución del sentimiento (30 días)", font=dict(color=TEXT, size=14)),
        yaxis=dict(range=[-1, 1], gridcolor=BORDER, zerolinecolor=MUTED, color=TEXT2),
    )
    st.plotly_chart(fig, use_container_width=True)


# ── Heatmap medio × partido ─────────────────────────────────────────────────


def _render_heatmap(df_heat: pd.DataFrame) -> None:
    if df_heat.empty:
        st.info("Sin datos para el heatmap medio×partido.")
        return
    pivot = df_heat.pivot_table(
        index="fuente_id", columns="partido", values="sentimiento", aggfunc="mean"
    )
    fig = go.Figure(
        go.Heatmap(
            z=pivot.values,
            x=pivot.columns.tolist(),
            y=pivot.index.tolist(),
            colorscale=[
                [0.0, RED],
                [0.5, BG3],
                [1.0, GREEN],
            ],
            zmid=0,
            zmin=-1,
            zmax=1,
            text=pd.DataFrame(pivot.values).round(2).values,
            texttemplate="%{text}",
            textfont=dict(color=TEXT, size=10),
            hovertemplate="Medio: %{y}<br>Partido: %{x}<br>Sent: %{z:+.2f}<extra></extra>",
            colorbar=dict(
                title=dict(text="Sent.", font=dict(color=TEXT2, size=11)),
                tickfont=dict(color=TEXT2, size=10),
                outlinecolor=BORDER,
            ),
        )
    )
    _layout_dark(
        fig,
        height=max(320, len(pivot) * 32),
        title=dict(text="Sentimiento medio: medio × partido (30 días)", font=dict(color=TEXT, size=14)),
        margin=dict(t=50, b=40, l=120, r=20),
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_momentum(df_momentum: pd.DataFrame) -> None:
    if df_momentum.empty:
        st.info("Sin datos de momentum de cobertura.")
        return
    df = df_momentum.copy()
    numeric_cols = [
        "n_reciente",
        "n_prev",
        "ratio_menciones",
        "sent_reciente",
        "delta_sent",
        "presion_score",
        "prioridad_score",
    ]
    df = safe_numeric(df, numeric_cols)
    score_col = "prioridad_score"if "prioridad_score"in df.columns else "presion_score"
    df = df.sort_values(score_col, ascending=False).head(15)

    fig = px.scatter(
        df,
        x="ratio_menciones",
        y="sent_reciente",
        size="n_reciente",
        color="delta_sent",
        text="partido",
        color_continuous_scale="RdYlGn",
        range_color=[-0.6, 0.6],
        hover_data=["n_prev", score_col],
    )
    fig.update_traces(textposition="top center")
    fig.add_hline(y=0, line_dash="dot", line_color=MUTED, opacity=0.7)
    fig.add_vline(x=1.0, line_dash="dot", line_color=MUTED, opacity=0.7)
    _layout_dark(
        fig,
        height=380,
        title=dict(text="Momentum cobertura × sentimiento reciente", font=dict(color=TEXT, size=14)),
        xaxis=dict(title="Aceleración menciones (x baseline)", gridcolor=BORDER, color=TEXT2),
        yaxis=dict(title="Sentimiento reciente", range=[-1, 1], gridcolor=BORDER, color=TEXT2),
    )
    st.plotly_chart(fig, use_container_width=True)

    top_cols = ["partido", "n_reciente", "ratio_menciones", "ratio_fuentes", "consenso_score", "sent_reciente", "delta_sent", "presion_score", "prioridad_score"]
    cols_show = [c for c in top_cols if c in df.columns]
    st.dataframe(df[cols_show], hide_index=True, use_container_width=True)


def _render_keywords(df_keywords: pd.DataFrame) -> None:
    if df_keywords.empty:
        st.info("Sin palabras clave con señal dinámica en la ventana actual.")
        return
    df = df_keywords.copy().head(20)
    df = safe_numeric(
        df,
        [
            "n_reciente",
            "fuentes_recientes",
            "sent_reciente",
            "delta_sent",
            "momentum_ratio",
            "prioridad_score",
        ],
    )

    fig = px.scatter(
        df,
        x="momentum_ratio",
        y="sent_reciente",
        size="n_reciente",
        color="delta_sent",
        text="palabra",
        color_continuous_scale="RdYlGn",
        range_color=[-0.6, 0.6],
        hover_data=["fuentes_recientes", "prioridad_score"],
    )
    fig.update_traces(textposition="top center")
    fig.add_hline(y=0, line_dash="dot", line_color=MUTED, opacity=0.7)
    fig.add_vline(x=1.0, line_dash="dot", line_color=MUTED, opacity=0.7)
    _layout_dark(
        fig,
        height=360,
        title=dict(text="Palabras clave: momentum × tono", font=dict(color=TEXT, size=14)),
        xaxis=dict(title="Aceleración menciones (x baseline)", gridcolor=BORDER, color=TEXT2),
        yaxis=dict(title="Sentimiento reciente", range=[-1, 1], gridcolor=BORDER, color=TEXT2),
    )
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(
        df[[
            "palabra",
            "n_reciente",
            "fuentes_recientes",
            "sent_reciente",
            "delta_sent",
            "momentum_ratio",
            "prioridad_score",
        ]],
        hide_index=True,
        use_container_width=True,
    )


# ── Detalle por partido ─────────────────────────────────────────────────────


def _render_detalle_partido(partido: str) -> None:
    df = cargar_sentimiento_partido(partido, dias=30)
    df = safe_numeric(df, ["sentimiento_medio", "pct_positivo", "pct_negativo", "pct_neutro", "n_noticias"])
    if df.empty:
        st.info(f"Sin datos de sentimiento para {partido} en los últimos 30 días.")
        return

    # KPIs del partido
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha"]).sort_values("fecha")
    sent_avg = float(df["sentimiento_medio"].mean())
    n_news = int(df["n_noticias"].sum())
    pct_pos_avg = float(df["pct_positivo"].mean())
    pct_neg_avg = float(df["pct_negativo"].mean())
    pct_neu_avg = float(df["pct_neutro"].mean())
    sent_last = float(df["sentimiento_medio"].iloc[-1])
    sent_first = float(df["sentimiento_medio"].iloc[0])
    delta_30 = sent_last - sent_first

    color_sent = _color_sent(sent_avg)
    color_delta = _color_sent(delta_30)
    cards = [
        _kpi("Sent. medio 30d", _fmt_sent(sent_avg), f"vs hace 30d: {delta_30:+.2f}", color_sent),
        _kpi("Tendencia", _fmt_sent(delta_30), f"último: {sent_last:+.2f}", color_delta),
        _kpi("% Positivo", f"{pct_pos_avg:.1f}%", "media diaria", GREEN),
        _kpi("% Negativo", f"{pct_neg_avg:.1f}%", "media diaria", RED),
        _kpi("Noticias 30d", f"{n_news:,}", "total", CYAN),
    ]
    st.markdown(
        f"<div style='display:grid;grid-template-columns:repeat(5,1fr);gap:.7rem;margin:.5rem 0 1rem'>{''.join(cards)}</div>",
        unsafe_allow_html=True,
    )

    # Serie + área de tono
    col1, col2 = st.columns([3, 2])
    with col1:
        c = color_partido(partido)
        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                x=df["fecha"], y=df["sentimiento_medio"],
                mode="lines+markers",
                name=partido,
                line=dict(color=c, width=2.5),
                marker=dict(size=5),
                fill="tozeroy",
                fillcolor=hex_to_rgba(c, 0.13),
                hovertemplate="%{x|%d %b}<br>Sent: %{y:+.3f}<extra></extra>",
            )
        )
        fig.add_hline(y=0, line_dash="dot", line_color=MUTED, opacity=0.6)
        _layout_dark(
            fig, height=320,
            title=dict(text=f"Serie diaria — {partido}", font=dict(color=TEXT, size=13)),
            yaxis=dict(range=[-1, 1], gridcolor=BORDER, zerolinecolor=MUTED, color=TEXT2),
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        # Stacked bar de pct pos / neu / neg (media 30d)
        fig_bd = go.Figure()
        fig_bd.add_trace(go.Bar(name="Positivo", x=[partido], y=[pct_pos_avg], marker_color=GREEN, text=[f"{pct_pos_avg:.0f}%"], textposition="inside", textfont=dict(color=BG, size=12)))
        fig_bd.add_trace(go.Bar(name="Neutro",   x=[partido], y=[pct_neu_avg], marker_color=AMBER, text=[f"{pct_neu_avg:.0f}%"], textposition="inside", textfont=dict(color=BG, size=12)))
        fig_bd.add_trace(go.Bar(name="Negativo", x=[partido], y=[pct_neg_avg], marker_color=RED,   text=[f"{pct_neg_avg:.0f}%"], textposition="inside", textfont=dict(color=TEXT, size=12)))
        fig_bd.update_layout(barmode="stack")
        _layout_dark(
            fig_bd, height=320,
            title=dict(text="Mix tonal medio (30d)", font=dict(color=TEXT, size=13)),
            yaxis=dict(range=[0, 100], ticksuffix="%", gridcolor=BORDER, color=TEXT2),
            xaxis=dict(showticklabels=False, gridcolor=BORDER, color=TEXT2),
        )
        st.plotly_chart(fig_bd, use_container_width=True)

    # Top noticias del partido
    section_header(f"Noticias destacadas — {partido}")
    df_news = cargar_noticias_recientes(dias=14, limit=200)
    if df_news.empty or "partidos_mencionados"not in df_news.columns:
        st.caption("Sin feed de noticias disponible.")
        return
    df_news = df_news.copy()
    df_news["mencionado"] = df_news["partidos_mencionados"].astype(str).str.upper().str.contains(partido.upper())
    sub = df_news[df_news["mencionado"]].head(10)
    if sub.empty:
        st.caption(f"No se encontraron noticias recientes que mencionen a {partido}.")
        return
    sub = safe_numeric(sub, ["sentimiento_score", "relevancia_score"])
    cols_show = [c for c in ["fecha_publicacion", "fuente", "titular", "sentimiento_score", "relevancia_score", "url"] if c in sub.columns]
    st.dataframe(sub[cols_show], hide_index=True, use_container_width=True)


# ── Comparador entre dos partidos ───────────────────────────────────────────


def _render_comparador(df_serie: pd.DataFrame, df_ranking: pd.DataFrame) -> None:
    if df_serie.empty:
        st.info("Sin serie de sentimiento disponible.")
        return
    partidos = sorted(df_serie["partido"].dropna().astype(str).unique().tolist())
    if len(partidos) < 2:
        st.info("Se necesitan al menos 2 partidos en la serie.")
        return
    c1, c2 = st.columns(2)
    p_a = c1.selectbox("Partido A", options=partidos, index=0, key="cmp_a")
    p_b = c2.selectbox("Partido B", options=partidos, index=1, key="cmp_b")
    if p_a == p_b:
        st.warning("Selecciona dos partidos distintos para comparar.")
        return

    df = df_serie[df_serie["partido"].astype(str).isin([p_a, p_b])].copy()
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha"])

    fig = go.Figure()
    for p in [p_a, p_b]:
        sub = df[df["partido"].astype(str) == p].sort_values("fecha")
        fig.add_trace(
            go.Scatter(
                x=sub["fecha"], y=sub["sentimiento"],
                mode="lines+markers",
                name=p,
                line=dict(color=color_partido(p), width=2.5),
                marker=dict(size=6, line=dict(color=BG, width=1)),
            )
        )
    fig.add_hline(y=0, line_dash="dot", line_color=MUTED, opacity=0.6)
    _layout_dark(
        fig, height=380,
        title=dict(text=f"{p_a}  vs  {p_b}", font=dict(color=TEXT, size=14)),
        yaxis=dict(range=[-1, 1], gridcolor=BORDER, zerolinecolor=MUTED, color=TEXT2),
    )
    st.plotly_chart(fig, use_container_width=True)

    # Ficha lateral comparativa
    if not df_ranking.empty:
        rk = df_ranking.set_index("entidad")
        c1, c2 = st.columns(2)
        for col, p in [(c1, p_a), (c2, p_b)]:
            if p in rk.index:
                r = rk.loc[p]
                sent = float(r.get("sent_medio", 0.0))
                cards = [
                    _kpi("Sentimiento", _fmt_sent(sent), "media 14d", _color_sent(sent)),
                    _kpi("Noticias", f"{int(r.get('n_total', 0)):,}", "total 14d", CYAN),
                    _kpi("% Pos", f"{float(r.get('pct_pos', 0)):.1f}%", "", GREEN),
                    _kpi("% Neg", f"{float(r.get('pct_neg', 0)):.1f}%", "", RED),
                ]
                with col:
                    st.markdown(
                        f"<div style='display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;margin:.4rem 0'>{''.join(cards)}</div>",
                        unsafe_allow_html=True,
                    )


# ── Alertas ──────────────────────────────────────────────────────────────────


def _render_alertas(df_alertas: pd.DataFrame) -> None:
    if df_alertas.empty:
        st.success("Sin alertas de cobertura negativa en los últimos 7 días.")
        return
    df = df_alertas.copy()
    df = safe_numeric(df, ["sentimiento", "n_noticias"])
    df["color"] = df["sentimiento"].apply(_color_sent)
    df["sent_fmt"] = df["sentimiento"].map(lambda v: f"{v:+.2f}")

    # Tabla custom HTML para colorear filas. HTML en una sola línea a
    # propósito para evitar el detector de code-block de markdown.
    row_grid = (
        "display:grid;grid-template-columns:90px 130px 1fr 90px 70px;"
        "gap:.6rem;align-items:center;padding:.55rem .8rem;"
    )
    rows = []
    for _, r in df.head(20).iterrows():
        c = color_partido(str(r.get("partido", "")))
        sc = _color_sent(float(r.get("sentimiento", 0.0)))
        rows.append(
            f'<div style="{row_grid}background:{BG2};border:1px solid {BORDER};'
            f'border-radius:8px;margin-bottom:.35rem">'
            f'<span style="color:{TEXT2};font-size:.78rem;font-family:\'JetBrains Mono\',monospace">{r.get("fecha","")}</span>'
            f'<span style="color:{c};font-weight:700;font-size:.85rem">{r.get("partido","")}</span>'
            f'<span style="color:{TEXT};font-size:.82rem">{r.get("fuente_id","desconocida")}</span>'
            f'<span style="color:{sc};font-weight:800;font-family:\'JetBrains Mono\',monospace;font-size:.95rem">{r["sent_fmt"]}</span>'
            f'<span style="color:{TEXT2};font-size:.78rem;text-align:right">{int(r.get("n_noticias",0))} not.</span>'
            f"</div>"
        )
    header = (
        f'<div style="display:grid;grid-template-columns:90px 130px 1fr 90px 70px;'
        f'gap:.6rem;padding:.4rem .8rem;color:{MUTED};font-size:.6rem;'
        f'font-weight:700;letter-spacing:.1em;text-transform:uppercase">'
        f"<span>Fecha</span><span>Partido</span><span>Medio</span>"
        f'<span style="text-align:right">Sent.</span><span style="text-align:right">N.</span>'
        f"</div>"
    )
    st.markdown(header + "".join(rows), unsafe_allow_html=True)


# ── Render principal ─────────────────────────────────────────────────────────


def render_monitor_sentimiento(conn) -> None:
    st.header("▦  Monitor de Sentimiento de Prensa")
    st.caption("Cobertura mediática de partidos políticos en prensa digital. "
               "Sentimiento en escala −1 (negativo) a +1 (positivo).")

    # Carga centralizada (fuera de tabs para compartir caché entre vistas).
    df_serie = safe_numeric(cargar_sentimiento_serie(conn), ["sentimiento"])
    df_heat = safe_numeric(cargar_heatmap_fuente_partido(conn), ["sentimiento", "n_noticias"])
    df_alertas = safe_numeric(cargar_alertas_sentimiento(conn), ["sentimiento", "n_noticias"])
    df_ranking = safe_numeric(
        cargar_sentimiento_todos_partidos(dias=14),
        ["sent_medio", "n_total", "pct_pos", "pct_neg"],
    )
    df_momentum = safe_numeric(
        cargar_momentum_sentimiento_partidos(dias=14, ventana_reciente=3),
        [
            "n_reciente",
            "n_prev",
            "ratio_menciones",
            "ratio_fuentes",
            "consenso_score",
            "sent_reciente",
            "delta_sent",
            "presion_score",
            "prioridad_score",
        ],
    )
    df_keywords = cargar_tracking_palabras_clave(dias=14, ventana_reciente=3, min_menciones=4, top_n=25)
    df_alertas_dyn = cargar_alertas_prensa_dinamicas(dias=14, ventana_reciente=3)

    _render_kpis(df_serie, df_ranking, df_alertas, df_heat)

    n_alert = int(len(df_alertas)) if not df_alertas.empty else 0
    n_alert += int(len(df_alertas_dyn)) if not df_alertas_dyn.empty else 0
    t_resumen, t_partido, t_cmp, t_alert = st.tabs([
        "▦  Resumen general",
        "●  Detalle por partido",
        "⬡  Comparador",
        f"△  Alertas ({n_alert})"if n_alert else "△  Alertas",
    ])

    with t_resumen:
        section_header("Ranking de partidos")
        _render_ranking(df_ranking)

        section_header("Evolución temporal")
        partidos_disponibles = sorted(df_serie["partido"].dropna().astype(str).unique().tolist()) if not df_serie.empty else []
        col_sel, col_opts = st.columns([3, 1])
        default_sel = partidos_disponibles[: min(5, len(partidos_disponibles))]
        seleccion = col_sel.multiselect(
            "Partidos a mostrar",
            options=partidos_disponibles,
            default=default_sel,
            key="mon_serie_sel",
        )
        suavizar = col_opts.toggle("Suavizar (3d)", value=True, key="mon_smooth")
        _render_serie(df_serie, seleccion, suavizar)

        section_header("Momentum y presión de cobertura")
        _render_momentum(df_momentum)

        section_header("Tracking de palabras clave")
        _render_keywords(df_keywords)

        section_header("Sentimiento por medio")
        _render_heatmap(df_heat)

    with t_partido:
        partidos_all = sorted(df_serie["partido"].dropna().astype(str).unique().tolist()) if not df_serie.empty else []
        if not partidos_all:
            st.info("No hay partidos en la serie para detallar.")
        else:
            partido_sel = st.selectbox("Partido", options=partidos_all, index=0, key="mon_detalle_sel")
            _render_detalle_partido(partido_sel)

    with t_cmp:
        _render_comparador(df_serie, df_ranking)

    with t_alert:
        section_header("Picos negativos (7 días, umbral ≤ −0.5)")
        _render_alertas(df_alertas)
        section_header("Alertas dinámicas (presión + aceleración)")
        if df_alertas_dyn.empty:
            st.caption("Sin alertas dinámicas relevantes.")
        else:
            st.dataframe(df_alertas_dyn.head(20), hide_index=True, use_container_width=True)
