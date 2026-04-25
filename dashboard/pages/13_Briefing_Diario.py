"""
Briefing diario automático para decisores.
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st
from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)
from dashboard.db import (
    cargar_alertas,
    cargar_agenda_hoy,
    cargar_indices_politeia,
    cargar_macro_ultimo,
    cargar_noticias_recientes,
    cargar_nowcasting,
)
from dashboard.models.economic_fundamentals import compute_economic_score_from_df

try:
    from etl.sources.agendas_dinamicas import fetch_all_agendas as _fetch_agendas
    def _get_agenda_oficial(max_items: int = 8) -> pd.DataFrame:
        return pd.DataFrame(_fetch_agendas(max_items_per_source=max_items))
except Exception:
    def _get_agenda_oficial(max_items: int = 8) -> pd.DataFrame:  # type: ignore[misc]
        return pd.DataFrame()

st.set_page_config(page_title="Briefing Diario — ElectSim", layout="wide")
aplicar_estilos()
sidebar_nav()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _top_party(df_nc: pd.DataFrame) -> str:
    if df_nc.empty or "estimacion_pct" not in df_nc.columns:
        return "N/D"
    row = df_nc.sort_values("estimacion_pct", ascending=False).head(1)
    return str(row.iloc[0].get("partido_siglas", "N/D"))


def _top_party_pct(df_nc: pd.DataFrame) -> str:
    if df_nc.empty or "estimacion_pct" not in df_nc.columns:
        return "N/D"
    row = df_nc.sort_values("estimacion_pct", ascending=False).head(1)
    try:
        return f"{float(row.iloc[0]['estimacion_pct']):.1f}%"
    except Exception:
        return "N/D"


def _macro_val(df_macro: pd.DataFrame, indicador: str, fmt: str = ".1f", suffix: str = "") -> str:
    if df_macro.empty:
        return "N/D"
    r = df_macro[df_macro["indicador"] == indicador]
    if r.empty:
        return "N/D"
    try:
        return f"{float(r.iloc[0]['valor']):{fmt}}{suffix}"
    except Exception:
        return str(r.iloc[0].get("valor", "N/D"))


def _noticias_diversificadas(df_news: pd.DataFrame, max_total: int = 24, max_por_fuente: int = 3) -> pd.DataFrame:
    if df_news.empty:
        return df_news
    df = df_news.copy()
    if "sentimiento_score" in df.columns:
        df["abs_score"] = df["sentimiento_score"].astype(float).abs()
        df = df.sort_values(["abs_score", "fecha_publicacion"], ascending=[False, False])
    out, counts = [], {}
    for _, row in df.iterrows():
        fuente = str(row.get("fuente") or "desconocida")
        if counts.get(fuente, 0) >= max_por_fuente:
            continue
        out.append(row)
        counts[fuente] = counts.get(fuente, 0) + 1
        if len(out) >= max_total:
            break
    return pd.DataFrame(out) if out else df.head(max_total)


def _acciones_dinamicas(
    df_nc: pd.DataFrame,
    df_macro: pd.DataFrame,
    df_alert: pd.DataFrame,
    df_news: pd.DataFrame,
    df_indices: pd.DataFrame,
) -> list[str]:
    """Genera recomendaciones de acción basadas en datos reales."""
    acciones = []

    # 1. Alertas críticas → acción inmediata
    if not df_alert.empty:
        criticas = df_alert[df_alert.get("severidad", pd.Series(dtype=str)).astype(str) == "CRITICAL"]
        if not criticas.empty:
            acciones.append(
                f"🔴 **Alerta crítica activa:** {criticas.iloc[0].get('titulo', '')}. "
                "Preparar comunicación de crisis antes de 2h."
            )

    # 2. Presión económica
    eco_score = compute_economic_score_from_df(df_macro)
    if eco_score:
        if eco_score.nivel in ("Adverso", "Crítico"):
            ipc = _macro_val(df_macro, "IPC General (%)", ".1f", "%")
            paro = _macro_val(df_macro, "Tasa de Paro (%)", ".1f", "%")
            acciones.append(
                f"⚠️ **Contexto económico {eco_score.nivel.lower()}** (IPC {ipc}, paro {paro}). "
                "Reforzar mensajes de gestión económica y coste de vida."
            )
        elif eco_score.nivel == "Favorable":
            acciones.append(
                "✅ **Coyuntura económica favorable.** "
                "Amplificar indicadores de empleo y crecimiento en comunicación pública."
            )

    # 3. Noticias con alto sentimiento negativo
    if not df_news.empty and "sentimiento_score" in df_news.columns:
        negativas = df_news[df_news["sentimiento_score"].astype(float) < -0.5]
        if len(negativas) > 5:
            tema_top = negativas.iloc[0].get("titular", "")[:60]
            acciones.append(
                f"📰 **{len(negativas)} noticias con sentimiento muy negativo** en 48h. "
                f"Tema dominante: «{tema_top}…». Evaluar respuesta proactiva."
            )

    # 4. Nowcasting — brecha con segundo partido
    if not df_nc.empty and "estimacion_pct" in df_nc.columns:
        top2 = df_nc.sort_values("estimacion_pct", ascending=False).head(2)
        if len(top2) == 2:
            brecha = float(top2.iloc[0]["estimacion_pct"]) - float(top2.iloc[1]["estimacion_pct"])
            p1 = top2.iloc[0].get("partido_siglas", "?")
            p2 = top2.iloc[1].get("partido_siglas", "?")
            if brecha < 3:
                acciones.append(
                    f"⚡ **Empate técnico:** {p1} y {p2} separados solo {brecha:.1f} pp. "
                    "Máxima atención a movilización y GOTV."
                )
            elif brecha > 10:
                acciones.append(
                    f"📊 **Ventaja consolidada:** {p1} lidera por {brecha:.1f} pp sobre {p2}. "
                    "Mantener disciplina de agenda para no erosionar ventaja."
                )

    # 5. Índices Politeia — foco prioritario
    if not df_indices.empty and "valor" in df_indices.columns:
        top_idx = df_indices.sort_values("valor", ascending=False).head(1)
        if not top_idx.empty:
            idx_name = top_idx.iloc[0].get("indice_codigo", "?")
            idx_val = float(top_idx.iloc[0]["valor"])
            if idx_val > 70:
                acciones.append(
                    f"🎯 **Índice {idx_name} en nivel alto ({idx_val:.1f}/100).** "
                    "Priorizar este eje en comunicación y agenda pública esta semana."
                )

    if not acciones:
        acciones.append(
            "ℹ️ Sin señales de alerta prioritaria. "
            "Mantener cadencia de comunicación ordinaria y monitoreo continuo."
        )

    return acciones


def _briefing_markdown(
    df_nc, df_macro, df_indices, df_alert, df_agenda, eco_score
) -> str:
    hoy = datetime.now().strftime("%d/%m/%Y %H:%M")
    lineas = [f"# Briefing Diario ElectSim — {hoy}\n"]

    lineas.append("## Pulso Electoral")
    lider = _top_party(df_nc)
    lider_pct = _top_party_pct(df_nc)
    lineas.append(f"- Partido líder nowcasting: **{lider}** ({lider_pct})")

    lineas.append("\n## Indicadores Macro")
    lineas.append(f"- IPC: {_macro_val(df_macro, 'IPC General (%)', '.1f', '%')}")
    lineas.append(f"- Paro: {_macro_val(df_macro, 'Tasa de Paro (%)', '.1f', '%')}")
    lineas.append(f"- PIB: {_macro_val(df_macro, 'Crec. PIB (%)', '.1f', '%')}")
    lineas.append(f"- Prima riesgo: {_macro_val(df_macro, 'Prima Riesgo (pb)', '.0f', ' pb')}")
    if eco_score:
        lineas.append(f"- Presión económica: **{eco_score.presion_total:.1f}/100** ({eco_score.nivel})")
        lineas.append(f"- {eco_score.narrativa}")

    if not df_indices.empty:
        lineas.append("\n## Índices Politeia (Top 3)")
        top3 = df_indices.sort_values("valor", ascending=False).head(3)
        for _, r in top3.iterrows():
            lineas.append(f"- {r.get('indice_codigo','?')}: {float(r['valor']):.1f}")

    if not df_alert.empty:
        lineas.append(f"\n## Alertas Activas ({len(df_alert)})")
        for _, r in df_alert.head(5).iterrows():
            lineas.append(f"- [{r.get('severidad','?')}] {r.get('titulo','')}")

    if not df_agenda.empty:
        lineas.append("\n## Agenda Mediática")
        for _, r in df_agenda.head(5).iterrows():
            lineas.append(f"- {r.get('tema','')}")

    return "\n".join(lineas)


# ── Datos ─────────────────────────────────────────────────────────────────────

df_nc = cargar_nowcasting()
df_macro = cargar_macro_ultimo()
df_indices = cargar_indices_politeia()
df_alert = cargar_alertas(solo_no_leidas=True, limit=20)
df_news = cargar_noticias_recientes(dias=2, limit=60)
df_agenda = cargar_agenda_hoy()
agenda_oficial = _get_agenda_oficial(max_items=8)
eco_score = compute_economic_score_from_df(df_macro)

# ── Header ────────────────────────────────────────────────────────────────────

hoy_str = datetime.now().strftime("%A, %d de %B de %Y")
st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden">
  <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;
              background:radial-gradient(circle,{CYAN}18,transparent 65%);border-radius:50%;pointer-events:none"></div>
  <div style="position:relative">
    <div style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{CYAN};margin-bottom:.3rem">
      BRIEFING DIARIO · POLITEIA ANALÍTICA
    </div>
    <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
      Briefing <span style="color:{CYAN}">Diario</span>
    </div>
    <div style="font-size:.88rem;color:{TEXT2};margin-top:.35rem">{hoy_str}</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── KPIs ──────────────────────────────────────────────────────────────────────

col1, col2, col3, col4, col5 = st.columns(5)
col1.metric("Partido líder", _top_party(df_nc), _top_party_pct(df_nc))
col2.metric("Alertas activas", len(df_alert) if not df_alert.empty else 0)
col3.metric("Noticias (48h)", len(df_news) if not df_news.empty else 0)
col4.metric(
    "Presión económica",
    f"{eco_score.presion_total:.0f}/100" if eco_score else "N/D",
    eco_score.nivel if eco_score else None,
    delta_color="inverse" if eco_score else "normal",
)
col5.metric("Eventos agenda", len(agenda_oficial) if not agenda_oficial.empty else 0)

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1rem 0 1.5rem"></div>', unsafe_allow_html=True)

# ── Resumen ejecutivo ─────────────────────────────────────────────────────────

st.markdown(f"""
<div style="font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
            color:{CYAN};margin-bottom:.6rem">RESUMEN EJECUTIVO</div>
