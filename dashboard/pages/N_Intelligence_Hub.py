"""Intelligence Hub — ElectSim España.
Centro nervioso: pulso, big data, memoria, riesgos, narrativas, oportunidades.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any

import streamlit as st

# ── Tokens ──────────────────────────────────────────────────────────────────
BG = "#080C14"
BG2 = "#0D1320"
BG3 = "#111827"
BORDER = "#1E293B"
BORDER2 = "#00D4FF26"
CYAN = "#00D4FF"
BLUE = "#3B82F6"
PURPLE = "#8B5CF6"
TEXT = "#E2E8F0"
TEXT2 = "#94A3B8"
MUTED = "#475569"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED = "#EF4444"

TENANT_ID = "demo"

# ── Page config ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Intelligence Hub — ElectSim",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Premium CSS ─────────────────────────────────────────────────────────────
try:
    from dashboard.ui.premium_animations import inject_premium_css

    inject_premium_css()
except Exception:
    pass

# ── Sidebar nav ─────────────────────────────────────────────────────────────
try:
    from dashboard.shared import sidebar_nav

    sidebar_nav()
except Exception:
    pass

# ── Live ticker ─────────────────────────────────────────────────────────────
try:
    from services.intelligence.live_ticker import get_ticker_html

    st.markdown(get_ticker_html(TENANT_ID), unsafe_allow_html=True)
except Exception:
    pass


# ── Helpers ─────────────────────────────────────────────────────────────────
def _card_open(extra_style: str = "") -> str:
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};'
        f"border-radius:12px;padding:16px;{extra_style}\">"
    )


def _badge(label: str, color: str = CYAN) -> str:
    return (
        f'<span style="display:inline-block;padding:2px 8px;border-radius:999px;'
        f"background:{color}22;color:{color};border:1px solid {color}55;"
        f'font-size:0.72rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">{label}</span>'
    )


def _delta_chip(delta: float, suffix: str = "") -> str:
    color = GREEN if delta > 0 else (RED if delta < 0 else MUTED)
    arrow = "▲" if delta > 0 else ("▼" if delta < 0 else "—")
    return (
        f'<span style="color:{color};font-weight:600;font-size:0.85rem;">'
        f"{arrow} {abs(delta):.2f}{suffix}</span>"
    )


def _sparkline(values: list[float], color: str = CYAN, height: int = 50) -> Any:
    try:
        import plotly.graph_objects as go

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                y=values,
                mode="lines",
                line=dict(color=color, width=2, shape="spline"),
                fill="tozeroy",
                fillcolor=color + "22",
                hoverinfo="skip",
            )
        )
        fig.update_layout(
            height=height,
            margin=dict(l=0, r=0, t=0, b=0),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            showlegend=False,
        )
        return fig
    except Exception:
        return None


def _mini_line(values: list[float], color: str, height: int = 120, title: str = "") -> Any:
    try:
        import plotly.graph_objects as go

        fig = go.Figure()
        fig.add_trace(
            go.Scatter(
                y=values,
                mode="lines",
                line=dict(color=color, width=2),
                fill="tozeroy",
                fillcolor=color + "1A",
            )
        )
        fig.update_layout(
            title=dict(text=title, font=dict(color=TEXT2, size=12), x=0.02, y=0.95),
            height=height,
            margin=dict(l=8, r=8, t=24, b=8),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(visible=False),
            yaxis=dict(visible=False, gridcolor=BORDER),
            showlegend=False,
        )
        return fig
    except Exception:
        return None


def _percentile_bar(percentile: float, color: str = CYAN) -> str:
    pct = max(0, min(100, percentile))
    return (
        f'<div style="height:4px;background:{BORDER};border-radius:2px;margin-top:6px;">'
        f'<div style="height:100%;width:{pct:.0f}%;background:{color};border-radius:2px;"></div>'
        f"</div>"
        f'<div style="font-size:0.7rem;color:{TEXT2};margin-top:2px;">P{pct:.0f} histórico</div>'
    )


def _demo_series(seed: int, n: int = 30, base: float = 50, vol: float = 5) -> list[float]:
    rnd = random.Random(seed)
    out = [base + rnd.gauss(0, vol)]
    for _ in range(n - 1):
        out.append(out[-1] + rnd.gauss(0, vol * 0.4))
    return out


# ─────────────────────────────────────────────────────────────────────────────
# HERO
# ─────────────────────────────────────────────────────────────────────────────
try:
    itpe_value = 62.4
    alertas = 7
    narrativas_alza = 4
    sources_ok = 38
    try:
        from services.intelligence.live_ticker import (
            _get_active_sources,
            _get_itpe,
            _get_unread_count,
        )

        itpe_value = float(_get_itpe(TENANT_ID))
        alertas = int(_get_unread_count(TENANT_ID))
        sources_ok = int(_get_active_sources())
    except Exception:
        pass

    hero_html = f"""
    <div style="
        background: linear-gradient(135deg, {BG2} 0%, {BG3} 50%, #1a1f3a 100%);
        border: 1px solid {BORDER2};
        border-radius: 16px;
        padding: 28px 32px;
        margin: 8px 0 20px 0;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 40px rgba(0,212,255,0.08);
    ">
        <div style="position:absolute;top:-40px;right:-40px;width:240px;height:240px;
            background: radial-gradient(circle, {CYAN}1A 0%, transparent 70%);
            border-radius: 50%;"></div>
        <div style="position:relative;">
            <div style="font-size:0.78rem;color:{CYAN};letter-spacing:0.2em;
                font-weight:600;text-transform:uppercase;margin-bottom:6px;">
                Centro Nervioso · Tiempo Real
            </div>
            <div style="font-size:2.4rem;color:{TEXT};font-weight:700;line-height:1.1;
                background: linear-gradient(135deg, {TEXT} 0%, {CYAN} 100%);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                background-clip: text;">
                Intelligence Hub
            </div>
            <div style="color:{TEXT2};font-size:1.05rem;margin-top:6px;">
                Pulso operativo en tiempo real · Big data político · Memoria del workspace
            </div>
            <div style="display:flex;gap:14px;margin-top:18px;flex-wrap:wrap;">
                <div style="background:{BG};border:1px solid {BORDER};border-radius:10px;
                    padding:10px 16px;min-width:140px;">
                    <div style="color:{TEXT2};font-size:0.72rem;text-transform:uppercase;
                        letter-spacing:0.08em;">ITPE</div>
                    <div style="color:{CYAN};font-size:1.4rem;font-weight:700;">{itpe_value:.1f}</div>
                </div>
                <div style="background:{BG};border:1px solid {BORDER};border-radius:10px;
                    padding:10px 16px;min-width:140px;">
                    <div style="color:{TEXT2};font-size:0.72rem;text-transform:uppercase;
                        letter-spacing:0.08em;">Alertas activas</div>
                    <div style="color:{AMBER};font-size:1.4rem;font-weight:700;">{alertas}</div>
                </div>
                <div style="background:{BG};border:1px solid {BORDER};border-radius:10px;
                    padding:10px 16px;min-width:140px;">
                    <div style="color:{TEXT2};font-size:0.72rem;text-transform:uppercase;
                        letter-spacing:0.08em;">Narrativas en alza</div>
                    <div style="color:{PURPLE};font-size:1.4rem;font-weight:700;">{narrativas_alza}</div>
                </div>
                <div style="background:{BG};border:1px solid {BORDER};border-radius:10px;
                    padding:10px 16px;min-width:140px;">
                    <div style="color:{TEXT2};font-size:0.72rem;text-transform:uppercase;
                        letter-spacing:0.08em;">Fuentes OK</div>
                    <div style="color:{GREEN};font-size:1.4rem;font-weight:700;">{sources_ok}</div>
                </div>
            </div>
        </div>
    </div>
    """
    st.markdown(hero_html, unsafe_allow_html=True)

    cols_hero = st.columns([1, 4])
    with cols_hero[0]:
        if st.button("Capturar snapshot", key="hub_snapshot", use_container_width=True):
            try:
                from memory_engine.snapshot_store import capture_snapshot

                snap = capture_snapshot(
                    tenant_id=TENANT_ID,
                    name=f"Hub snapshot {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    description="Snapshot capturado desde Intelligence Hub",
                    tags=["hub", "auto"],
                )
                st.success(f"Snapshot creado: {getattr(snap, 'snapshot_id', 'ok')}")
            except Exception as exc:
                st.warning(f"No se pudo capturar snapshot: {exc}")
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — Pulso operativo (5-col)
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<h3 style="color:{TEXT};margin:24px 0 12px 0;font-weight:700;">'
    f"Pulso operativo</h3>",
    unsafe_allow_html=True,
)

try:
    from analytics.big_data_engine import (
        compute_momentum_score,
        compute_polarization_index,
        compute_volatility_index,
    )

    series_lider = _demo_series(1, base=32, vol=1.5)
    series_pol = _demo_series(2, base=0.42, vol=0.03)
    series_vol = _demo_series(3, base=0.28, vol=0.04)
    series_sent = _demo_series(4, base=-0.12, vol=0.08)
    series_med = _demo_series(5, base=1240, vol=80)

    pol_idx = compute_polarization_index({"PP": 0.2, "PSOE": 0.1, "VOX": -0.4, "SUMAR": 0.3})
    vol_idx = compute_volatility_index(series_lider)
    mom = compute_momentum_score(series_lider)

    kpis = [
        ("Intención líder", series_lider, f"{series_lider[-1]:.1f}%", series_lider[-1] - series_lider[-7], CYAN, 68),
        ("Polarización", series_pol, f"{pol_idx.get('index', series_pol[-1]):.2f}", series_pol[-1] - series_pol[-7], PURPLE, 72),
        ("Volatilidad", series_vol, f"{vol_idx:.3f}", series_vol[-1] - series_vol[-7], AMBER, 55),
        ("Sentimiento gob", series_sent, f"{series_sent[-1]:+.2f}", series_sent[-1] - series_sent[-7], BLUE, 41),
        ("Volumen mediático", series_med, f"{int(series_med[-1])}", series_med[-1] - series_med[-7], GREEN, 79),
    ]

    cols = st.columns(5)
    for col, (label, series, big, delta, color, percentile) in zip(cols, kpis):
        with col:
            st.markdown(_card_open("min-height:200px;"), unsafe_allow_html=True)
            st.markdown(
                f'<div style="color:{TEXT2};font-size:0.72rem;text-transform:uppercase;'
                f'letter-spacing:0.08em;margin-bottom:4px;">{label}</div>',
                unsafe_allow_html=True,
            )
            st.markdown(
                f'<div style="color:{TEXT};font-size:1.6rem;font-weight:700;line-height:1;">{big}</div>'
                f'<div style="margin-top:4px;">{_delta_chip(delta)}</div>',
                unsafe_allow_html=True,
            )
            sf = _sparkline(series, color=color, height=50)
            if sf is not None:
                st.plotly_chart(sf, use_container_width=True, key=f"sk_{label}")
            st.markdown(_percentile_bar(percentile, color), unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — Tres columnas de inteligencia
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<h3 style="color:{TEXT};margin:32px 0 12px 0;font-weight:700;">'
    f"Tres columnas de inteligencia</h3>",
    unsafe_allow_html=True,
)

try:
    c1, c2, c3 = st.columns([2, 2, 1])

    # Col 1: Narrativas
    with c1:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Narrativas en movimiento</div>",
            unsafe_allow_html=True,
        )
        narratives: list[dict] = []
        try:
            from data_seeds import political_narratives_archive as _pna  # type: ignore

            raw = getattr(_pna, "POLITICAL_NARRATIVES", []) or getattr(_pna, "NARRATIVES", [])
            for n in raw:
                if isinstance(n, dict) and n.get("lifecycle") in ("emergence", "peak"):
                    narratives.append(n)
        except Exception:
            narratives = [
                {
                    "frame_label": "Vivienda inaccesible",
                    "lifecycle": "peak",
                    "central_claim": "El acceso a la vivienda se ha convertido en el principal problema estructural del país, según la última oleada del CIS.",
                    "top_promoter": "PSOE",
                    "color": PURPLE,
                },
                {
                    "frame_label": "Inseguridad jurídica fiscal",
                    "lifecycle": "emergence",
                    "central_claim": "Crece la percepción empresarial de inseguridad jurídica tras los últimos cambios fiscales.",
                    "top_promoter": "PP",
                    "color": BLUE,
                },
                {
                    "frame_label": "Soberanía energética",
                    "lifecycle": "peak",
                    "central_claim": "España debe acelerar su independencia energética frente a la inestabilidad geopolítica.",
                    "top_promoter": "SUMAR",
                    "color": GREEN,
                },
                {
                    "frame_label": "Migración descontrolada",
                    "lifecycle": "emergence",
                    "central_claim": "Los flujos migratorios desbordan la capacidad institucional en el Sur.",
                    "top_promoter": "VOX",
                    "color": AMBER,
                },
                {
                    "frame_label": "Reforma judicial",
                    "lifecycle": "peak",
                    "central_claim": "El bloqueo del CGPJ erosiona la legitimidad del sistema judicial.",
                    "top_promoter": "PP",
                    "color": CYAN,
                },
            ]

        for i, narr in enumerate(narratives[:5]):
            color = narr.get("color", CYAN)
            lifecycle = narr.get("lifecycle", "—")
            badge_color = GREEN if lifecycle == "emergence" else (AMBER if lifecycle == "peak" else MUTED)
            label = narr.get("frame_label", "Narrativa")
            claim = (narr.get("central_claim") or "")[:140]
            promoter = narr.get("top_promoter", "—")
            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                    padding:12px 14px;margin-bottom:8px;transition:all 0.2s;
                    border-left:3px solid {color};"
                    onmouseover="this.style.borderColor='{CYAN}';this.style.transform='translateX(2px)';"
                    onmouseout="this.style.borderColor='{BORDER}';this.style.transform='translateX(0)';">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <div style="color:{TEXT};font-weight:600;">{label}</div>
                        {_badge(lifecycle, badge_color)}
                    </div>
                    <div style="color:{TEXT2};font-size:0.85rem;line-height:1.4;">{claim}…</div>
                    <div style="color:{MUTED};font-size:0.75rem;margin-top:6px;">
                        Promotor principal: <span style="color:{color};font-weight:600;">{promoter}</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            sk = _sparkline(_demo_series(10 + i, n=20, base=40 + i * 5, vol=4), color=color, height=30)
            if sk is not None:
                st.plotly_chart(sk, use_container_width=True, key=f"narr_sk_{i}")

        st.markdown(
            f'<a href="#" style="color:{CYAN};font-size:0.85rem;text-decoration:none;">→ Ver todas las narrativas</a>',
            unsafe_allow_html=True,
        )

    # Col 2: Big data económico-social
    with c2:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Big data económico y social</div>",
            unsafe_allow_html=True,
        )
        try:
            economic: dict[str, list[float]] = {}
            social: dict[str, list[float]] = {}
            try:
                from data_seeds import economic_timeseries as _eco  # type: ignore
                from data_seeds import social_indicators as _soc  # type: ignore

                economic = getattr(_eco, "ECONOMIC_TIMESERIES", {}) or {}
                social = getattr(_soc, "SOCIAL_INDICATORS", {}) or {}
            except Exception:
                economic = {
                    "IPC": _demo_series(50, n=24, base=3.4, vol=0.2),
                    "Paro": _demo_series(51, n=24, base=11.6, vol=0.4),
                }
                social = {
                    "Aprobación gobierno": _demo_series(52, n=24, base=38, vol=2),
                    "Polarización": _demo_series(53, n=24, base=0.62, vol=0.04),
                }

            ipc = economic.get("IPC") or _demo_series(50, base=3.4, vol=0.2)
            paro = economic.get("Paro") or _demo_series(51, base=11.6, vol=0.4)
            aprob = social.get("Aprobación gobierno") or _demo_series(52, base=38, vol=2)
            polar = social.get("Polarización") or _demo_series(53, base=0.62, vol=0.04)

            mc1, mc2 = st.columns(2)
            with mc1:
                f1 = _mini_line(ipc, AMBER, 120, "IPC %")
                if f1 is not None:
                    st.plotly_chart(f1, use_container_width=True, key="bd_ipc")
                f3 = _mini_line(aprob, BLUE, 120, "Aprobación gobierno")
                if f3 is not None:
                    st.plotly_chart(f3, use_container_width=True, key="bd_apr")
            with mc2:
                f2 = _mini_line(paro, RED, 120, "Paro %")
                if f2 is not None:
                    st.plotly_chart(f2, use_container_width=True, key="bd_paro")
                f4 = _mini_line(polar, PURPLE, 120, "Polarización")
                if f4 is not None:
                    st.plotly_chart(f4, use_container_width=True, key="bd_pol")

            try:
                from analytics.big_data_engine import compute_correlations

                findings = compute_correlations(
                    {"IPC": ipc, "Aprobación gobierno": aprob, "Paro": paro, "Polarización": polar}
                )
                top = None
                if findings:
                    f0 = findings[0]
                    var_a = getattr(f0, "var_a", "IPC")
                    var_b = getattr(f0, "var_b", "Aprobación gobierno")
                    r = getattr(f0, "r", -0.72)
                    top = f"correlación {('fuerte' if abs(r) > 0.6 else 'moderada')} entre {var_a} y {var_b} (r={r:.2f})"
                msg = top or "correlación fuerte entre IPC y aprobación gobierno (r=-0.72)"
            except Exception:
                msg = "correlación fuerte entre IPC y aprobación gobierno (r=-0.72)"

            st.markdown(
                f"""
                <div style="background:{BG3};border-left:3px solid {CYAN};border-radius:8px;
                    padding:10px 14px;margin-top:10px;">
                    <div style="color:{CYAN};font-size:0.72rem;text-transform:uppercase;
                        letter-spacing:0.08em;font-weight:600;">Hallazgo</div>
                    <div style="color:{TEXT};font-size:0.9rem;margin-top:4px;">{msg} en últimos 12 meses.</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        except Exception as exc:
            st.warning(f"Big data no disponible: {exc}")

    # Col 3: Eventos críticos
    with c3:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Eventos críticos</div>",
            unsafe_allow_html=True,
        )
        events: list[dict] = []
        try:
            from data_seeds import key_events_calendar as _kec  # type: ignore

            raw = getattr(_kec, "KEY_EVENTS", [])
            now = datetime.now()
            for e in raw:
                d = e.get("date")
                if isinstance(d, str):
                    try:
                        d = datetime.fromisoformat(d)
                    except Exception:
                        continue
                if d and d >= now:
                    events.append({**e, "date": d})
            events.sort(key=lambda x: x["date"])
        except Exception:
            base = datetime.now()
            events = [
                {"date": base + timedelta(days=3), "title": "Pleno del Congreso", "type": "Legislativo", "parties_affected": "PP, PSOE"},
                {"date": base + timedelta(days=8), "title": "Comparecencia BdE", "type": "Económico", "parties_affected": "Gobierno"},
                {"date": base + timedelta(days=15), "title": "Cumbre UE", "type": "Geopolítico", "parties_affected": "Gobierno, PP"},
                {"date": base + timedelta(days=22), "title": "CIS oleada", "type": "Demoscopia", "parties_affected": "Todos"},
            ]

        for ev in events[:4]:
            d = ev["date"]
            label = d.strftime("%d %b") if hasattr(d, "strftime") else str(d)
            tipo = ev.get("type", "—")
            color_map = {
                "Legislativo": BLUE, "Económico": AMBER, "Geopolítico": RED,
                "Demoscopia": PURPLE, "Mediático": CYAN,
            }
            tcolor = color_map.get(tipo, CYAN)
            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                    padding:10px 12px;margin-bottom:8px;border-left:3px solid {tcolor};">
                    <div style="color:{tcolor};font-size:0.72rem;font-weight:600;">{label}</div>
                    <div style="color:{TEXT};font-weight:600;font-size:0.9rem;margin-top:2px;">{ev.get('title','')}</div>
                    <div style="margin-top:6px;">{_badge(tipo, tcolor)}</div>
                    <div style="color:{TEXT2};font-size:0.75rem;margin-top:6px;">{ev.get('parties_affected','—')}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        st.markdown(
            f'<a href="#" style="color:{CYAN};font-size:0.85rem;text-decoration:none;">→ Ver calendario completo</a>',
            unsafe_allow_html=True,
        )
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — Análisis cruzado
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<h3 style="color:{TEXT};margin:32px 0 12px 0;font-weight:700;">'
    f"Análisis cruzado</h3>",
    unsafe_allow_html=True,
)

