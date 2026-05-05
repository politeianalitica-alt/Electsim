"""Biblioteca premium de gráficos Plotly para ElectSim España.

Tema oscuro consistente con el sistema de diseño POLITEIA. Cada función
devuelve un ``plotly.graph_objects.Figure`` con el tema ya aplicado.

Tokens de diseño:
    BG="#080C14", BG2="#0D1320", BG3="#111827", BORDER="#1E293B",
    CYAN="#00D4FF", BLUE="#3B82F6", PURPLE="#8B5CF6",
    TEXT="#E2E8F0", TEXT2="#94A3B8", MUTED="#475569",
    GREEN="#10B981", AMBER="#F59E0B", RED="#EF4444"
"""

from __future__ import annotations

import math
from typing import Any

import plotly.graph_objects as go

# ── Tokens de diseño ────────────────────────────────────────────────────────
BG = "#080C14"
BG2 = "#0D1320"
BG3 = "#111827"
BORDER = "#1E293B"
CYAN = "#00D4FF"
BLUE = "#3B82F6"
PURPLE = "#8B5CF6"
TEXT = "#E2E8F0"
TEXT2 = "#94A3B8"
MUTED = "#475569"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED = "#EF4444"

FONT_FAMILY = "Inter, system-ui, -apple-system, sans-serif"

# ── Paleta de partidos (con fallback) ────────────────────────────────────────
try:
    from dashboard.shared import _RAW_COLORES_PARTIDOS as _PARTY_COLORS  # type: ignore
except Exception:  # pragma: no cover - fallback defensivo
    _PARTY_COLORS = {
        "PP": "#009FDB",
        "PSOE": "#E30613",
        "VOX": "#63BE21",
        "SUMAR": "#E4007C",
        "PODEMOS": "#6A2E74",
        "CS": "#EB6109",
        "ERC": "#F4B20A",
        "JUNTS": "#00AEEF",
        "PNV": "#007A3D",
        "EH Bildu": "#A9C55A",
        "BNG": "#73C6E0",
        "CUP": "#FFCC00",
    }


def _color_for_party(name: str) -> str:
    """Devuelve color para un partido con búsqueda case-insensitive."""
    if not name:
        return CYAN
    if name in _PARTY_COLORS:
        return _PARTY_COLORS[name]
    upper = name.upper()
    if upper in _PARTY_COLORS:
        return _PARTY_COLORS[upper]
    for key, val in _PARTY_COLORS.items():
        if key.upper() == upper:
            return val
    return CYAN


# ── Tema base ───────────────────────────────────────────────────────────────


def apply_premium_theme(fig: go.Figure) -> go.Figure:
    """Aplica el tema oscuro premium a una figura Plotly."""
    try:
        fig.update_layout(
            paper_bgcolor=BG,
            plot_bgcolor=BG,
            font=dict(family=FONT_FAMILY, color=TEXT, size=12),
            hovermode="x unified",
            hoverlabel=dict(
                bgcolor=BG2,
                bordercolor=BORDER,
                font=dict(family=FONT_FAMILY, color=TEXT, size=12),
            ),
            margin=dict(l=40, r=20, t=40, b=40),
            showlegend=True,
            legend=dict(
                bgcolor="rgba(0,0,0,0)",
                bordercolor=BORDER,
                borderwidth=0,
                font=dict(color=TEXT2, size=11),
                orientation="h",
                yanchor="bottom",
                y=-0.18,
                xanchor="center",
                x=0.5,
            ),
            modebar=dict(remove=["lasso2d", "select2d", "autoScale2d"]),
            dragmode=False,
        )
        fig.update_xaxes(
            gridcolor=BORDER,
            zerolinecolor=BORDER,
            tickfont=dict(color=TEXT2, size=11),
            linecolor=BORDER,
        )
        fig.update_yaxes(
            gridcolor=BORDER,
            zerolinecolor=BORDER,
            tickfont=dict(color=TEXT2, size=11),
            linecolor=BORDER,
        )
        # Plotly config para ocultar la modebar completa
        fig._config = {"displayModeBar": False}  # type: ignore[attr-defined]
    except Exception:
        pass
    return fig