""", unsafe_allow_html=True)

briefing_lineas = []
briefing_lineas.append(
    f"- **Pulso electoral:** liderazgo estimado para `{_top_party(df_nc)}` "
    f"({_top_party_pct(df_nc)}) en nowcasting."
)
briefing_lineas.append(
    f"- **Macro clave:** IPC `{_macro_val(df_macro, 'IPC General (%)', '.1f', '%')}`, "
    f"paro `{_macro_val(df_macro, 'Tasa de Paro (%)', '.1f', '%')}`, "
    f"prima `{_macro_val(df_macro, 'Prima Riesgo (pb)', '.0f', ' pb')}`."
)
if eco_score:
    briefing_lineas.append(f"- **Economía política:** {eco_score.narrativa}")
if not df_indices.empty and "valor" in df_indices.columns:
    top3 = df_indices.sort_values("valor", ascending=False).head(3)
    riesgos_txt = ", ".join(
        [f"{r.get('indice_codigo','?')}={float(r['valor']):.1f}" for _, r in top3.iterrows()]
    )
    briefing_lineas.append(f"- **Índices Politeia:** focos prioritarios `{riesgos_txt}`.")
if not df_alert.empty:
    alerts_txt = "; ".join(df_alert["titulo"].astype(str).head(3).tolist())
    briefing_lineas.append(f"- **Alertas:** {alerts_txt}.")
if not df_agenda.empty and "tema" in df_agenda.columns:
    agenda_txt = ", ".join(df_agenda["tema"].astype(str).head(4).tolist())
    briefing_lineas.append(f"- **Agenda mediática hoy:** {agenda_txt}.")

st.markdown("\n".join(briefing_lineas))

# ── Acciones sugeridas (data-driven) ─────────────────────────────────────────

st.markdown(f"""
<div style="font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
            color:{AMBER};margin:1.5rem 0 .6rem">ACCIONES SUGERIDAS</div>