try:
    cc1, cc2 = st.columns(2)

    with cc1:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Red de influencia política</div>",
            unsafe_allow_html=True,
        )
        rendered = False
        try:
            from memory_engine.knowledge_graph import _seed_demo_graph, top_central_nodes

            try:
                _seed_demo_graph(TENANT_ID)
            except Exception:
                pass
            top = top_central_nodes(TENANT_ID, limit=10)

            nodes = []
            edges = []
            seen_ids = set()
            for node, deg in top:
                nid = getattr(node, "node_id", None) or getattr(node, "id", str(node))
                lbl = getattr(node, "label", nid)
                ntype = getattr(node, "node_type", "actor")
                nodes.append({"id": nid, "label": lbl, "type": ntype, "size": 10 + deg * 2})
                seen_ids.add(nid)
            # connect top nodes serially as fallback
            ids = [n["id"] for n in nodes]
            for i in range(len(ids) - 1):
                edges.append({"source": ids[i], "target": ids[i + 1], "weight": 1})

            from dashboard.ui.premium_charts import actor_network

            fig = actor_network(nodes, edges)
            if fig is not None:
                fig.update_layout(height=500)
                st.plotly_chart(fig, use_container_width=True, key="actor_net")
                rendered = True
                # Top 5 chips
                chips = "".join(
                    f'<span style="display:inline-block;padding:6px 12px;margin:4px 4px 0 0;'
                    f"border-radius:999px;background:{BG3};border:1px solid {BORDER};"
                    f'color:{CYAN};font-size:0.8rem;">{n["label"]}</span>'
                    for n in nodes[:5]
                )
                st.markdown(
                    f'<div style="margin-top:8px;color:{TEXT2};font-size:0.8rem;">'
                    f"Top 5 actores centrales:</div><div>{chips}</div>",
                    unsafe_allow_html=True,
                )
        except Exception:
            rendered = False
        if not rendered:
            st.info("Red de influencia: datos en proceso de seed.")

    with cc2:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Anomalías esta semana</div>",
            unsafe_allow_html=True,
        )
        anomalies: list[Any] = []
        try:
            from analytics.big_data_engine import detect_anomalies

            for varname, seed in [
                ("Volumen mediático PP", 30),
                ("Sentimiento PSOE", 31),
                ("Menciones VOX", 32),
                ("Engagement SUMAR", 33),
                ("Volatilidad líder", 34),
            ]:
                series = _demo_series(seed, n=40, base=50, vol=6)
                series[-1] += random.Random(seed).choice([-18, 18, -22, 25, -15])
                a = detect_anomalies(series, threshold=2.0)
                if a:
                    item = a[-1] if isinstance(a, list) else a
                    setattr(item, "variable", varname) if not hasattr(item, "variable") else None
                    anomalies.append((varname, item, series, seed))
                if len(anomalies) >= 5:
                    break
        except Exception:
            anomalies = []

        if not anomalies:
            anomalies = [
                ("Volumen mediático PP", None, _demo_series(30), 30),
                ("Sentimiento PSOE", None, _demo_series(31), 31),
                ("Menciones VOX", None, _demo_series(32), 32),
                ("Engagement SUMAR", None, _demo_series(33), 33),
                ("Volatilidad líder", None, _demo_series(34), 34),
            ]

        for i, item in enumerate(anomalies[:5]):
            varname, anomaly_obj, series, seed = item
            value = float(series[-1])
            expected = float(sum(series[:-1]) / max(1, len(series) - 1))
            severity = "alta" if abs(value - expected) > 12 else ("media" if abs(value - expected) > 6 else "baja")
            sev_color = RED if severity == "alta" else (AMBER if severity == "media" else GREEN)
            desc = f"Desviación de {value - expected:+.1f} sobre esperado."
            cA, cB = st.columns([5, 1])
            with cA:
                st.markdown(
                    f"""
                    <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:10px 12px;margin-bottom:6px;border-left:3px solid {sev_color};">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="color:{TEXT};font-weight:600;font-size:0.9rem;">{varname}</div>
                            {_badge(severity, sev_color)}
                        </div>
                        <div style="color:{TEXT2};font-size:0.78rem;margin-top:4px;">
                            Valor: <span style="color:{TEXT};font-weight:600;">{value:.1f}</span> ·
                            Esperado: <span style="color:{TEXT2};">{expected:.1f}</span>
                        </div>
                        <div style="color:{MUTED};font-size:0.75rem;margin-top:2px;">{desc}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                sk = _sparkline(series, color=sev_color, height=24)
                if sk is not None:
                    st.plotly_chart(sk, use_container_width=True, key=f"anom_sk_{i}")
            with cB:
                if st.button("Investigar", key=f"anom_btn_{i}", use_container_width=True):
                    st.session_state["investigation_target"] = varname
                    st.success(f"Objetivo: {varname}")
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Predicciones y forecasting
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<h3 style="color:{TEXT};margin:32px 0 12px 0;font-weight:700;">'
    f"Predicciones y forecasting</h3>",
    unsafe_allow_html=True,
)

try:
    fc1, fc2 = st.columns(2)

    with fc1:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Proyección a 30 días — Intención de voto</div>",
            unsafe_allow_html=True,
        )
        try:
            import plotly.graph_objects as go

            from analytics.big_data_engine import forecast_series

            parties = {
                "PP": (35.2, CYAN, 100),
                "PSOE": (28.5, RED, 101),
                "VOX": (12.1, GREEN, 102),
            }
            fig = go.Figure()
            method = "ema"
            confidence = 0.78
            for party, (base, color, seed) in parties.items():
                hist = _demo_series(seed, n=60, base=base, vol=0.6)
                try:
                    fc = forecast_series(hist, horizon=30)
                    pred = getattr(fc, "predictions", None) or getattr(fc, "forecast", None) or []
                    lower = getattr(fc, "lower", None) or [v * 0.96 for v in pred]
                    upper = getattr(fc, "upper", None) or [v * 1.04 for v in pred]
                    method = getattr(fc, "method", method)
                    confidence = getattr(fc, "confidence", confidence)
                except Exception:
                    pred = [hist[-1] + (i * 0.02) for i in range(30)]
                    lower = [v - 1.2 for v in pred]
                    upper = [v + 1.2 for v in pred]

                x_hist = list(range(len(hist)))
                x_fc = list(range(len(hist), len(hist) + len(pred)))
                fig.add_trace(go.Scatter(x=x_hist, y=hist, mode="lines", name=f"{party} (hist)", line=dict(color=color, width=2)))
                fig.add_trace(go.Scatter(x=x_fc, y=pred, mode="lines", name=f"{party} (forecast)", line=dict(color=color, width=2, dash="dash")))
                fig.add_trace(go.Scatter(x=x_fc + x_fc[::-1], y=upper + lower[::-1], fill="toself", fillcolor=color + "22", line=dict(color="rgba(0,0,0,0)"), showlegend=False, hoverinfo="skip"))

            fig.update_layout(
                height=320,
                margin=dict(l=10, r=10, t=10, b=10),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(gridcolor=BORDER, color=TEXT2),
                yaxis=dict(gridcolor=BORDER, color=TEXT2),
                legend=dict(font=dict(color=TEXT2, size=10), bgcolor="rgba(0,0,0,0)"),
            )
            st.plotly_chart(fig, use_container_width=True, key="forecast_chart")
            st.markdown(
                f'<div style="color:{TEXT2};font-size:0.85rem;">'
                f"Confianza del modelo: <span style=\"color:{CYAN};font-weight:600;\">"
                f"{confidence * 100:.0f}%</span> · Método: <span style=\"color:{TEXT};\">{method}</span></div>",
                unsafe_allow_html=True,
            )
        except Exception as exc:
            st.warning(f"Forecast no disponible: {exc}")

    with fc2:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;font-size:1.1rem;margin-bottom:10px;">'
            f"Temas emergentes</div>",
            unsafe_allow_html=True,
        )
        topics: list[dict] = []
        try:
            from analytics.trend_detection import rank_emerging_topics

            demo_topics = {
                "Vivienda": _demo_series(70, n=20, base=20, vol=2),
                "Sanidad": _demo_series(71, n=20, base=18, vol=2),
                "Inmigración": _demo_series(72, n=20, base=15, vol=2),
                "Energía": _demo_series(73, n=20, base=14, vol=2),
                "Justicia": _demo_series(74, n=20, base=12, vol=2),
                "Educación": _demo_series(75, n=20, base=10, vol=2),
            }
            try:
                ranked = rank_emerging_topics(demo_topics, top_k=5)
                for r in ranked:
                    name = getattr(r, "topic", None) or getattr(r, "name", None) or (r if isinstance(r, str) else "—")
                    growth = getattr(r, "growth_rate", None) or getattr(r, "score", 0.0)
                    topics.append({"name": name, "growth": float(growth)})
            except Exception:
                pass
        except Exception:
            pass
        if not topics:
            topics = [
                {"name": "Vivienda", "growth": 0.42},
                {"name": "Inmigración", "growth": 0.31},
                {"name": "Energía", "growth": 0.24},
                {"name": "Sanidad", "growth": 0.18},
                {"name": "Justicia", "growth": 0.12},
            ]

        max_g = max((t["growth"] for t in topics), default=1.0) or 1.0
        for i, t in enumerate(topics[:5]):
            pct = (t["growth"] / max_g) * 100
            cA, cB = st.columns([5, 1])
            with cA:
                st.markdown(
                    f"""
                    <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:10px 14px;margin-bottom:6px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="color:{TEXT};font-weight:600;">{t['name']}</div>
                            <div style="color:{GREEN};font-weight:600;">+{t['growth']*100:.1f}%</div>
                        </div>
                        <div style="height:6px;background:{BORDER};border-radius:3px;margin-top:8px;">
                            <div style="height:100%;width:{pct:.0f}%;
                                background:linear-gradient(90deg,{CYAN},{PURPLE});
                                border-radius:3px;"></div>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            with cB:
                if st.button("Profundizar", key=f"topic_btn_{i}", use_container_width=True):
                    st.session_state["topic_focus"] = t["name"]
                    st.success(f"Tema: {t['name']}")
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Memoria institucional
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<h3 style="color:{TEXT};margin:32px 0 12px 0;font-weight:700;">'
    f"Memoria del workspace</h3>",
    unsafe_allow_html=True,
)

