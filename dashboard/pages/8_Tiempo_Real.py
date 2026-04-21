"""
Página: Tiempo Real

Monitor de scrapers, alertas del sistema e indicadores macroeconómicos.
"""

from __future__ import annotations

import plotly.graph_objects as go
import pandas as pd
import streamlit as st

from dashboard.db import (
    cargar_alertas,
    cargar_ingest_log,
    cargar_macro_serie,
    cargar_macro_ultimo,
    cargar_scraper_incidents,
    cargar_scraping_log,
    cargar_source_health,
)
from dashboard.shared import (
    AMBER,
    BG,
    BG2,
    BG3,
    BLUE,
    BORDER,
    CYAN,
    GREEN,
    MUTED,
    RED,
    TEXT,
    TEXT2,
    sidebar_nav,
)

st.set_page_config(page_title="Tiempo Real — ElectSim", layout="wide")

sidebar_nav()


def _fmt_timestamp(value: object) -> str:
    if value is None or value == "":
        return "—"
    ts = pd.to_datetime(value, errors="coerce", utc=True)
    if pd.isna(ts):
        return str(value)[:16]
    return ts.tz_convert("Europe/Madrid").strftime("%Y-%m-%d %H:%M")


def _fmt_lag_seconds(value: object) -> str:
    if value is None or value == "":
        return "—"
    try:
        seconds = int(float(value))
    except (TypeError, ValueError):
        return "—"
    if seconds < 3600:
        return f"{seconds // 60} min"
    return f"{seconds // 3600} h"


def _count_health_issues(df_health: pd.DataFrame) -> int:
    if df_health.empty or "status" not in df_health.columns:
        return 0
    return int(df_health["status"].isin(["degraded", "failing", "error"]).sum())


with st.sidebar:
    st.header("Configuración")
    auto_refresh = st.checkbox("Auto-refresh (30s)", value=False)
    if auto_refresh:
        import time

        st.info("La página se recarga cada 30 segundos")
        time.sleep(30)
        st.rerun()

    solo_no_leidas = st.checkbox("Solo alertas no leidas", value=True)
    dias_macro = st.slider("Ventana macro (dias)", 30, 730, 180)

st.markdown(
    f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%      {{ opacity:1; transform:scale(1.3); }}
}}
.alert-card {{
    border-radius:8px; padding:.55rem 1rem; margin:.3rem 0;
    border-left-width:4px; border-left-style:solid; animation:fadeInUp .35s ease both;
}}
.scraper-row {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:8px;
    padding:.5rem 1rem; margin:.3rem 0; font-size:.85rem;
}}
.sec-hdr {{
    display:flex; align-items:center; gap:.7rem; margin:1.8rem 0 1rem;
}}
.sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.sec-hdr .lbl  {{ font-size:.65rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:{MUTED}; }}
.sec-hdr .line {{ flex:1; height:1px; background:{BORDER}; }}
</style>
""",
    unsafe_allow_html=True,
)

st.markdown(
    f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{CYAN}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{CYAN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{CYAN}">EN VIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Monitor <span style="color:{CYAN}">Tiempo Real</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Estado de scrapers, alertas del sistema, salud de fuentes e ingestas recientes
        </div>
    </div>
</div>
""",
    unsafe_allow_html=True,
)

df_log = cargar_scraping_log(30)
df_health = cargar_source_health()
df_incidents = cargar_scraper_incidents(solo_activos=True)
df_ingest = cargar_ingest_log(20)
df_alertas = cargar_alertas(solo_no_leidas)
df_macro_last = cargar_macro_ultimo()

col_kpi_1, col_kpi_2, col_kpi_3, col_kpi_4 = st.columns(4)
with col_kpi_1:
    st.metric("Fuentes monitorizadas", int(len(df_health)))
with col_kpi_2:
    st.metric("Fuentes con riesgo", _count_health_issues(df_health))
with col_kpi_3:
    st.metric("Incidencias activas", int(len(df_incidents)))
