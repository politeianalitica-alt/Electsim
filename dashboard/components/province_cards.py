"""
Province Cards — Bloque 7.

Componente Streamlit para renderizar tarjetas de territorios "calientes":
  - render_hot_territories_cards → ranking de provincias prioritarias
  - render_territory_mini_card   → tarjeta compacta de un territorio
  - render_territory_kpi_row     → fila de métricas clave de un territorio

Nunca lanza excepciones.
"""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# Iconos por tipo de señal
SIGNAL_ICONS = {
    "electoral_swing":        "🗳️",
    "economic_stress":        "📉",
    "media_intensity":        "📰",
    "campaign_priority":      "🎯",
    "soft_vote_opportunity":  "💡",
    "risk_exposure":          "⚠️",
    "legislative_impact":     "📜",
    "turnout_risk":           "👥",
    "contracting_opportunity": "💼",
    "demographic_pressure":   "📊",
}

SEVERITY_COLORS = {
    "CRITICAL": "🔴",
    "HIGH":     "🟠",
    "MEDIUM":   "🟡",
    "LOW":      "🟢",
}


def render_hot_territories_cards(
    df: pd.DataFrame,
    title: str = "🎯 Territorios Prioritarios",
    n_cols: int = 3,
    show_signals: bool = True,
    engine: Any = None,
) -> None:
    """
    Renderiza ranking de territorios por prioridad de campaña como tarjetas.

    Args:
        df: DataFrame con columnas: territory_id, name, campaign_priority,
            economic_risk, unemployment_rate, active_alerts.
        title: Título de la sección.
        n_cols: Número de columnas de tarjetas.
        show_signals: Si True, muestra señales activas bajo cada tarjeta.
        engine: SQLAlchemy engine para cargar señales.
    """
    import streamlit as st

    st.subheader(title)

    if df.empty:
        st.info("ℹ️ No hay territorios con datos de prioridad disponibles.")
        return

    # Asegurar que tenemos las columnas mínimas
    rows = df.to_dict("records")
    cols = st.columns(n_cols)

    for i, row in enumerate(rows):
        col = cols[i % n_cols]
        with col:
            _render_territory_card(row, show_signals=show_signals, engine=engine)


def _render_territory_card(row: dict, show_signals: bool = True, engine: Any = None) -> None:
    """Renderiza una tarjeta individual de territorio."""
    import streamlit as st

    priority = row.get("campaign_priority") or 0.0
    name = row.get("name") or row.get("territory_id", "—")
    territory_id = row.get("territory_id", "")
    alerts = row.get("active_alerts") or 0
    econ_risk = row.get("economic_risk")
    unemp = row.get("unemployment_rate")

    # Color de prioridad
    if priority >= 80:
        border_color = "#dc2626"   # rojo
        badge = "🔴 CRÍTICO"
    elif priority >= 60:
        border_color = "#f97316"   # naranja
        badge = "🟠 ALTO"
    elif priority >= 40:
        border_color = "#eab308"   # amarillo
        badge = "🟡 MEDIO"
    else:
        border_color = "#22c55e"   # verde
        badge = "🟢 BAJO"

    with st.container():
        st.markdown(
            f"""
            <div style="border-left: 4px solid {border_color};
                        padding: 8px 12px; margin-bottom: 8px;
                        background: #f8f9fa; border-radius: 4px;">
                <strong>{name}</strong> {badge}<br/>
                <small style="color:#666;">{territory_id}</small>
            </div>
            """,
            unsafe_allow_html=True,
        )

        c1, c2, c3 = st.columns(3)
        c1.metric("Prioridad", f"{priority:.0f}/100")

        if econ_risk is not None:
            c2.metric("Riesgo eco.", f"{econ_risk:.0f}")
        elif unemp is not None:
            c2.metric("Paro", f"{unemp:.1f}%")
        else:
            c2.metric("Alertas", str(alerts))

        c3.metric("Alertas", str(alerts))

        if show_signals and territory_id:
            try:
                from dashboard.services.territorial_core import cargar_senales_territoriales
                sig_df = cargar_senales_territoriales(
                    min_severity="HIGH",
                    days_back=7,
                    limit=3,
                    engine=engine,
                )
                if not sig_df.empty and "territory_id" in sig_df.columns:
                    sig_df = sig_df[sig_df["territory_id"] == territory_id]
                    for _, sig in sig_df.iterrows():
                        icon = SIGNAL_ICONS.get(sig.get("signal_type", ""), "📍")
                        sev_icon = SEVERITY_COLORS.get(sig.get("severity", "LOW"), "⚪")
                        st.caption(f"{sev_icon} {icon} {sig.get('explanation', '')[:60]}...")
            except Exception:
                pass

        st.divider()


def render_territory_mini_card(
    territory_id: str,
    name: str | None = None,
    priority: float | None = None,
    signals: list[dict] | None = None,
) -> None:
    """
    Renderiza una tarjeta mínima de territorio (inline).

    Args:
        territory_id: ID del territorio.
        name: Nombre legible.
        priority: Prioridad de campaña (0-100).
        signals: Lista de señales activas.
    """
    import streamlit as st

    display_name = name or territory_id

    if priority is not None:
        prio_str = f" | 🎯 {priority:.0f}/100"
    else:
        prio_str = ""

    st.markdown(f"**{display_name}** `{territory_id}`{prio_str}")

    if signals:
        for sig in signals[:3]:
            icon = SIGNAL_ICONS.get(sig.get("signal_type", ""), "📍")
            sev = SEVERITY_COLORS.get(sig.get("severity", "LOW"), "⚪")
            expl = sig.get("explanation", "")[:80]
            st.caption(f"{sev} {icon} {expl}")


def render_territory_kpi_row(profile: dict) -> None:
    """
    Renderiza fila de métricas clave de un territorio.

    Args:
        profile: Dict con datos del perfil del territorio.
    """
    import streamlit as st

    if not profile:
        return

    cols = st.columns(5)
    data_map = [
        ("🎯 Prioridad", profile.get("campaign_priority"), "/100"),
        ("📉 Riesgo eco.", profile.get("economic_risk"), "/100"),
        ("👥 Paro", profile.get("unemployment_rate"), "%"),
        ("🗳️ Último ganador", profile.get("last_election_winner"), ""),
        ("⚠️ Alertas", profile.get("active_alerts"), ""),
    ]

    for col, (label, value, suffix) in zip(cols, data_map):
        if value is not None:
            if isinstance(value, float):
                display = f"{value:.1f}{suffix}"
            else:
                display = f"{value}{suffix}"
            col.metric(label, display)
        else:
            col.metric(label, "—")