try:
    mc1, mc2, mc3 = st.columns(3)

    with mc1:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;margin-bottom:8px;">Episodios recientes</div>',
            unsafe_allow_html=True,
        )
        try:
            from memory_engine.episodic_memory import _seed_demo_episodes, recall_recent

            try:
                _seed_demo_episodes(TENANT_ID)
            except Exception:
                pass
            episodes = recall_recent(TENANT_ID, limit=5)
        except Exception:
            episodes = []
        if not episodes:
            episodes = [
                type("E", (), {"title": "Briefing matinal", "created_at": datetime.now() - timedelta(hours=3), "importance": 0.85})(),
                type("E", (), {"title": "Análisis CIS oleada", "created_at": datetime.now() - timedelta(days=1), "importance": 0.72})(),
                type("E", (), {"title": "Reunión campaña", "created_at": datetime.now() - timedelta(days=2), "importance": 0.6})(),
            ]
        for i, ep in enumerate(episodes[:5]):
            title = getattr(ep, "title", None) or getattr(ep, "key", "Episodio")
            ts = getattr(ep, "created_at", None) or getattr(ep, "timestamp", datetime.now())
            try:
                ts_str = ts.strftime("%d %b %H:%M")
            except Exception:
                ts_str = str(ts)[:16]
            imp = float(getattr(ep, "importance", 0.5) or 0.5)
            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:8px 12px;margin-bottom:6px;">
                    <div style="color:{TEXT};font-size:0.88rem;font-weight:600;">{title}</div>
                    <div style="color:{TEXT2};font-size:0.72rem;">{ts_str}</div>
                    <div style="height:3px;background:{BORDER};border-radius:2px;margin-top:6px;">
                        <div style="height:100%;width:{imp*100:.0f}%;background:{PURPLE};border-radius:2px;"></div>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    with mc2:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;margin-bottom:8px;">Conocimiento aprendido</div>',
            unsafe_allow_html=True,
        )
        try:
            from memory_engine.semantic_memory import _seed_demo_facts, list_facts

            try:
                _seed_demo_facts(TENANT_ID)
            except Exception:
                pass
            facts = list_facts(TENANT_ID)
        except Exception:
            facts = []
        if not facts:
            facts = [
                type("F", (), {"key": "PP lidera en mayores de 65", "value": "0.42", "confidence": 0.82})(),
                type("F", (), {"key": "PSOE fuerte en metropolitanas", "value": "0.38", "confidence": 0.79})(),
                type("F", (), {"key": "VOX crece en zonas rurales", "value": "+12%", "confidence": 0.74})(),
                type("F", (), {"key": "SUMAR estable jóvenes", "value": "0.18", "confidence": 0.68})(),
                type("F", (), {"key": "Volatilidad inversa al PIB", "value": "r=-0.55", "confidence": 0.7})(),
            ]
        for f in facts[:5]:
            key = getattr(f, "key", None) or getattr(f, "fact_key", "—")
            val = getattr(f, "value", None) or getattr(f, "fact_value", "")
            conf = float(getattr(f, "confidence", 0.5) or 0.5)
            conf_color = GREEN if conf > 0.75 else (AMBER if conf > 0.5 else RED)
            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:8px 12px;margin-bottom:6px;">
                    <div style="color:{TEXT};font-size:0.85rem;">{key}</div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;">
                        <span style="color:{CYAN};font-size:0.78rem;font-weight:600;">{val}</span>
                        <span style="color:{conf_color};font-size:0.72rem;">conf {conf:.2f}</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    with mc3:
        st.markdown(
            f'<div style="color:{TEXT};font-weight:600;margin-bottom:8px;">Snapshots</div>',
            unsafe_allow_html=True,
        )
        try:
            from memory_engine.snapshot_store import list_snapshots

            snaps = list_snapshots(TENANT_ID, limit=5)
        except Exception:
            snaps = []
        if not snaps:
            snaps = [
                type("S", (), {"name": f"Snapshot {i}", "created_at": datetime.now() - timedelta(days=i), "tags": ["auto", "diario"]})()
                for i in range(1, 6)
            ]
        for s in snaps[:5]:
            name = getattr(s, "name", None) or getattr(s, "title", "Snapshot")
            ts = getattr(s, "created_at", None) or getattr(s, "captured_at", datetime.now())
            try:
                ts_str = ts.strftime("%d %b %H:%M")
            except Exception:
                ts_str = str(ts)[:16]
            tags = getattr(s, "tags", []) or []
            tag_html = "".join(
                f'<span style="background:{BG3};color:{CYAN};border:1px solid {BORDER};'
                f'border-radius:8px;padding:1px 6px;margin-right:4px;font-size:0.7rem;">{t}</span>'
                for t in tags[:3]
            )
            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:8px 12px;margin-bottom:6px;">
                    <div style="color:{TEXT};font-size:0.85rem;font-weight:600;">{name}</div>
                    <div style="color:{TEXT2};font-size:0.72rem;">{ts_str}</div>
                    <div style="margin-top:4px;">{tag_html}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown(
        f'<div style="margin-top:8px;"><a href="N_Memoria" style="color:{CYAN};font-size:0.85rem;text-decoration:none;">→ Ver memoria completa</a></div>',
        unsafe_allow_html=True,
    )
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — Workflows recomendados
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<h3 style="color:{TEXT};margin:32px 0 12px 0;font-weight:700;">'
    f"Workflows recomendados</h3>",
    unsafe_allow_html=True,
)