with col_kpi_4:
    st.metric("Fuentes con ingesta", int(len(df_ingest)))

# ── Estado de scrapers ────────────────────────────────────────────────────────
col_scrapers, col_alertas = st.columns([1, 1])

with col_scrapers:
    st.markdown(
        f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Estado de Scrapers</span><div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    if df_log.empty and df_health.empty:
        st.info("Sin datos de scraping. Los scrapers estan en modo dry_run por defecto.")
        st.markdown(
            """
        Para activar scrapers reales:
        ```bash
        ELECTSIM_DRY_RUN=false python -m etl.realtime.cis_monitor
        python pipelines/realtime_scheduler.py --flow diario
        ```
        """
        )
    else:
        if not df_health.empty:
            for _, row in df_health.iterrows():
                raw_status = str(row.get("status", "unknown")).lower()
                color = {"ok": GREEN, "degraded": AMBER, "failing": RED}.get(raw_status, BLUE)
                status = raw_status.upper()
                st.markdown(
                    f'<div class="scraper-row">'
                    f'<span style="color:{color};font-weight:700">[{status}]</span> '
                    f'<span style="color:{TEXT};font-weight:600">{row.get("source_id", "")}</span> '
                    f'<span style="color:{MUTED}">· {row.get("source_type", "scraper")}</span><br>'
                    f'<span style="color:{TEXT2}">{int(row.get("articles_count", 0) or 0)} registros</span> '
                    f'<span style="color:{MUTED}">· errores: {int(row.get("errors_count", 0) or 0)}</span> '
                    f'<span style="color:{MUTED}">· lag: {_fmt_lag_seconds(row.get("freshness_lag_s"))}</span> '
                    f'<span style="color:{MUTED}">· chequeado: {_fmt_timestamp(row.get("checked_at"))}</span>'
                    f"</div>",
                    unsafe_allow_html=True,
                )
        elif not df_log.empty:
            df_resumen = (
                df_log.groupby("fuente")
                .agg(
                    ultimo_estado=("estado", "first"),
                    n_nuevos_total=("n_registros_nuevos", "sum"),
                    n_ejecuciones=("estado", "count"),
                    ultimo_scrape=("created_at", "max"),
                )
                .reset_index()
            )

            for _, row in df_resumen.iterrows():
                status = "OK" if row["ultimo_estado"] == "ok" else "ERROR"
                color = GREEN if row["ultimo_estado"] == "ok" else RED
                st.markdown(
                    f'<span style="color:{color};font-weight:600">[{status}]</span> '
                    f'**{row["fuente"]}** — {row["n_nuevos_total"]} registros · '
                    f'{row["n_ejecuciones"]} ejecuciones · ultimo: {_fmt_timestamp(row["ultimo_scrape"])}',
                    unsafe_allow_html=True,
                )

        st.markdown(
            f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Log detallado</span><div class="line"></div></div>',
            unsafe_allow_html=True,
        )
        cols_log = [
            c
            for c in [
                "fuente",
                "tipo",
                "estado",
                "n_registros_nuevos",
                "duracion_segundos",
                "created_at",
            ]
            if c in df_log.columns
        ]
        st.dataframe(df_log[cols_log].head(20), hide_index=True, use_container_width=True)

with col_alertas:
    st.markdown(
        f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Alertas del Sistema</span><div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    if df_alertas.empty:
        st.success("Sin alertas activas")
    else:
        for _, row in df_alertas.iterrows():
            sev = row.get("severidad", "INFO")
            border = {"CRITICAL": RED, "WARNING": AMBER}.get(sev, BLUE)
            tipo_alerta = row.get("tipo", "")
            st.markdown(
                f"""
            <div style="border-left:4px solid {border};padding:0.55rem 1rem;
                        margin:0.3rem 0;background:{BG2};border-radius:0 8px 8px 0;border:1px solid {BORDER};border-left:4px solid {border}">
                <strong style="color:{TEXT}">[{sev}]</strong> <span style="color:{TEXT2}">{row.get('titulo', '')}</span>
                <br><small style="color:{MUTED}">{str(row.get('descripcion', ''))[:150]}</small>
                <br><small style="color:{MUTED}">{str(row.get('created_at', ''))[:16]} · {tipo_alerta}</small>
            </div>
            """,
                unsafe_allow_html=True,
            )

    st.markdown(
        f'<div class="sec-hdr"><div class="bar" style="background:{RED}"></div><span class="lbl">Incidencias de Scraping</span><div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    if df_incidents.empty:
        st.success("Sin incidencias activas en los últimos 7 días")
    else:
        for _, row in df_incidents.iterrows():
            severity = str(row.get("severity", "minor")).lower()
            sev_color = RED if severity == "critical" else (AMBER if severity == "major" else BLUE)
            st.markdown(
                f'<div style="border-left:4px solid {sev_color};padding:0.55rem 1rem;'
                f'margin:0.3rem 0;background:{BG2};border-radius:0 8px 8px 0;border:1px solid {BORDER};border-left:4px solid {sev_color}">'
                f'<strong style="color:{sev_color}">[{severity.upper()}]</strong> '
                f'<span style="color:{TEXT2}">{row.get("source_id", "")} · {row.get("error_type", "")}</span>'
                f'<br><small style="color:{MUTED}">visto por última vez: {_fmt_timestamp(row.get("last_seen"))} · '
                f'persistencia: {int(row.get("occurrence_count", 0) or 0)}</small>'
                f"</div>",
                unsafe_allow_html=True,
            )

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Estado de ingesta ─────────────────────────────────────────────────────────
st.markdown(
    f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Estado de Ingesta</span><div class="line"></div></div>',
    unsafe_allow_html=True,
)

if df_ingest.empty:
    st.info(
        "Sin registros en `ingest_log`. Aplica `alembic upgrade head` y ejecuta los "
        "pipelines para empezar a trazar la última ingesta por fuente."
    )
else:
    df_ingest_view = df_ingest.copy()
    now = pd.Timestamp.now(tz="UTC")
    last_ingested = pd.to_datetime(df_ingest_view["last_ingested_at"], errors="coerce", utc=True)
    updated_at = pd.to_datetime(df_ingest_view["updated_at"], errors="coerce", utc=True)
    reference_ts = last_ingested.fillna(updated_at)
    stale_mask = reference_ts.isna() | (reference_ts < now - pd.Timedelta(days=2))
    latest_seen = reference_ts.max()

    col_ingest_1, col_ingest_2, col_ingest_3 = st.columns(3)
    with col_ingest_1:
        st.metric("Fuentes trazadas", int(len(df_ingest_view)))
    with col_ingest_2:
        st.metric("Fuentes stale (>48h)", int(stale_mask.sum()))
    with col_ingest_3:
        st.metric(
            "Última ingesta",
            latest_seen.tz_convert("Europe/Madrid").strftime("%Y-%m-%d %H:%M")
            if pd.notna(latest_seen)
            else "—",
        )

    df_ingest_view["ultima_referencia"] = reference_ts.dt.tz_convert("Europe/Madrid").dt.strftime(
        "%Y-%m-%d %H:%M"
    )
    df_ingest_view["estado"] = stale_mask.map(lambda is_stale: "stale" if is_stale else "fresh")
    st.dataframe(
        df_ingest_view[["source_name", "ultima_referencia", "estado"]],
        hide_index=True,
        use_container_width=True,
    )

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Indicadores macroeconómicos ───────────────────────────────────────────────
st.markdown(
    f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Indicadores Macroeconómicos</span><div class="line"></div></div>',
    unsafe_allow_html=True,
)

if not df_macro_last.empty:
    indicadores_config = {
        "IPC General (%)": ("IPC Inflacion", "%", "ipc_general"),
        "Tasa de Paro (%)": ("Tasa de Paro", "%", "tasa_paro"),
        "Prima Riesgo (pb)": ("Prima de Riesgo", " pb", "prima_riesgo_bono10"),
        "Crec. PIB (%)": ("PIB YoY", "%", "crecimiento_pib"),
    }
    cols_kpi = st.columns(4)
    for i, (ind, (label, unidad, _col_serie)) in enumerate(indicadores_config.items()):
        fila = df_macro_last[df_macro_last["indicador"] == ind]
        with cols_kpi[i]:
            if not fila.empty:
                val = float(fila.iloc[0]["valor"])
                fecha = str(fila.iloc[0].get("fecha", ""))[:10]
                st.metric(label, f"{val:.1f}{unidad}", help=f"Fecha: {fecha}")
            else:
                st.metric(label, "—")

indicadores_disponibles = [
    ("ipc_general", "Inflacion IPC (%)"),
    ("tasa_paro", "Tasa de Paro (%)"),
    ("prima_riesgo_bono10", "Prima de Riesgo (pb)"),
    ("crecimiento_pib", "PIB YoY (%)"),
]

ind_sel = st.multiselect(
    "Indicadores a mostrar",
    [k for k, _ in indicadores_disponibles],
    default=["ipc_general", "tasa_paro"],
    format_func=lambda x: dict(indicadores_disponibles).get(x, x),
)

if ind_sel:
    fig_macro = go.Figure()
    colores = [CYAN, BLUE, GREEN, AMBER]

    for i, ind in enumerate(ind_sel):
        label = dict(indicadores_disponibles).get(ind, ind)
        df_serie = cargar_macro_serie(ind, anios=dias_macro // 365 + 1)
        if not df_serie.empty:
            fig_macro.add_trace(
                go.Scatter(
                    x=df_serie["fecha"],
                    y=df_serie["valor"],
                    name=label,
                    mode="lines",
                    line=dict(color=colores[i % len(colores)], width=2),
                )
            )

    if len(fig_macro.data) > 0:
        fig_macro.update_layout(
            height=400,
            xaxis_title="Fecha",
            yaxis_title="Valor",
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            hovermode="x unified",
            legend=dict(orientation="h", y=-0.2, font=dict(color=TEXT2)),
            margin=dict(t=20, b=60),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_macro, use_container_width=True, key="tiempo-real-macro")
    else:
        st.info("Sin series temporales macroeconómicas.")

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Monitor CIS ───────────────────────────────────────────────────────────────
st.markdown(
    f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Monitor CIS</span><div class="line"></div></div>',
    unsafe_allow_html=True,
)
st.markdown(
    """
El monitor CIS detecta nuevas públicaciones de barometros y estudios preelectorales
y los ingesta automaticamente.
"""
)

if not df_log.empty:
    df_cis = df_log[df_log["fuente"].str.contains("cis", case=False, na=False)]
    if not df_cis.empty:
        st.dataframe(
            df_cis[["estado", "n_registros_nuevos", "duracion_segundos", "created_at"]].head(5),
            hide_index=True,
        )
    else:
        st.info("El scraper CIS no ha ejecutado aun en modo live (dry_run activo)")
else:
    st.info("Sin logs de scraping")

if not df_ingest.empty:
    df_cis_ingest = df_ingest[df_ingest["source_name"].str.contains("cis", case=False, na=False)]
    if not df_cis_ingest.empty:
        ultima = _fmt_timestamp(
            df_cis_ingest.iloc[0].get("last_ingested_at") or df_cis_ingest.iloc[0].get("updated_at")
        )
        st.caption(f"Última ingesta CIS registrada: {ultima}")

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Noche electoral ───────────────────────────────────────────────────────────
st.markdown(
    f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Monitor Noche Electoral</span><div class="line"></div></div>',
    unsafe_allow_html=True,
)
st.markdown(
    """
Activalo durante una noche electoral para seguir el escrutinio en tiempo real:
```bash
ELECTSIM_DRY_RUN=false python pipelines/realtime_scheduler.py --flow noche
```
Actualiza `resultados_electorales` incrementalmente conforme avanza el escrutinio
y lanza alertas si se producen vuelcos significativos en escanos.
"""
)
