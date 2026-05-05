"""
Electoral Components — Bloque 12.

Componentes de dominio para proyecciones electorales,
hemiciclo, coaliciones y voto blando.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, get_party_color,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_nowcast_card ────────────────────────────────────────────────────────

def render_nowcast_card(
    nowcast: dict[str, Any],
    title: str = "Nowcast electoral",
) -> None:
    """
    Tarjeta de nowcast electoral por partido.

    Args:
        nowcast: Dict con {partido: {voto_estimado, intervalo_confianza?,
                                      variacion?, escanos?}}.
        title: Título.
    """
    if not nowcast:
        no_data_state("Nowcast")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🗳️ {title}</p>",
        unsafe_allow_html=True,
    )

    # Ordenar por voto estimado
    try:
        sorted_parties = sorted(
            nowcast.items(),
            key=lambda kv: float(kv[1].get("voto_estimado", kv[1].get("vote", 0)))
                if isinstance(kv[1], dict) else float(kv[1]),
            reverse=True,
        )
    except Exception:
        sorted_parties = list(nowcast.items())

    for partido, data in sorted_parties[:10]:
        if isinstance(data, dict):
            voto = data.get("voto_estimado", data.get("vote", 0))
            variacion = data.get("variacion", data.get("change"))
            escanos = data.get("escanos", data.get("seats"))
            ci_low = data.get("ci_low")
            ci_high = data.get("ci_high")
        else:
            voto = data
            variacion = escanos = ci_low = ci_high = None

        try:
            voto_f = float(voto)
        except (TypeError, ValueError):
            voto_f = 0.0

        party_color = get_party_color(partido)

        var_html = ""
        if variacion is not None:
            try:
                var_f = float(variacion)
                var_color = GREEN if var_f > 0 else RED
                var_html = f"<span style='color:{var_color};font-size:10px;'>{var_f:+.1f}pp</span>"
            except (TypeError, ValueError):
                pass

        seats_html = (
            f"<span style='color:{MUTED};font-size:10px;'>{escanos}esc</span>"
            if escanos is not None else ""
        )

        ci_html = ""
        if ci_low is not None and ci_high is not None:
            ci_html = (
                f"<span style='color:{MUTED};font-size:9px;'>"
                f"[{float(ci_low):.1f}–{float(ci_high):.1f}]</span>"
            )

        st.markdown(
            f"<div style='display:flex;align-items:center;gap:8px;margin:3px 0;'>"
            f"  <span style='color:{party_color};font-size:12px;font-weight:700;"
            f"min-width:60px;'>{partido}</span>"
            f"  <div style='flex:1;height:8px;background:{BORDER};border-radius:4px;'>"
            f"    <div style='width:{min(voto_f, 50) * 2:.0f}%;height:100%;"
            f"background:{party_color};border-radius:4px;'></div>"
            f"  </div>"
            f"  <span style='color:{TEXT};font-size:13px;font-weight:700;"
            f"min-width:40px;text-align:right;'>{voto_f:.1f}%</span>"
            f"  {var_html} {seats_html} {ci_html}"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_seat_projection_panel ───────────────────────────────────────────────

def render_seat_projection_panel(
    seats: dict[str, int],
    total_seats: int = 350,
    majority: int = 176,
    title: str = "Proyección de escaños",
) -> None:
    """
    Panel de distribución de escaños.

    Args:
        seats: Dict {partido: n_escanos}.
        total_seats: Total de escaños (default 350 Congreso).
        majority: Umbral de mayoría absoluta (default 176).
        title: Título.
    """
    if not seats:
        no_data_state("Escaños")
        return

    total_projected = sum(seats.values())

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🏛️ {title} — Mayoría: {majority}</p>",
        unsafe_allow_html=True,
    )

    # Barra de escaños proporcional
    sorted_seats = sorted(seats.items(), key=lambda x: x[1], reverse=True)
    bar_parts = ""
    for partido, n in sorted_seats:
        if n == 0:
            continue
        pct = n / total_seats * 100
        color = get_party_color(partido)
        bar_parts += (
            f"<div style='width:{pct:.1f}%;height:24px;background:{color};"
            f"display:inline-block;' title='{partido}: {n}'></div>"
        )

    # Línea de mayoría
    maj_pct = majority / total_seats * 100

    st.markdown(
        f"<div style='position:relative;background:{BORDER};border-radius:4px;"
        f"height:24px;margin:8px 0;overflow:hidden;'>"
        f"  {bar_parts}"
        f"  <div style='position:absolute;top:0;left:{maj_pct:.1f}%;width:2px;"
        f"height:100%;background:white;opacity:0.8;'></div>"
        f"</div>"
        f"<div style='display:flex;justify-content:flex-end;'>"
        f"  <span style='color:{MUTED};font-size:9px;'>↑ Mayoría {majority}</span>"
        f"</div>",
        unsafe_allow_html=True,
    )

    # Tabla
    cols = st.columns(min(len(sorted_seats), 5))
    for col, (partido, n) in zip(cols, sorted_seats[:5]):
        with col:
            pct = n / total_seats * 100
            party_color = get_party_color(partido)
            st.markdown(
                f"<div style='text-align:center;'>"
                f"  <span style='color:{party_color};font-size:11px;font-weight:700;'>{partido}</span><br>"
                f"  <span style='color:{TEXT};font-size:16px;font-weight:800;'>{n}</span><br>"
                f"  <span style='color:{MUTED};font-size:10px;'>{pct:.1f}%</span>"
                f"</div>",
                unsafe_allow_html=True,
            )


# ── render_hemicycle ───────────────────────────────────────────────────────────

def render_hemicycle(
    seats: dict[str, int],
    total_seats: int = 350,
    title: str = "Hemiciclo",
    height: int = 350,
) -> None:
    """
    Hemiciclo del Congreso usando Plotly.

    Args:
        seats: Dict {partido: n_escanos}.
        total_seats: Total de escaños.
        title: Título.
        height: Altura del gráfico.
    """
    if not seats:
        no_data_state("Hemiciclo")
        return

    try:
        import plotly.graph_objects as go
        import math

        # Distribución semicircular (inspirada en poli-sci-kit hemiciclo)
        parties = [(p, n) for p, n in sorted(seats.items(), key=lambda x: -x[1]) if n > 0]
        total = sum(n for _, n in parties)
        if total == 0:
            no_data_state("Hemiciclo")
            return

        # Capas del hemiciclo
        n_rings = max(1, round(math.sqrt(total / 15)))
        seats_per_ring = [round(total / n_rings)] * n_rings
        # Ajustar el último anillo
        seats_per_ring[-1] = total - sum(seats_per_ring[:-1])

        node_x, node_y, node_colors, node_text = [], [], [], []
        ring_radii = [0.5 + 0.12 * i for i in range(n_rings)]

        # Asignar partidos a posiciones
        party_queue = []
        for partido, n in parties:
            party_queue.extend([(partido, get_party_color(partido))] * n)

        idx = 0
        for ring_i, (radius, n_seats) in enumerate(zip(ring_radii, seats_per_ring)):
            for seat_j in range(n_seats):
                if idx >= len(party_queue):
                    break
                angle = math.pi * seat_j / (n_seats - 1) if n_seats > 1 else math.pi / 2
                x = radius * math.cos(angle)
                y = radius * math.sin(angle)
                partido, color = party_queue[idx]
                node_x.append(x)
                node_y.append(y)
                node_colors.append(color)
                node_text.append(partido)
                idx += 1

        from dashboard.ui.tokens import BG2, TEXT2, BORDER

        fig = go.Figure(go.Scatter(
            x=node_x, y=node_y, mode="markers",
            marker=dict(size=7, color=node_colors, line=dict(width=0.5, color=BG2)),
            text=node_text, hoverinfo="text",
        ))
        fig.update_layout(
            title=dict(text=title, font=dict(color=TEXT2, size=12)),
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            showlegend=False, height=height,
            xaxis=dict(showgrid=False, zeroline=False, visible=False, range=[-1.1, 1.1]),
            yaxis=dict(showgrid=False, zeroline=False, visible=False, range=[-0.15, 1.1]),
            margin=dict(l=10, r=10, t=40, b=10),
        )
        st.plotly_chart(fig, use_container_width=True)

    except ImportError:
        render_seat_projection_panel(seats, total_seats=total_seats, title=title)
    except Exception as exc:
        logger.warning("Error renderizando hemiciclo: %s", exc)
        render_seat_projection_panel(seats, total_seats=total_seats, title=title)


# ── render_coalition_matrix ────────────────────────────────────────────────────

def render_coalition_matrix(
    coalitions: list[dict[str, Any]],
    title: str = "Coaliciones posibles",
) -> None:
    """
    Tabla de coaliciones con escaños y viabilidad.

    Args:
        coalitions: Lista de dicts con {nombre, partidos, escanos, mayoria, viable}.
        title: Título.
    """
    if not coalitions:
        no_data_state("Coaliciones")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🤝 {title}</p>",
        unsafe_allow_html=True,
    )

    for coalition in coalitions:
        nombre = coalition.get("nombre", coalition.get("name", "Coalición"))
        partidos = coalition.get("partidos", coalition.get("parties", []))
        escanos = coalition.get("escanos", coalition.get("seats", 0))
        mayoria = coalition.get("mayoria", coalition.get("majority", False))
        viable = coalition.get("viable", True)

        color = GREEN if mayoria else (AMBER if viable else RED)
        icon = "✅" if mayoria else ("⚠️" if viable else "❌")
        status = "Mayoría" if mayoria else ("Viable" if viable else "No viable")

        partidos_str = " + ".join(str(p) for p in partidos) if isinstance(partidos, list) else str(partidos)

        st.markdown(
            f"<div style='background:{BG2};border:1px solid {color}44;"
            f"border-left:3px solid {color};border-radius:4px;padding:8px 12px;margin:3px 0;'>"
            f"  <div style='display:flex;justify-content:space-between;align-items:center;'>"
            f"    <div>"
            f"      <span style='color:{TEXT};font-size:13px;font-weight:700;'>{icon} {nombre}</span><br>"
            f"      <span style='color:{MUTED};font-size:11px;'>{partidos_str}</span>"
            f"    </div>"
            f"    <div style='text-align:right;'>"
            f"      <span style='color:{color};font-size:18px;font-weight:800;'>{escanos}</span>"
            f"      <span style='color:{MUTED};font-size:10px;'> esc</span><br>"
            f"      <span style='color:{color};font-size:10px;'>{status}</span>"
            f"    </div>"
            f"  </div>"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_soft_vote_panel ─────────────────────────────────────────────────────

def render_soft_vote_panel(
    soft_votes: dict[str, Any],
    title: str = "Voto blando y transferencias",
) -> None:
    """
    Panel de voto blando y potencial de transferencia.

    Args:
        soft_votes: Dict con {partido: {voto_duro, voto_blando, transferencias?}}.
        title: Título.
    """
    if not soft_votes:
        no_data_state("Voto blando")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🔄 {title}</p>",
        unsafe_allow_html=True,
    )

    for partido, data in list(soft_votes.items())[:8]:
        if isinstance(data, dict):
            duro = data.get("voto_duro", data.get("hard_vote", 0))
            blando = data.get("voto_blando", data.get("soft_vote", 0))
        else:
            duro = float(data)
            blando = 0.0

        try:
            duro_f = float(duro)
            blando_f = float(blando)
            total_f = duro_f + blando_f
        except (TypeError, ValueError):
            duro_f = blando_f = total_f = 0.0

        party_color = get_party_color(partido)
        blando_pct = blando_f / total_f * 100 if total_f > 0 else 0

        st.markdown(
            f"<div style='display:flex;align-items:center;gap:8px;margin:3px 0;'>"
            f"  <span style='color:{party_color};font-size:12px;font-weight:700;"
            f"min-width:55px;'>{partido}</span>"
            f"  <div style='flex:1;height:10px;background:{BORDER};border-radius:5px;overflow:hidden;'>"
            f"    <div style='width:{min(duro_f, 50) * 2:.0f}%;height:100%;"
            f"background:{party_color};display:inline-block;'></div>"
            f"    <div style='width:{min(blando_f, 50-duro_f) * 2:.0f}%;height:100%;"
            f"background:{party_color}66;display:inline-block;'></div>"
            f"  </div>"
            f"  <span style='color:{TEXT};font-size:12px;min-width:35px;'>{total_f:.1f}%</span>"
            f"  <span style='color:{MUTED};font-size:10px;'>"
            f"({blando_pct:.0f}% blando)</span>"
            f"</div>",
            unsafe_allow_html=True,
        )