try:
    workflows: list[Any] = []
    try:
        from services.workflows.workflow_engine import list_workflows

        workflows = list_workflows() or []
    except Exception:
        workflows = []

    if not workflows:
        workflows = [
            type("W", (), {"workflow_id": "rapid_briefing", "name": "Briefing rápido", "estimated_time_min": 8, "description": "Resumen ejecutivo de 30s"})(),
            type("W", (), {"workflow_id": "crisis_response", "name": "Respuesta a crisis", "estimated_time_min": 15, "description": "Plan de respuesta inmediata"})(),
            type("W", (), {"workflow_id": "actor_dossier", "name": "Dossier de actor", "estimated_time_min": 12, "description": "Perfil 360° de actor político"})(),
            type("W", (), {"workflow_id": "narrative_response", "name": "Respuesta narrativa", "estimated_time_min": 10, "description": "Counter-frame ante narrativa rival"})(),
        ]

    wf_cols = st.columns(4)
    for i, (col, wf) in enumerate(zip(wf_cols, workflows[:4])):
        with col:
            wf_id = getattr(wf, "workflow_id", f"wf_{i}")
            wf_name = getattr(wf, "name", "Workflow")
            wf_time = getattr(wf, "estimated_time_min", None) or getattr(wf, "estimated_minutes", 10)
            wf_desc = getattr(wf, "description", "") or ""
            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;
                    padding:16px;height:170px;display:flex;flex-direction:column;
                    justify-content:space-between;transition:all 0.2s;"
                    onmouseover="this.style.borderColor='{CYAN}';this.style.boxShadow='0 4px 20px {CYAN}22';"
                    onmouseout="this.style.borderColor='{BORDER}';this.style.boxShadow='none';">
                    <div>
                        <div style="color:{TEXT};font-weight:600;font-size:1rem;">{wf_name}</div>
                        <div style="color:{TEXT2};font-size:0.8rem;margin-top:6px;line-height:1.4;">{wf_desc[:100]}</div>
                    </div>
                    <div style="color:{CYAN};font-size:0.78rem;margin-top:8px;">~{wf_time} min</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button("Iniciar", key=f"wf_start_{i}_{wf_id}", use_container_width=True):
                st.session_state["active_workflow"] = wf_id
                st.success(f"Iniciado: {wf_name}")
except Exception as exc:
    st.warning(f"Sección no disponible: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Floating action button — Pregúntale al Brain
# ─────────────────────────────────────────────────────────────────────────────
try:
    fab_html = f"""
    <a href="N8_ChatIA" target="_self" style="text-decoration:none;">
        <div style="
            position: fixed;
            bottom: 28px;
            right: 28px;
            background: linear-gradient(135deg, {CYAN} 0%, {BLUE} 100%);
            color: #001018;
            font-weight: 700;
            font-size: 0.95rem;
            padding: 14px 22px;
            border-radius: 999px;
            box-shadow: 0 10px 40px rgba(0,212,255,0.45),
                        0 0 0 1px rgba(255,255,255,0.1) inset;
            z-index: 9999;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            letter-spacing: 0.02em;"
            onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 12px 50px rgba(0,212,255,0.6)';"
            onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 10px 40px rgba(0,212,255,0.45)';">
            Pregúntale al Brain
        </div>
    </a>
    """
    st.markdown(fab_html, unsafe_allow_html=True)
except Exception:
    pass