""", unsafe_allow_html=True)

acciones = _acciones_dinamicas(df_nc, df_macro, df_alert, df_news, df_indices)
for accion in acciones:
    st.markdown(f"- {accion}")

# ── Exportar briefing ─────────────────────────────────────────────────────────

with st.expander("⬇️ Exportar briefing completo"):
    md_content = _briefing_markdown(df_nc, df_macro, df_indices, df_alert, df_agenda, eco_score)
    st.download_button(
        label="Descargar como Markdown (.md)",
        data=md_content.encode("utf-8"),
        file_name=f"briefing_{datetime.now().strftime('%Y%m%d_%H%M')}.md",
        mime="text/markdown",
    )
    st.text_area("Vista previa", md_content, height=200)

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.5rem 0"></div>', unsafe_allow_html=True)

# ── Tabs de detalle ───────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4 = st.tabs(["Agenda Oficial", "Alertas", "Noticias críticas", "Economía política"])

with tab1:
    if agenda_oficial.empty:
        st.info("Módulo de agenda oficial no disponible en este entorno.")
        if not df_agenda.empty:
            st.subheader("Agenda mediática (fuente BD)")
            st.dataframe(df_agenda, hide_index=True, use_container_width=True)
    else:
        cols_ag = [c for c in ["fuente", "actor", "fecha", "titulo", "url"] if c in agenda_oficial.columns]
        st.dataframe(agenda_oficial[cols_ag] if cols_ag else agenda_oficial,
                     hide_index=True, use_container_width=True)

with tab2:
    if df_alert.empty:
        st.success("Sin alertas activas.")
    else:
        for sev, color in [("CRITICAL", RED), ("WARNING", AMBER), ("INFO", BLUE)]:
            grupo = df_alert[df_alert.get("severidad", pd.Series(dtype=str)).astype(str) == sev]
            if grupo.empty:
                continue
            st.markdown(f"**{sev}** ({len(grupo)})")
            cols_al = [c for c in ["tipo", "titulo", "descripcion", "created_at"] if c in grupo.columns]
            st.dataframe(grupo[cols_al], hide_index=True, use_container_width=True)

with tab3:
    if df_news.empty:
        st.info("Sin noticias recientes.")
    else:
        df_news_div = _noticias_diversificadas(df_news, max_total=25, max_por_fuente=2)
        cols_n = [c for c in ["fuente", "titular", "fecha_publicacion", "sentimiento_label", "sentimiento_score", "url"]
                  if c in df_news_div.columns]
        st.dataframe(df_news_div[cols_n], hide_index=True, use_container_width=True)

with tab4:
    if eco_score is None:
        st.info("Sin datos macroeconómicos suficientes para calcular el modelo de voto económico.")
    else:
        import plotly.graph_objects as go
        from dashboard.models.economic_fundamentals import economic_score_to_df

        col_a, col_b = st.columns([2, 1])
        with col_a:
            df_comp = economic_score_to_df(eco_score)
            fig = go.Figure(go.Bar(
                x=df_comp["componente"],
                y=df_comp["presion"],
                marker_color=[
                    RED if p >= 65 else AMBER if p >= 35 else GREEN
                    for p in df_comp["presion"]
                ],
                text=[f"{p:.0f}" for p in df_comp["presion"]],
                textposition="outside",
            ))
            fig.update_layout(
                title="Presión por componente (0=óptimo, 100=crisis)",
                height=320,
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
                font=dict(color=TEXT2),
                yaxis=dict(range=[0, 110]),
                margin=dict(t=40, b=20),
            )
            st.plotly_chart(fig, use_container_width=True)

        with col_b:
            color_nivel = {
                "Favorable": GREEN, "Neutro": BLUE, "Adverso": AMBER, "Crítico": RED,
            }.get(eco_score.nivel, MUTED)
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.2rem;text-align:center">
              <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:{MUTED}">
                PRESIÓN TOTAL
              </div>
              <div style="font-size:3rem;font-weight:800;color:{color_nivel};margin:.3rem 0">
                {eco_score.presion_total:.0f}
              </div>
              <div style="font-size:.8rem;color:{color_nivel};font-weight:600">{eco_score.nivel}</div>
              <hr style="border-color:{BORDER};margin:.8rem 0">
              <div style="font-size:.75rem;color:{TEXT2}">Penalización gobierno</div>
              <div style="font-size:1.3rem;font-weight:700;color:{RED if eco_score.incumbency_penalty_pp < 0 else GREEN}">
                {eco_score.incumbency_penalty_pp:+.1f} pp
              </div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown(f"**Narrativa:** {eco_score.narrativa}")
