"""Componente visual de salud/frescura de datos."""

from __future__ import annotations

import pandas as pd
import streamlit as st

from dashboard.db import cargar_checks_calidad, cargar_data_health


def render_data_health(tablas: list[str] | None = None, show_checks: bool = True) -> None:
    """
    Renderiza estado de frescura y calidad por tabla.
    No rompe si las tablas de observabilidad todavía no existen.
    """
    df = cargar_data_health(tablas)
    if df.empty:
        st.info("Sin metadatos de ingesta/calidad aún. Ejecuta la migración de observabilidad y el próximo ETL.")
        return

    work = df.copy()
    work["tabla"] = work["tabla"].astype(str)
    work["estado_global"] = work["estado_global"].fillna("warn").astype(str).str.lower()
    work["estado_tag"] = work["estado_global"].map(
        {
            "ok": "OK",
            "warn": "WARNING",
            "fail": "FAIL",
        }
    ).fillna("WARNING")

    total = len(work)
    ok_n = int((work["estado_global"] == "ok").sum())
    warn_n = int((work["estado_global"] == "warn").sum())
    fail_n = int((work["estado_global"] == "fail").sum())

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Tablas monitorizadas", total)
    c2.metric("OK", ok_n)
    c3.metric("Warning", warn_n)
    c4.metric("Fail", fail_n)

    cols_show = [
        "tabla",
        "pipeline",
        "estado_ingesta",
        "estado_tag",
        "delay_min",
        "max_delay_min",
        "cadencia",
        "finished_at",
        "status_ultimo_check",
        "ultimo_check",
    ]
    cols_show = [c for c in cols_show if c in work.columns]
    view = work[cols_show].copy()
    rename = {
        "estado_tag": "estado_global",
        "delay_min": "delay_minutos",
        "max_delay_min": "sla_max_delay_min",
        "finished_at": "ultima_ingesta",
        "status_ultimo_check": "ultimo_check_status",
    }
    view = view.rename(columns={k: v for k, v in rename.items() if k in view.columns})

    def _row_style(row: pd.Series) -> list[str]:
        estado = str(row.get("estado_global", "WARNING")).upper()
        if estado == "FAIL":
            color = "background-color: rgba(239,68,68,0.12);"
        elif estado == "WARNING":
            color = "background-color: rgba(245,158,11,0.10);"
        else:
            color = "background-color: rgba(34,197,94,0.10);"
        return [color] * len(row)

    st.dataframe(view.style.apply(_row_style, axis=1), hide_index=True, use_container_width=True)

    if show_checks:
        st.markdown("##### Últimos checks de calidad")
        df_chk = cargar_checks_calidad(limite=20)
        if df_chk.empty:
            st.caption("Sin checks de calidad registrados todavía.")
        else:
            cols_chk = [c for c in ["tabla", "check_name", "status", "metric_value", "threshold", "created_at", "detalle"] if c in df_chk.columns]
            st.dataframe(df_chk[cols_chk], hide_index=True, use_container_width=True)