def _empty_figure(title: str = "") -> go.Figure:
    """Figura vacía con tema premium aplicado."""
    fig = go.Figure()
    fig.add_annotation(
        text="Sin datos disponibles",
        xref="paper",
        yref="paper",
        x=0.5,
        y=0.5,
        showarrow=False,
        font=dict(color=TEXT2, size=13),
    )
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    if title:
        fig.update_layout(title=_title_dict(title))
    return apply_premium_theme(fig)


def _title_dict(text: str) -> dict[str, Any]:
    return dict(
        text=text,
        font=dict(size=14, color=TEXT, family=FONT_FAMILY),
        x=0.02,
        xanchor="left",
    )


# ── 2. Barras electorales ───────────────────────────────────────────────────


def electoral_bar_chart(parties: dict[str, float], title: str = "") -> go.Figure:
    """Barras horizontales con colores por partido y anotaciones."""
    try:
        if not parties:
            return _empty_figure(title)
        items = sorted(parties.items(), key=lambda kv: kv[1], reverse=True)
        names = [k for k, _ in items]
        values = [float(v) for _, v in items]
        colors = [_color_for_party(n) for n in names]

        fig = go.Figure(
            go.Bar(
                x=values,
                y=names,
                orientation="h",
                marker=dict(color=colors, line=dict(color=BORDER, width=0)),
                hovertemplate="<b>%{y}</b><br>%{x:.1f}%<extra></extra>",
            )
        )
        for name, val in zip(names, values, strict=False):
            fig.add_annotation(
                x=val,
                y=name,
                text=f"{val:.1f}%",
                showarrow=False,
                font=dict(color=TEXT, size=11),
                xshift=20,
            )
        fig.update_layout(
            title=_title_dict(title),
            yaxis=dict(autorange="reversed"),
            showlegend=False,
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title)


# ── 3. Evolución multi-línea ────────────────────────────────────────────────


def electoral_evolution_line(df_or_dict: Any, title: str = "") -> go.Figure:
    """Líneas suaves (spline) con la evolución de cada partido."""
    try:
        series: dict[str, tuple[list, list]] = {}
        # pandas DataFrame con columnas date, party, value
        try:
            import pandas as pd  # type: ignore

            if isinstance(df_or_dict, pd.DataFrame) and {"date", "party", "value"}.issubset(
                df_or_dict.columns
            ):
                for party, group in df_or_dict.groupby("party"):
                    g = group.sort_values("date")
                    series[str(party)] = (list(g["date"]), list(g["value"]))
        except Exception:
            pass

        if not series and isinstance(df_or_dict, dict):
            # dict: party -> {date: value} o party -> [(date, value), ...]
            for party, payload in df_or_dict.items():
                if isinstance(payload, dict):
                    items = sorted(payload.items())
                    series[str(party)] = ([d for d, _ in items], [v for _, v in items])
                elif isinstance(payload, list):
                    series[str(party)] = (
                        [d for d, _ in payload],
                        [v for _, v in payload],
                    )

        if not series:
            return _empty_figure(title)

        fig = go.Figure()
        for party, (xs, ys) in series.items():
            fig.add_trace(
                go.Scatter(
                    x=xs,
                    y=ys,
                    mode="lines",
                    name=party,
                    line=dict(color=_color_for_party(party), width=2.2, shape="spline", smoothing=0.8),
                    hovertemplate=f"<b>{party}</b>: %{{y:.1f}}%<extra></extra>",
                )
            )
        fig.update_layout(title=_title_dict(title), hovermode="x unified")
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title)


# ── 4. Hemiciclo del Congreso ───────────────────────────────────────────────


