"""
Campaign Components — Bloque 12.

Componentes de dominio para simulación de campaña,
transferencias de voto y análisis de intervenciones.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, PURPLE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, get_party_color,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_campaign_simulation_result ──────────────────────────────────────────

def render_campaign_simulation_result(
    result: dict[str, Any],
    title: str = "Resultado de simulación de campaña",
) -> None:
    """
    Panel de resultado de simulación de intervención de campaña.

    Args:
        result: Dict con {intervencion, efecto_voto, efecto_confianza,
                           backfire_risk, narrativa_generada?, warnings?}.
        title: Título.
    """
    if not result:
        no_data_state("Resultado de simulación")
        return

    intervencion = result.get("intervencion", result.get("intervention", ""))
    efecto_voto = result.get("efecto_voto", result.get("vote_effect", 0))
    efecto_confianza = result.get("efecto_confianza", result.get("trust_effect", 0))
    backfire = result.get("backfire_risk", result.get("riesgo_backfire", 0))
    narrativa = result.get("narrativa_generada", result.get("narrative", ""))
    warnings = result.get("warnings", [])

    try:
        voto_f = float(efecto_voto)
        voto_color = GREEN if voto_f > 0 else RED
        voto_str = f"{voto_f:+.2f}pp"
    except (TypeError, ValueError):
        voto_color = MUTED
        voto_str = str(efecto_voto)

    try:
        conf_f = float(efecto_confianza)
        conf_color = GREEN if conf_f > 0 else RED
        conf_str = f"{conf_f:+.2f}pts"
    except (TypeError, ValueError):
        conf_color = MUTED
        conf_str = str(efecto_confianza)

    try:
        back_f = float(backfire)
        back_pct = int(back_f * 100)
        back_color = RED if back_f > 0.5 else AMBER if back_f > 0.25 else GREEN
    except (TypeError, ValueError):
        back_pct = 0
        back_color = MUTED

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📢 {title}</p>",
        unsafe_allow_html=True,
    )

    if intervencion:
        st.markdown(
            f"<p style='color:{TEXT2};font-size:12px;font-style:italic;"
            f"border-left:3px solid {CYAN};padding-left:10px;margin-bottom:8px;'>"
            f"{intervencion}</p>",
            unsafe_allow_html=True,
        )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(
            f"<div style='text-align:center;'>"
            f"  <p style='color:{MUTED};font-size:10px;margin:0;'>Efecto en voto</p>"
            f"  <p style='color:{voto_color};font-size:22px;font-weight:800;margin:0;'>"
            f"{voto_str}</p>"
            f"</div>",
            unsafe_allow_html=True,
        )
    with col2:
        st.markdown(
            f"<div style='text-align:center;'>"
            f"  <p style='color:{MUTED};font-size:10px;margin:0;'>Efecto en confianza</p>"
            f"  <p style='color:{conf_color};font-size:22px;font-weight:800;margin:0;'>"
            f"{conf_str}</p>"
            f"</div>",
            unsafe_allow_html=True,
        )
    with col3:
        st.markdown(
            f"<div style='text-align:center;'>"
            f"  <p style='color:{MUTED};font-size:10px;margin:0;'>Riesgo backfire</p>"
            f"  <p style='color:{back_color};font-size:22px;font-weight:800;margin:0;'>"
            f"{back_pct}%</p>"
            f"</div>",
            unsafe_allow_html=True,
        )

    if narrativa:
        st.markdown(
            f"<p style='color:{TEXT2};font-size:12px;margin-top:10px;'>"
            f"📣 {narrativa[:400]}</p>",
            unsafe_allow_html=True,
        )

    for w in (warnings or [])[:3]:
        st.warning(f"⚠️ {w}", icon=None)


# ── render_transfer_sankey ─────────────────────────────────────────────────────

def render_transfer_sankey(
    transfers: list[dict[str, Any]],
    title: str = "Transferencias de voto",
    height: int = 400,
) -> None:
    """
    Diagrama Sankey de transferencias de voto entre partidos.

    Args:
        transfers: Lista de dicts con {source, target, value, label?}.
        title: Título.
        height: Altura.
    """
    if not transfers:
        no_data_state("Transferencias de voto")
        return

    try:
        import plotly.graph_objects as go

        # Extraer nodos únicos
        nodes_set: list[str] = []
        for t in transfers:
            for key in ("source", "target"):
                node = t.get(key, "")
                if node and node not in nodes_set:
                    nodes_set.append(node)

        node_idx = {n: i for i, n in enumerate(nodes_set)}
        node_colors = [get_party_color(n) for n in nodes_set]

        link_sources = [node_idx[t["source"]] for t in transfers if "source" in t and "target" in t]
        link_targets = [node_idx[t["target"]] for t in transfers if "source" in t and "target" in t]
        link_values = [float(t.get("value", 1)) for t in transfers if "source" in t and "target" in t]
        link_labels = [t.get("label", "") for t in transfers if "source" in t and "target" in t]

        from dashboard.ui.tokens import BG2, TEXT2
        fig = go.Figure(go.Sankey(
            node=dict(
                pad=15, thickness=15,
                label=nodes_set,
                color=node_colors,
            ),
            link=dict(
                source=link_sources,
                target=link_targets,
                value=link_values,
                label=link_labels,
                color=[get_party_color(n) + "66" for n in
                       [nodes_set[s] for s in link_sources]],
            ),
        ))
        fig.update_layout(
            title=dict(text=title, font=dict(color=TEXT2, size=12)),
            paper_bgcolor=BG2,
            height=height,
            font_color=TEXT2,
            margin=dict(l=10, r=10, t=40, b=10),
        )
        st.plotly_chart(fig, use_container_width=True)

    except ImportError:
        no_data_state("Sankey", "Instala plotly para ver el diagrama.")
    except Exception as exc:
        logger.warning("Error en Sankey: %s", exc)
        # Fallback tabla
        try:
            import pandas as pd
            df = pd.DataFrame(transfers)
            st.dataframe(df.head(20), use_container_width=True, hide_index=True)
        except Exception:
            for t in transfers[:10]:
                src = t.get("source", "—")
                tgt = t.get("target", "—")
                val = t.get("value", 0)
                st.text(f"{src} → {tgt}: {val}")
