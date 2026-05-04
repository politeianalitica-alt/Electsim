"""
Territory Detail Panel — Bloque 7.

Panel lateral de detalle de un territorio seleccionado:
  - Datos demográficos / económicos / electorales
  - Señales activas
  - Nowcast y escaños
  - Menciones mediáticas
  - Recomendaciones de campaña

Nunca lanza excepciones. Degrada gracefully.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def render_territory_detail_panel(
    territory_id: str,
    engine: Any = None,
) -> None:
    """
    Renderiza el panel de detalle de un territorio.

    Args:
        territory_id: ID del territorio (ej. "prov:28").
        engine: SQLAlchemy engine (None → auto).
    """
    import streamlit as st

    if not territory_id:
        st.info("Selecciona un territorio en el mapa para ver su ficha.")
        return

    # Cargar perfil
    try:
        from dashboard.services.territorial_core import cargar_perfil_territorio
        profile = cargar_perfil_territorio(territory_id, engine)
    except Exception:
        profile = {}

    name = profile.get("name") or territory_id

    st.markdown(f"### 📍 {name}")
    st.caption(f"`{territory_id}`")

    if not profile:
        st.warning("No hay datos disponibles para este territorio.")
        return

    # ── KPIs principales ──────────────────────────────────────────────────────
    st.markdown("#### Indicadores clave")

    c1, c2, c3 = st.columns(3)
    econ_risk = profile.get("economic_risk")
    if econ_risk is not None:
        delta_color = "inverse"
        c1.metric("🏦 Riesgo económico", f"{econ_risk:.0f}/100", delta_color=delta_color)
    else:
        c1.metric("🏦 Riesgo económico", "—")

    unemp = profile.get("unemployment_rate")
    c2.metric("👥 Paro", f"{unemp:.1f}%" if unemp is not None else "—")

    income = profile.get("income_avg")
    c3.metric("💶 Renta media", f"{income:,.0f} €" if income is not None else "—")

    c4, c5, c6 = st.columns(3)
    priority = profile.get("campaign_priority")
    c4.metric("🎯 Prioridad campaña", f"{priority:.0f}/100" if priority is not None else "—")

    alerts = profile.get("active_alerts", 0)
    c5.metric("⚠️ Alertas activas", str(alerts))

    population = profile.get("population")
    c6.metric("👤 Población", f"{population:,}" if population is not None else "—")

    # ── Datos electorales ─────────────────────────────────────────────────────
    st.markdown("#### Situación electoral")

    winner = profile.get("last_election_winner")
    turnout = profile.get("turnout_last")
    swing = profile.get("swing_index")

    e1, e2, e3 = st.columns(3)
    e1.metric("🏆 Último ganador", winner or "—")
    e2.metric("🗳️ Participación", f"{turnout:.1f}%" if turnout is not None else "—")
    e3.metric("📊 Swing", f"{swing:+.1f}pp" if swing is not None else "—")

    # Nowcast si disponible
    try:
        from dashboard.services.electoral_core import cargar_nowcast_actual
        nc = cargar_nowcast_actual(geography=territory_id)
        if nc.get("hay_datos"):
            st.markdown("**Nowcast actual**")
            estimates = nc.get("party_estimates", {})
            if estimates:
                import pandas as pd
                nc_df = pd.DataFrame(
                    [{"Partido": p, "Estimación (%)": f"{v:.1f}"} for p, v in estimates.items()]
                ).sort_values("Estimación (%)", ascending=False)
                st.dataframe(nc_df, hide_index=True, use_container_width=True)
    except Exception:
        pass

    # ── Medios ────────────────────────────────────────────────────────────────
    st.markdown("#### Presencia mediática")
    mentions = profile.get("media_mentions_7d", 0)
    st.metric("📰 Menciones (7 días)", str(mentions))

    # ── Señales activas ───────────────────────────────────────────────────────
    st.markdown("#### Señales territoriales")
    try:
        from dashboard.services.territorial_core import cargar_senales_territoriales
        import pandas as pd

        sig_df = cargar_senales_territoriales(
            min_severity="LOW",
            days_back=14,
            limit=10,
            engine=engine,
        )
        if not sig_df.empty and "territory_id" in sig_df.columns:
            sig_df = sig_df[sig_df["territory_id"] == territory_id]

        if sig_df.empty:
            st.caption("Sin señales recientes.")
        else:
            for _, sig in sig_df.iterrows():
                from dashboard.components.province_cards import SIGNAL_ICONS, SEVERITY_COLORS
                icon = SIGNAL_ICONS.get(sig.get("signal_type", ""), "📍")
                sev_icon = SEVERITY_COLORS.get(sig.get("severity", "LOW"), "⚪")
                st.markdown(
                    f"{sev_icon} {icon} **{sig.get('signal_type', '')}** "
                    f"({sig.get('value', 0):.0f}/100)  \n"
                    f"_{sig.get('explanation', '')}_"
                )
    except Exception as exc:
        logger.debug("render_territory_detail_panel señales: %s", exc)
        st.caption("No se pudieron cargar señales.")

    # ── Recomendaciones de campaña ────────────────────────────────────────────
    st.markdown("#### Recomendaciones de campaña")
    try:
        from dashboard.services.campaign_core import recomendar_mensajes
        recs = recomendar_mensajes(party_id=None, geography=territory_id, top_n=3)
        if recs:
            for rec in recs:
                theme = rec.get("theme", "—")
                gain = rec.get("estimated_gain", 0)
                st.caption(f"💡 **{theme}** — ganancia estimada {gain:.2f}pp")
        else:
            st.caption("Sin recomendaciones disponibles.")
    except Exception:
        st.caption("Módulo de campaña no disponible.")


def render_layer_selector(
    available_layers: list[str] | None = None,
    default_layer: str = "electoral",
    key: str = "territory_layer_select",
) -> str:
    """
    Renderiza un selector de capas temáticas del mapa.

    Args:
        available_layers: Lista de capas disponibles.
        default_layer: Capa seleccionada por defecto.
        key: Clave única para el widget Streamlit.

    Returns:
        Nombre de la capa seleccionada.
    """
    import streamlit as st

    layers = available_layers or [
        "electoral",
        "economico",
        "medios",
        "riesgo",
        "prioridad_campana",
    ]

    layer_labels = {
        "electoral":        "🗳️ Electoral (ganador / swing)",
        "economico":        "📉 Económico (paro / renta)",
        "medios":           "📰 Medios (intensidad)",
        "riesgo":           "⚠️ Riesgo (exposición actores)",
        "prioridad_campana": "🎯 Prioridad de campaña",
    }

    label_to_key = {v: k for k, v in layer_labels.items()}
    labels = [layer_labels.get(l, l) for l in layers]
    default_label = layer_labels.get(default_layer, labels[0])

    selected_label = st.selectbox(
        "📍 Capa del mapa",
        options=labels,
        index=labels.index(default_label) if default_label in labels else 0,
        key=key,
    )

    return label_to_key.get(selected_label, selected_label)