def congress_hemicycle(seats: dict[str, int], total: int = 350) -> go.Figure:
    """Semicírculo con un punto por escaño, agrupado por partido."""
    try:
        if not seats:
            return _empty_figure("Hemiciclo")

        total = int(total) if total else sum(int(v) for v in seats.values())
        total = max(total, sum(int(v) for v in seats.values()))
        if total <= 0:
            return _empty_figure("Hemiciclo")

        # Distribución de filas — varias coronas concéntricas
        rows = 8
        # Repartir escaños por filas proporcionalmente al perímetro
        row_capacities = []
        for i in range(rows):
            r = 1.0 + i * 0.18
            cap = max(8, int(round((total / rows) * (1 + i * 0.05))))
            row_capacities.append((r, cap))

        # Ajustar para que la suma cubra `total`
        scale = total / sum(c for _, c in row_capacities)
        row_capacities = [(r, max(2, int(round(c * scale)))) for r, c in row_capacities]
        diff = total - sum(c for _, c in row_capacities)
        if diff != 0:
            r0, c0 = row_capacities[-1]
            row_capacities[-1] = (r0, max(1, c0 + diff))

        # Construir lista de posiciones (de izquierda a derecha)
        positions: list[tuple[float, float]] = []
        for r, cap in row_capacities:
            for i in range(cap):
                # ángulo de 180º (izq) a 0º (der)
                t = math.pi * (1 - (i / max(cap - 1, 1)))
                x = r * math.cos(t)
                y = r * math.sin(t)
                positions.append((x, y))

        # Ordenar partidos por color/orden de entrega (izquierda → derecha)
        ordered_parties = list(seats.items())

        fig = go.Figure()
        idx = 0
        for party, n in ordered_parties:
            n = int(n)
            if n <= 0:
                continue
            pts = positions[idx : idx + n]
            idx += n
            if not pts:
                continue
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            fig.add_trace(
                go.Scatter(
                    x=xs,
                    y=ys,
                    mode="markers",
                    name=f"{party} ({n})",
                    marker=dict(
                        size=10,
                        color=_color_for_party(party),
                        line=dict(color=BG, width=1),
                    ),
                    hovertemplate=f"<b>{party}</b>: {n} escaños<extra></extra>",
                )
            )

        fig.update_layout(
            title=_title_dict(f"Hemiciclo · {total} escaños"),
            xaxis=dict(visible=False, scaleanchor="y", scaleratio=1),
            yaxis=dict(visible=False),
            legend=dict(orientation="h", yanchor="bottom", y=-0.05, xanchor="center", x=0.5),
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Hemiciclo")


# ── 5. Timeline de narrativas ───────────────────────────────────────────────


def narrative_timeline(narratives: list[dict]) -> go.Figure:
    """Gantt de ciclos de narrativas: x=tiempo, y=narrativa, tamaño=menciones."""
    try:
        if not narratives:
            return _empty_figure("Narrativas")

        fig = go.Figure()
        for n in narratives:
            name = str(n.get("name", "—"))
            start = n.get("start")
            end = n.get("end", start)
            intensity = float(n.get("intensity", 0.5) or 0.5)
            mentions = int(n.get("mentions", 10) or 10)
            color = _intensity_to_color(intensity)
            fig.add_trace(
                go.Scatter(
                    x=[start, end],
                    y=[name, name],
                    mode="lines+markers",
                    line=dict(color=color, width=8),
                    marker=dict(size=max(8, min(28, mentions / 5)), color=color),
                    name=name,
                    hovertemplate=(
                        f"<b>{name}</b><br>"
                        f"Intensidad: {intensity:.2f}<br>"
                        f"Menciones: {mentions}<extra></extra>"
                    ),
                    showlegend=False,
                )
            )
        fig.update_layout(
            title=_title_dict("Ciclo de vida de narrativas"),
            yaxis=dict(autorange="reversed"),
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Narrativas")


def _intensity_to_color(value: float) -> str:
    if value >= 0.75:
        return RED
    if value >= 0.5:
        return AMBER
    if value >= 0.25:
        return BLUE
    return PURPLE


# ── 6. Heatmap de riesgo ────────────────────────────────────────────────────


def risk_heatmap(
    matrix: list[list[float]],
    rows: list[str],
    cols: list[str],
    title: str = "",
) -> go.Figure:
    """Heatmap con escala BG2 → AMBER → RED y anotaciones."""
    try:
        if not matrix or not rows or not cols:
            return _empty_figure(title)

        colorscale = [
            [0.0, BG2],
            [0.4, BLUE],
            [0.7, AMBER],
            [1.0, RED],
        ]
        fig = go.Figure(
            go.Heatmap(
                z=matrix,
                x=cols,
                y=rows,
                colorscale=colorscale,
                showscale=True,
                colorbar=dict(
                    tickfont=dict(color=TEXT2, size=10),
                    bgcolor=BG2,
                    outlinewidth=0,
                ),
                hovertemplate="<b>%{y}</b> · %{x}<br>Riesgo: %{z:.2f}<extra></extra>",
            )
        )

        for i, row in enumerate(rows):
            for j, col in enumerate(cols):
                try:
                    val = float(matrix[i][j])
                except Exception:
                    continue
                fig.add_annotation(
                    x=col,
                    y=row,
                    text=f"{val:.2f}",
                    showarrow=False,
                    font=dict(color=TEXT, size=10),
                )

        fig.update_layout(title=_title_dict(title), showlegend=False)
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title)


# ── 7. Radar de sentimiento ─────────────────────────────────────────────────


def sentiment_radar(values: dict[str, float], title: str = "") -> go.Figure:
    """Polar radar suave con relleno."""
    try:
        if not values:
            return _empty_figure(title)
        labels = list(values.keys())
        nums = [float(v) for v in values.values()]
        # cerrar el polígono
        labels_closed = labels + [labels[0]]
        nums_closed = nums + [nums[0]]

        fig = go.Figure(
            go.Scatterpolar(
                r=nums_closed,
                theta=labels_closed,
                fill="toself",
                line=dict(color=CYAN, width=2),
                fillcolor="rgba(0, 212, 255, 0.25)",
                hovertemplate="<b>%{theta}</b>: %{r:.2f}<extra></extra>",
                name="Sentimiento",
            )
        )
        fig.update_layout(
            title=_title_dict(title),
            polar=dict(
                bgcolor=BG,
                radialaxis=dict(
                    visible=True,
                    range=[0, max(max(nums), 1.0)],
                    gridcolor=BORDER,
                    tickfont=dict(color=TEXT2, size=10),
                ),
                angularaxis=dict(
                    gridcolor=BORDER,
                    tickfont=dict(color=TEXT2, size=11),
                ),
            ),
            showlegend=False,
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title)


# ── 8. Red de actores ───────────────────────────────────────────────────────


def actor_network(nodes: list[dict], edges: list[dict]) -> go.Figure:
    """Grafo de actores: scatter para nodos + line shapes para aristas."""
    try:
        if not nodes:
            return _empty_figure("Red de actores")

        node_index = {str(n.get("id", n.get("label", i))): n for i, n in enumerate(nodes)}

        # Aristas como una sola traza con None separators
        edge_x: list[float | None] = []
        edge_y: list[float | None] = []
        for e in edges or []:
            src = node_index.get(str(e.get("source")))
            tgt = node_index.get(str(e.get("target")))
            if not src or not tgt:
                continue
            edge_x.extend([float(src.get("x", 0)), float(tgt.get("x", 0)), None])
            edge_y.extend([float(src.get("y", 0)), float(tgt.get("y", 0)), None])

        fig = go.Figure()
        if edge_x:
            fig.add_trace(
                go.Scatter(
                    x=edge_x,
                    y=edge_y,
                    mode="lines",
                    line=dict(color=BORDER, width=1.2),
                    hoverinfo="skip",
                    showlegend=False,
                )
            )

        xs = [float(n.get("x", 0)) for n in nodes]
        ys = [float(n.get("y", 0)) for n in nodes]
        sizes = [float(n.get("size", 18)) for n in nodes]
        colors = [str(n.get("color", CYAN)) for n in nodes]
        labels = [str(n.get("label", n.get("id", ""))) for n in nodes]

        fig.add_trace(
            go.Scatter(
                x=xs,
                y=ys,
                mode="markers+text",
                marker=dict(
                    size=sizes,
                    color=colors,
                    line=dict(color=BG, width=1.5),
                ),
                text=labels,
                textposition="top center",
                textfont=dict(color=TEXT, size=10),
                hovertemplate="<b>%{text}</b><extra></extra>",
                showlegend=False,
            )
        )
        fig.update_layout(
            title=_title_dict("Red de actores"),
            xaxis=dict(visible=False),
            yaxis=dict(visible=False, scaleanchor="x", scaleratio=1),
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Red de actores")


# ── 9. Sankey de transferencias de voto ─────────────────────────────────────


def sankey_voter_flow(
    source: list,
    target: list,
    value: list,
    labels: list[str],
) -> go.Figure:
    """Sankey con nodos coloreados por partido."""
    try:
        if not labels or not source or not target or not value:
            return _empty_figure("Transferencias de voto")
        node_colors = [_color_for_party(lbl) for lbl in labels]

        link_colors = []
        for s in source:
            try:
                base = node_colors[int(s)]
            except Exception:
                base = CYAN
            link_colors.append(_hex_to_rgba(base, 0.35))

        fig = go.Figure(
            go.Sankey(
                arrangement="snap",
                node=dict(
                    pad=14,
                    thickness=16,
                    line=dict(color=BORDER, width=0.5),
                    label=labels,
                    color=node_colors,
                ),
                link=dict(
                    source=source,
                    target=target,
                    value=value,
                    color=link_colors,
                ),
            )
        )
        fig.update_layout(title=_title_dict("Transferencias de voto"))
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Transferencias de voto")


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    try:
        h = hex_color.lstrip("#")
        if len(h) != 6:
            return f"rgba(0,212,255,{alpha})"
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return f"rgba({r},{g},{b},{alpha})"
    except Exception:
        return f"rgba(0,212,255,{alpha})"


# ── 10. Treemap legislativo ─────────────────────────────────────────────────


def treemap_legislative_topics(items: list[dict]) -> go.Figure:
    """Treemap de iniciativas parlamentarias por tema y partido."""
    try:
        if not items:
            return _empty_figure("Iniciativas legislativas")

        labels: list[str] = []
        parents: list[str] = []
        values: list[float] = []
        colors: list[str] = []
        for it in items:
            labels.append(str(it.get("label", "—")))
            parents.append(str(it.get("parent", "")))
            values.append(float(it.get("value", 0) or 0))
            colors.append(str(it.get("color", CYAN)))

        fig = go.Figure(
            go.Treemap(
                labels=labels,
                parents=parents,
                values=values,
                marker=dict(
                    colors=colors,
                    line=dict(color=BG, width=2),
                ),
                textfont=dict(color=TEXT, size=12, family=FONT_FAMILY),
                hovertemplate="<b>%{label}</b><br>%{value:.0f} iniciativas<extra></extra>",
            )
        )
        fig.update_layout(title=_title_dict("Iniciativas legislativas"))
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Iniciativas legislativas")


# ── 11. Sunburst de relaciones ──────────────────────────────────────────────


def sunburst_actor_relations(items: list[dict]) -> go.Figure:
    """Sunburst jerárquico de relaciones de actores."""
    try:
        if not items:
            return _empty_figure("Relaciones de actores")

        labels = [str(it.get("label", "—")) for it in items]
        parents = [str(it.get("parent", "")) for it in items]
        values = [float(it.get("value", 1) or 1) for it in items]
        colors = [str(it.get("color", BLUE)) for it in items]

        fig = go.Figure(
            go.Sunburst(
                labels=labels,
                parents=parents,
                values=values,
                marker=dict(colors=colors, line=dict(color=BG, width=1.5)),
                hovertemplate="<b>%{label}</b><br>Peso: %{value}<extra></extra>",
            )
        )
        fig.update_layout(title=_title_dict("Relaciones de actores"))
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Relaciones de actores")


# ── 12. Calendar heatmap (estilo GitHub) ────────────────────────────────────


def calendar_heatmap(
    events_by_date: dict[str, int],
    year: int = 2026,
    title: str = "",
) -> go.Figure:
    """Heatmap tipo GitHub: 7 filas (días), columnas semanales."""
    try:
        if not events_by_date:
            return _empty_figure(title or f"Actividad {year}")

        from datetime import date, timedelta

        start = date(year, 1, 1)
        end = date(year, 12, 31)
        days = (end - start).days + 1

        # rejilla [dow][week]
        max_weeks = 54
        z: list[list[float | None]] = [[None] * max_weeks for _ in range(7)]
        text: list[list[str]] = [[""] * max_weeks for _ in range(7)]

        for i in range(days):
            d = start + timedelta(days=i)
            dow = d.weekday()  # 0=lunes
            week = (d - start).days // 7
            if week >= max_weeks:
                continue
            count = int(events_by_date.get(d.isoformat(), 0))
            z[dow][week] = float(count)
            text[dow][week] = f"{d.isoformat()}: {count} eventos"

        colorscale = [
            [0.0, BG2],
            [0.25, BLUE],
            [0.6, CYAN],
            [1.0, GREEN],
        ]

        fig = go.Figure(
            go.Heatmap(
                z=z,
                text=text,
                hovertemplate="%{text}<extra></extra>",
                colorscale=colorscale,
                showscale=True,
                xgap=2,
                ygap=2,
                colorbar=dict(
                    tickfont=dict(color=TEXT2, size=10),
                    bgcolor=BG2,
                    outlinewidth=0,
                ),
            )
        )
        fig.update_layout(
            title=_title_dict(title or f"Actividad {year}"),
            yaxis=dict(
                tickmode="array",
                tickvals=list(range(7)),
                ticktext=["L", "M", "X", "J", "V", "S", "D"],
                autorange="reversed",
            ),
            xaxis=dict(showticklabels=False),
            showlegend=False,
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title or f"Actividad {year}")


# ── 13. Gauge KPI ───────────────────────────────────────────────────────────


def gauge_kpi(
    value: float,
    label: str,
    max_value: float = 100.0,
    thresholds: dict | None = None,
) -> go.Figure:
    """Gauge de un KPI con umbrales (low/medium/high)."""
    try:
        thresholds = thresholds or {"low": 33.0, "medium": 66.0, "high": 100.0}
        try:
            value = float(value)
        except Exception:
            value = 0.0
        max_value = float(max_value) if max_value else 100.0

        steps = [
            dict(range=[0, float(thresholds.get("low", 33.0))], color=GREEN),
            dict(
                range=[
                    float(thresholds.get("low", 33.0)),
                    float(thresholds.get("medium", 66.0)),
                ],
                color=AMBER,
            ),
            dict(
                range=[
                    float(thresholds.get("medium", 66.0)),
                    float(thresholds.get("high", max_value)),
                ],
                color=RED,
            ),
        ]

        fig = go.Figure(
            go.Indicator(
                mode="gauge+number",
                value=value,
                number=dict(font=dict(color=TEXT, size=32, family=FONT_FAMILY)),
                title=dict(text=label, font=dict(color=TEXT2, size=13)),
                gauge=dict(
                    axis=dict(
                        range=[0, max_value],
                        tickfont=dict(color=TEXT2, size=10),
                        tickcolor=BORDER,
                    ),
                    bar=dict(color=CYAN, thickness=0.25),
                    bgcolor=BG2,
                    borderwidth=0,
                    steps=steps,
                    threshold=dict(
                        line=dict(color=TEXT, width=2),
                        thickness=0.8,
                        value=value,
                    ),
                ),
            )
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(label)


# ── 14. Funnel ──────────────────────────────────────────────────────────────


def funnel_pipeline(stages: list[str], values: list[int], title: str = "") -> go.Figure:
    """Funnel chart para pipelines."""
    try:
        if not stages or not values or len(stages) != len(values):
            return _empty_figure(title)

        # Degradado cyan → púrpura
        n = len(stages)
        palette = [CYAN, BLUE, PURPLE, AMBER, RED]
        colors = [palette[i % len(palette)] for i in range(n)]

        fig = go.Figure(
            go.Funnel(
                y=stages,
                x=values,
                marker=dict(color=colors, line=dict(color=BG, width=1)),
                textinfo="value+percent initial",
                textfont=dict(color=TEXT, size=12, family=FONT_FAMILY),
                hovertemplate="<b>%{y}</b><br>%{x}<extra></extra>",
            )
        )
        fig.update_layout(title=_title_dict(title), showlegend=False)
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title)


# ── 15. Reloj polar de alertas ──────────────────────────────────────────────


def polar_clock_alerts(hourly_counts: list[int], title: str = "") -> go.Figure:
    """Barras polares 24h con la distribución de alertas."""
    try:
        if not hourly_counts or len(hourly_counts) != 24:
            return _empty_figure(title)

        thetas = [f"{h:02d}:00" for h in range(24)]
        max_v = max(hourly_counts) or 1
        # color por intensidad
        colors = [_intensity_to_color(v / max_v) for v in hourly_counts]

        fig = go.Figure(
            go.Barpolar(
                r=hourly_counts,
                theta=thetas,
                marker=dict(color=colors, line=dict(color=BG, width=1)),
                hovertemplate="<b>%{theta}</b><br>%{r} alertas<extra></extra>",
                name="Alertas",
            )
        )
        fig.update_layout(
            title=_title_dict(title or "Distribución horaria"),
            polar=dict(
                bgcolor=BG,
                radialaxis=dict(
                    gridcolor=BORDER,
                    tickfont=dict(color=TEXT2, size=10),
                ),
                angularaxis=dict(
                    direction="clockwise",
                    rotation=90,
                    gridcolor=BORDER,
                    tickfont=dict(color=TEXT2, size=10),
                ),
            ),
            showlegend=False,
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure(title)


# ── 16. Bullet de comparación ───────────────────────────────────────────────


def comparison_bullet(
    actuals: list[float],
    targets: list[float],
    labels: list[str],
) -> go.Figure:
    """Bullet chart: barras horizontales actuals vs líneas target."""
    try:
        if not actuals or not targets or not labels:
            return _empty_figure("Comparación")
        if not (len(actuals) == len(targets) == len(labels)):
            return _empty_figure("Comparación")

        fig = go.Figure()
        max_val = max(max(actuals or [0]), max(targets or [0]), 1)

        for i, (lbl, actual, target) in enumerate(
            zip(labels, actuals, targets, strict=False)
        ):
            # zonas de fondo
            fig.add_trace(
                go.Bar(
                    x=[max_val],
                    y=[lbl],
                    orientation="h",
                    marker=dict(color=BG2, line=dict(color=BORDER, width=0)),
                    hoverinfo="skip",
                    showlegend=False,
                )
            )
            # barra real
            color = GREEN if actual >= target else AMBER
            if actual < target * 0.6:
                color = RED
            fig.add_trace(
                go.Bar(
                    x=[actual],
                    y=[lbl],
                    orientation="h",
                    marker=dict(color=color, line=dict(color=BG, width=0)),
                    width=0.45,
                    hovertemplate=f"<b>{lbl}</b><br>Actual: {actual:.1f}<br>Objetivo: {target:.1f}<extra></extra>",
                    showlegend=False,
                )
            )
            # marcador objetivo
            fig.add_shape(
                type="line",
                x0=target,
                x1=target,
                y0=i - 0.35,
                y1=i + 0.35,
                line=dict(color=TEXT, width=3),
            )

        fig.update_layout(
            title=_title_dict("Objetivos vs realidad"),
            barmode="overlay",
            showlegend=False,
            yaxis=dict(autorange="reversed"),
        )
        return apply_premium_theme(fig)
    except Exception:
        return _empty_figure("Comparación")


__all__ = [
    "apply_premium_theme",
    "electoral_bar_chart",
    "electoral_evolution_line",
    "congress_hemicycle",
    "narrative_timeline",
    "risk_heatmap",
    "sentiment_radar",
    "actor_network",
    "sankey_voter_flow",
    "treemap_legislative_topics",
    "sunburst_actor_relations",
    "calendar_heatmap",
    "gauge_kpi",
    "funnel_pipeline",
    "polar_clock_alerts",
    "comparison_bullet",
]
