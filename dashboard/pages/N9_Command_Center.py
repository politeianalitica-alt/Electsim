"""
N9 — Command Center · Data Operations — Bloque 8.

Centro de control avanzado del sistema de datos:
  Tab 1 — Fuentes        : registro de fuentes, salud en tiempo real
  Tab 2 — Pipelines      : catálogo y ejecuciones recientes
  Tab 3 — Calidad        : resultados de checks de calidad
  Tab 4 — Caché          : estadísticas de la caché HTTP
  Tab 5 — Backfills      : solicitudes de reingesta
  Tab 6 — Lineage        : árbol de linaje de objetos
  Tab 7 — Logs           : log de ejecuciones con filtros
  Tab 8 — Sistema        : KPIs globales + alertas operativas

Alimentado por dashboard.services.data_ops_core y etl.operations.*.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    section_header, kpi_card,
)

st.set_page_config(
    page_title="Command Center · Datos · Politeia",
    layout="wide",
    initial_sidebar_state="collapsed",
)
sidebar_nav()
aplicar_estilos()

# ── Imports de servicio ────────────────────────────────────────────────────────

try:
    from dashboard.services.data_ops_core import (
        cargar_kpis_data_ops,
        cargar_estado_fuentes,
        cargar_source_health,
        cargar_pipeline_runs,
        cargar_pipelines_registry,
        cargar_quality_results,
        cargar_quality_summary,
        cargar_cache_stats,
        cargar_raw_manifest,
        cargar_lineage,
        cargar_modulos_freshness,
    )
    _SERVICE_OK = True
except Exception as _e:
    _SERVICE_OK = False
    _SERVICE_ERR = str(_e)

# ── Header ─────────────────────────────────────────────────────────────────────

st.markdown(
    f'<h1 style="color:{CYAN};margin-bottom:4px">🖥️ Command Center · Datos</h1>',
    unsafe_allow_html=True,
)
st.markdown(
    f'<p style="color:{MUTED};margin-top:0">'
    f'Operaciones ETL · Fuentes · Calidad · Caché · Linaje</p>',
    unsafe_allow_html=True,
)

if not _SERVICE_OK:
    st.error(f"Servicio data_ops_core no disponible: {_SERVICE_ERR}")
    st.stop()

# ── Tabs ───────────────────────────────────────────────────────────────────────

(
    tab_fuentes,
    tab_pipelines,
    tab_calidad,
    tab_cache,
    tab_backfills,
    tab_lineage,
    tab_logs,
    tab_sistema,
) = st.tabs([
    "🔌 Fuentes",
    "🔄 Pipelines",
    "✅ Calidad",
    "💾 Caché",
    "↩️ Backfills",
    "🔗 Linaje",
    "📋 Logs",
    "🩺 Sistema",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — FUENTES
# ═══════════════════════════════════════════════════════════════════════════════

with tab_fuentes:
    section_header("Registro de Fuentes de Datos", "🔌")

    col_f1, col_f2 = st.columns([1, 3])
    with col_f1:
        domain_filter = st.selectbox(
            "Dominio",
            ["todos", "electoral", "media", "economic", "legislative",
             "geospatial", "social", "risk", "institutional", "internal"],
            key="fuentes_domain",
        )
        show_inactive = st.checkbox("Mostrar inactivas", key="fuentes_inactive")

    domain_arg = None if domain_filter == "todos" else domain_filter
    df_fuentes = cargar_estado_fuentes(domain=domain_arg)

    if not df_fuentes.empty and not show_inactive and "active" in df_fuentes.columns:
        df_fuentes = df_fuentes[df_fuentes["active"] == True]

    if df_fuentes.empty:
        st.info("No hay fuentes registradas para este dominio.")
    else:
        # KPI rápido
        c1, c2, c3, c4 = st.columns(4)
        status_col = df_fuentes.get("status", pd.Series(["unknown"] * len(df_fuentes)))
        with c1:
            kpi_card("Total", str(len(df_fuentes)), color=TEXT2)
        with c2:
            kpi_card("Healthy", str((status_col == "healthy").sum()), color=GREEN)
        with c3:
            kpi_card("Degradadas", str((status_col == "degraded").sum()), color=AMBER)
        with c4:
            kpi_card("Caídas", str((status_col == "down").sum()), color=RED)

        st.dataframe(df_fuentes, use_container_width=True, height=400)

    # Source health histórico
    st.divider()
    section_header("Salud Histórica de Fuentes", "📈")
    df_health = cargar_source_health()
    if df_health.empty:
        st.caption("Sin historial de salud disponible.")
    else:
        src_sel = st.selectbox(
            "Filtrar por fuente",
            ["todas"] + sorted(df_health["source_id"].unique().tolist()),
            key="health_src_sel",
        )
        df_h = df_health if src_sel == "todas" else df_health[df_health["source_id"] == src_sel]
        st.dataframe(df_h, use_container_width=True, height=280)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — PIPELINES
# ═══════════════════════════════════════════════════════════════════════════════

with tab_pipelines:
    section_header("Catálogo de Pipelines", "📋")

    df_registry = cargar_pipelines_registry()
    if df_registry.empty:
        st.info("No hay pipelines registrados.")
    else:
        st.dataframe(df_registry, use_container_width=True, height=220)

    st.divider()
    section_header("Ejecuciones Recientes", "🕐")

    col_p1, col_p2 = st.columns([2, 1])
    with col_p1:
        pipeline_filter = st.text_input(
            "Filtrar por pipeline_id (vacío = todos)", key="pipeline_filter"
        )
    with col_p2:
        runs_limit = st.slider("Límite", 20, 200, 50, 10, key="runs_limit")

    pid = pipeline_filter.strip() or None
    df_runs = cargar_pipeline_runs(pipeline_id=pid, limit=runs_limit)

    if df_runs.empty:
        st.info("No hay ejecuciones registradas.")
    else:
        status_colors = {
            "success": GREEN, "failed": RED, "running": CYAN,
            "partial": AMBER, "skipped": MUTED,
        }

        # Mini gráfico de estado
        if "status" in df_runs.columns:
            df_status = df_runs["status"].value_counts().reset_index()
            df_status.columns = ["status", "count"]
            fig_runs = go.Figure(go.Bar(
                x=df_status["status"],
                y=df_status["count"],
                marker_color=[status_colors.get(s, MUTED) for s in df_status["status"]],
                text=df_status["count"],
                textposition="outside",
            ))
            fig_runs.update_layout(
                paper_bgcolor=BG, plot_bgcolor=BG2, font_color=TEXT2,
                height=200, margin=dict(l=0, r=0, t=20, b=0),
                xaxis=dict(gridcolor=BORDER), yaxis=dict(gridcolor=BORDER),
                showlegend=False,
            )
            st.plotly_chart(fig_runs, use_container_width=True)

        display_cols = [c for c in [
            "pipeline_id", "source_id", "status", "started_at",
            "duration_seconds", "records_extracted", "records_loaded",
            "records_failed", "error_type",
        ] if c in df_runs.columns]
        st.dataframe(df_runs[display_cols], use_container_width=True, height=320)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — CALIDAD
# ═══════════════════════════════════════════════════════════════════════════════

with tab_calidad:
    section_header("Checks de Calidad de Datos", "✅")

    quality = cargar_quality_summary()
    qc1, qc2, qc3, qc4, qc5 = st.columns(5)
    qpass = quality.get("pass_pct", round(quality.get("pass_rate", 1.0) * 100, 1))
    with qc1:
        kpi_card("Total", str(quality.get("total", 0)), color=TEXT2)
    with qc2:
        kpi_card("Pasados", str(quality.get("passed", 0)), color=GREEN)
    with qc3:
        kpi_card("Fallidos", str(quality.get("failed", 0)),
                 color=RED if quality.get("failed", 0) else MUTED)
    with qc4:
        kpi_card("Avisos", str(quality.get("warning", 0)),
                 color=AMBER if quality.get("warning", 0) else MUTED)
    with qc5:
        kpi_card("Pass rate", f"{qpass:.1f}%",
                 color=GREEN if qpass >= 90 else AMBER if qpass >= 70 else RED)

    st.divider()

    col_q1, col_q2 = st.columns([1, 2])
    with col_q1:
        q_limit = st.slider("Últimos N checks", 20, 200, 50, key="q_limit")
    with col_q2:
        q_status_filter = st.multiselect(
            "Filtrar por estado",
            ["passed", "failed", "warning", "skipped"],
            default=[],
            key="q_status_filter",
        )

    df_quality = cargar_quality_results(limit=q_limit)

    if not df_quality.empty and q_status_filter and "status" in df_quality.columns:
        df_quality = df_quality[df_quality["status"].isin(q_status_filter)]

    if df_quality.empty:
        st.info("No hay resultados de calidad disponibles.")
    else:
        display_cols = [c for c in [
            "name", "table_name", "domain", "check_type",
            "severity", "status", "checked_at",
            "metric_value", "threshold", "records_checked", "records_failed",
        ] if c in df_quality.columns]
        st.dataframe(df_quality[display_cols], use_container_width=True, height=420)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — CACHÉ
# ═══════════════════════════════════════════════════════════════════════════════

with tab_cache:
    section_header("Estadísticas de Caché HTTP", "💾")

    cache_stats = cargar_cache_stats()

    if not cache_stats.get("available", True) is False and cache_stats:
        total_entries = cache_stats.get("total_entries", 0)
        total_size = cache_stats.get("total_size_bytes", 0)
        domains = cache_stats.get("domains", {})
        hit_rate = cache_stats.get("hit_rate", None)

        ca1, ca2, ca3, ca4 = st.columns(4)
        with ca1:
            kpi_card("Entradas", str(total_entries), color=CYAN)
        with ca2:
            size_mb = round(total_size / 1024 / 1024, 1) if total_size else 0
            kpi_card("Tamaño", f"{size_mb} MB", color=BLUE)
        with ca3:
            kpi_card("Dominios", str(len(domains)), color=PURPLE)
        with ca4:
            if hit_rate is not None:
                kpi_card("Hit rate", f"{round(hit_rate*100,1)}%",
                         color=GREEN if hit_rate > 0.7 else AMBER)
            else:
                kpi_card("Hit rate", "N/A", color=MUTED)

        if domains:
            st.divider()
            st.markdown(f"**Distribución por dominio**")
            df_cache = pd.DataFrame([
                {"domain": k, "entries": v}
                for k, v in domains.items()
            ]).sort_values("entries", ascending=False)
            fig_cache = go.Figure(go.Bar(
                x=df_cache["domain"],
                y=df_cache["entries"],
                marker_color=CYAN,
                text=df_cache["entries"],
                textposition="outside",
            ))
            fig_cache.update_layout(
                paper_bgcolor=BG, plot_bgcolor=BG2, font_color=TEXT2,
                height=220, margin=dict(l=0, r=0, t=20, b=0),
                xaxis=dict(gridcolor=BORDER), yaxis=dict(gridcolor=BORDER),
            )
            st.plotly_chart(fig_cache, use_container_width=True)

        # Mostrar stats raw
        with st.expander("Ver estadísticas completas"):
            st.json(cache_stats)
    else:
        st.info("Tabla de caché HTTP no disponible o vacía.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — BACKFILLS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_backfills:
    section_header("Generador de Backfills", "↩️")

    st.markdown(
        f'<p style="color:{MUTED}">Genera el comando CLI para reingestar datos '
        f'de una fuente en un rango de fechas.</p>',
        unsafe_allow_html=True,
    )

    col_b1, col_b2, col_b3 = st.columns(3)
    with col_b1:
        bf_source = st.text_input("source_id o pipeline_id", key="bf_source")
    with col_b2:
        from datetime import date, timedelta
        bf_start = st.date_input("Desde", value=date.today() - timedelta(days=7), key="bf_start")
    with col_b3:
        bf_end = st.date_input("Hasta", value=date.today(), key="bf_end")

    if st.button("Generar comando", key="bf_btn") and bf_source.strip():
        try:
            from etl.operations.backfill import backfill_source
            result = backfill_source(
                bf_source.strip(),
                start_date=str(bf_start),
                end_date=str(bf_end),
            )
            if result.get("command"):
                st.code(result["command"], language="bash")
                if result.get("notes"):
                    st.caption(result["notes"])
            else:
                st.warning(result.get("error", "No se pudo generar el comando."))
        except Exception as exc:
            st.error(f"Error: {exc}")

    st.divider()
    section_header("Reintentos de Runs Fallidos", "🔁")

    if st.button("Consultar runs fallidos (24h)", key="retry_btn"):
        try:
            from etl.operations.backfill import retry_failed_runs
            from dashboard.shared import get_engine
            failed = retry_failed_runs(engine=get_engine())
            if failed:
                st.dataframe(pd.DataFrame(failed), use_container_width=True)
            else:
                st.success("No hay runs fallidos recientes.")
        except Exception as exc:
            st.error(f"Error al consultar runs: {exc}")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6 — LINEAGE
# ═══════════════════════════════════════════════════════════════════════════════

with tab_lineage:
    section_header("Árbol de Linaje de Datos", "🔗")

    col_l1, col_l2 = st.columns(2)
    with col_l1:
        lin_type = st.selectbox(
            "Tipo de objeto",
            ["table", "source", "pipeline", "manifest", "model"],
            key="lin_type",
        )
    with col_l2:
        lin_id = st.text_input("ID del objeto", key="lin_id",
                               placeholder="ej: sondeos, pipeline_electoral_scraper")

    if st.button("Consultar linaje", key="lin_btn") and lin_id.strip():
        result = cargar_lineage(lin_type, lin_id.strip())

        if result.get("upstream") or result.get("downstream"):
            col_up, col_down = st.columns(2)
            with col_up:
                st.markdown(f"**⬆️ Upstream ({len(result['upstream'])})**")
                for node in result["upstream"]:
                    st.markdown(
                        f"- `{node.get('object_type', '?')}:{node.get('object_id', '?')}`"
                        f" ← *{node.get('transformation', '')}*"
                    )
            with col_down:
                st.markdown(f"**⬇️ Downstream ({len(result['downstream'])})**")
                for node in result["downstream"]:
                    st.markdown(
                        f"- `{node.get('object_type', '?')}:{node.get('object_id', '?')}`"
                        f" → *{node.get('transformation', '')}*"
                    )
        else:
            st.info("No se encontraron relaciones de linaje para este objeto.")

        with st.expander("Ver respuesta completa"):
            st.json(result)

    st.divider()
    section_header("Manifiesto de Ficheros Brutos", "📂")

    col_m1, col_m2 = st.columns([2, 1])
    with col_m1:
        manifest_src = st.text_input("Filtrar por source_id", key="manifest_src")
    with col_m2:
        manifest_limit = st.slider("Límite", 10, 100, 20, key="manifest_limit")

    df_manifest = cargar_raw_manifest(
        source_id=manifest_src.strip() or None,
        limit=manifest_limit,
    )
    if df_manifest.empty:
        st.caption("No hay entradas en el manifiesto.")
    else:
        st.dataframe(df_manifest, use_container_width=True, height=280)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 7 — LOGS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_logs:
    section_header("Log de Ejecuciones ETL", "📋")

    col_lg1, col_lg2, col_lg3 = st.columns(3)
    with col_lg1:
        log_pipeline = st.text_input("Pipeline ID (vacío = todos)", key="log_pipeline")
    with col_lg2:
        log_limit = st.slider("Límite de registros", 20, 500, 100, key="log_limit")
    with col_lg3:
        log_status = st.multiselect(
            "Estado",
            ["success", "failed", "running", "partial", "skipped"],
            default=[],
            key="log_status",
        )

    df_logs = cargar_pipeline_runs(
        pipeline_id=log_pipeline.strip() or None,
        limit=log_limit,
    )

    if not df_logs.empty and log_status and "status" in df_logs.columns:
        df_logs = df_logs[df_logs["status"].isin(log_status)]

    if df_logs.empty:
        st.info("No hay registros para los filtros seleccionados.")
    else:
        display_cols = [c for c in [
            "run_id", "pipeline_id", "source_id", "status",
            "started_at", "finished_at", "duration_seconds",
            "records_extracted", "records_loaded", "records_failed",
            "error_type", "error_message",
        ] if c in df_logs.columns]
        st.dataframe(df_logs[display_cols], use_container_width=True, height=450)

        # Export
        csv = df_logs[display_cols].to_csv(index=False)
        st.download_button(
            "⬇️ Exportar CSV",
            data=csv,
            file_name="pipeline_logs.csv",
            mime="text/csv",
        )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 8 — SISTEMA
# ═══════════════════════════════════════════════════════════════════════════════

with tab_sistema:
    section_header("Estado Global del Sistema de Datos", "🩺")

    kpis = cargar_kpis_data_ops()

    overall = kpis.get("overall_status", "unknown")
    status_colors_map = {
        "healthy": GREEN, "warning": AMBER,
        "degraded": RED, "unknown": MUTED,
    }
    overall_color = status_colors_map.get(overall, MUTED)

    st.markdown(
        f"""<div style="background:{BG2};border:1px solid {overall_color};
        border-left:6px solid {overall_color};border-radius:8px;
        padding:16px;margin-bottom:20px">
        <div style="font-size:1.4rem;font-weight:700;color:{overall_color}">
          Estado: {overall.upper()}
        </div>
        <div style="color:{MUTED};font-size:.85rem;margin-top:4px">
          Actualizado: {str(kpis.get("computed_at","—"))[:19]}
        </div>
        </div>""",
        unsafe_allow_html=True,
    )

    col_s1, col_s2 = st.columns(2)

    with col_s1:
        st.markdown(f"**Fuentes**")
        metrics = {
            "Healthy": (kpis.get("sources_healthy", 0), GREEN),
            "Degradadas": (kpis.get("sources_degraded", 0), AMBER),
            "Caídas": (kpis.get("sources_down", 0), RED),
            "Desconocidas": (kpis.get("sources_unknown", 0), MUTED),
        }
        for label, (val, color) in metrics.items():
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;'
                f'padding:4px 0;border-bottom:1px solid {BORDER};font-size:.85rem">'
                f'<span style="color:{TEXT2}">{label}</span>'
                f'<span style="color:{color};font-weight:600">{val}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown(f"<br>**Pipelines (24h)**", unsafe_allow_html=True)
        pipeline_metrics = {
            "Runs OK": (kpis.get("pipelines_ok_24h", 0), GREEN),
            "Runs fallidos": (kpis.get("pipelines_failed_24h", 0), RED),
        }
        for label, (val, color) in pipeline_metrics.items():
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;'
                f'padding:4px 0;border-bottom:1px solid {BORDER};font-size:.85rem">'
                f'<span style="color:{TEXT2}">{label}</span>'
                f'<span style="color:{color};font-weight:600">{val}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with col_s2:
        st.markdown(f"**Módulos**")
        module_metrics = {
            "Fresh": (kpis.get("modules_fresh", 0), GREEN),
            "Stale": (kpis.get("modules_stale", 0), AMBER),
            "Desconocidos": (kpis.get("modules_unknown", 0), MUTED),
        }
        for label, (val, color) in module_metrics.items():
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;'
                f'padding:4px 0;border-bottom:1px solid {BORDER};font-size:.85rem">'
                f'<span style="color:{TEXT2}">{label}</span>'
                f'<span style="color:{color};font-weight:600">{val}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown(f"<br>**Calidad & Alertas**", unsafe_allow_html=True)
        qr = kpis.get("quality_pass_rate", 1.0)
        quality_color = GREEN if qr >= 0.9 else AMBER if qr >= 0.7 else RED
        other_metrics = {
            "Quality pass rate": (f"{round(qr*100,1)}%", quality_color),
            "Alertas activas": (
                str(kpis.get("total_alerts", 0)),
                RED if kpis.get("total_alerts", 0) > 0 else MUTED,
            ),
        }
        for label, (val, color) in other_metrics.items():
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;'
                f'padding:4px 0;border-bottom:1px solid {BORDER};font-size:.85rem">'
                f'<span style="color:{TEXT2}">{label}</span>'
                f'<span style="color:{color};font-weight:600">{val}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Freshness por módulo
    st.divider()
    section_header("Frescura por Módulo", "🕐")
    df_fresh = cargar_modulos_freshness()
    if df_fresh.empty:
        st.info("Sin datos de frescura disponibles.")
    else:
        display_cols = [c for c in
                        ["module", "table", "status", "last_update",
                         "lag_minutes", "expected_minutes"]
                        if c in df_fresh.columns]
        st.dataframe(df_fresh[display_cols] if display_cols else df_fresh,
                     use_container_width=True, height=280)

    # Acciones de mantenimiento
    st.divider()
    section_header("Acciones de Mantenimiento", "🛠️")
    col_a1, col_a2, col_a3 = st.columns(3)

    with col_a1:
        if st.button("🔄 Refrescar KPIs", key="refresh_kpis"):
            st.rerun()

    with col_a2:
        if st.button("🌱 Seed fuentes y pipelines", key="seed_btn"):
            try:
                from etl.operations.source_registry import seed_default_sources
                from etl.operations.pipeline_registry import seed_default_pipelines
                from dashboard.shared import get_engine
                eng = get_engine()
                seed_default_sources(eng)
                seed_default_pipelines(eng)
                st.success("Fuentes y pipelines registrados en BD.")
            except Exception as exc:
                st.error(f"Error: {exc}")

    with col_a3:
        if st.button("✅ Ejecutar quality checks", key="quality_btn"):
            try:
                from etl.operations.quality_checks import run_all_checks, get_quality_summary
                from dashboard.shared import get_engine
                results = run_all_checks(engine=get_engine(), persist=True)
                summary = get_quality_summary(results)
                st.success(
                    f"Checks completados: {summary.get('passed',0)} OK, "
                    f"{summary.get('failed',0)} fallidos, "
                    f"{summary.get('skipped',0)} omitidos."
                )
            except Exception as exc:
                st.error(f"Error: {exc}")
