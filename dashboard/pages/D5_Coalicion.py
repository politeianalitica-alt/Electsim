"""
D5 — Gobierno & Coalición
Mega-página: Hemiciclo · Análisis de Coalición · Agenda Ejecutiva · Escenarios de Ruptura
"""
from __future__ import annotations
import re
import sys
from pathlib import Path
from datetime import datetime, timedelta

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Gobierno & Coalición — ElectSim",
    page_icon="",
    layout="wide",
)
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("coalicion")

# ── Constantes ────────────────────────────────────────────────────────────────
TOTAL_ESCANOS = 350
MAYORIA_ABS = 176

# ── Escenarios predefinidos ───────────────────────────────────────────────────
ESCENARIOS = {
    "Actual 2024": {
        "escanos": {"PSOE": 120, "PP": 137, "VOX": 33, "SUMAR": 31,
                    "JUNTS": 7, "PNV": 5, "ERC": 7, "EH Bildu": 6, "BNG": 1, "CC": 1,
                    "UPN": 1, "PRC": 1},
        "descripcion": "Resultados Congreso 2023 · Gobierno PSOE-SUMAR con apoyos puntuales",
        "color": BLUE,
    },
    "Encuesta actual": {
        "escanos": {"PSOE": 108, "PP": 150, "VOX": 28, "SUMAR": 25,
                    "JUNTS": 8, "PNV": 5, "ERC": 6, "EH Bildu": 7, "BNG": 2, "CC": 1},
        "descripcion": "Proyección CIS + sondeos privados 2024 · PP primera fuerza",
        "color": CYAN,
    },
    "Escenario favorable PP": {
        "escanos": {"PP": 165, "VOX": 40, "PSOE": 100, "SUMAR": 18,
                    "JUNTS": 7, "PNV": 5, "ERC": 5, "EH Bildu": 5, "BNG": 2, "CC": 3},
        "descripcion": "Escenario optimista PP · Mayoría PP+VOX posible",
        "color": "#009FDB",
    },
    "Gran coalición": {
        "escanos": {"PP": 155, "PSOE": 125, "VOX": 35, "SUMAR": 22,
                    "JUNTS": 5, "PNV": 4, "ERC": 4},
        "descripcion": "Escenario hipotético de polarización extrema",
        "color": PURPLE,
    },
}

# ── Datos carga ───────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def _cargar_sondeo() -> dict[str, float]:
    try:
        df = _db.cargar_nowcasting()
        if df is not None and not df.empty:
            col_pct = next((c for c in ["estimacion_pct","voto_pct","intencion_voto"] if c in df.columns), None)
            col_part = next((c for c in ["partido_siglas","partido","siglas"] if c in df.columns), None)
            if col_pct and col_part:
                df[col_pct] = pd.to_numeric(df[col_pct], errors="coerce")
                return dict(zip(df[col_part].astype(str), df[col_pct].fillna(0)))
    except Exception:
        pass
    return {"PP": 32.1, "PSOE": 28.4, "VOX": 11.2, "SUMAR": 9.8,
            "JUNTS": 4.2, "PNV": 3.1, "ERC": 3.0, "EH Bildu": 2.8, "BNG": 1.5}


@st.cache_data(ttl=300)
def _calcular_escanos(sondeo: tuple) -> dict[str, int]:
    votos = dict(sondeo)
    try:
        from dashboard.services.coalition_service import dhondt
        return dhondt(votos)
    except Exception:
        # Fallback D'Hondt nativo
        total = sum(votos.values())
        validos = {p: v for p, v in votos.items() if (v / max(total, 1)) * 100 >= 3.0}
        esc = {p: 0 for p in validos}
        for _ in range(TOTAL_ESCANOS):
            cocientes = {p: validos[p] / (esc[p] + 1) for p in validos}
            ganador = max(cocientes, key=lambda k: cocientes[k])
            esc[ganador] += 1
        return esc


@st.cache_data(ttl=300)
def _analizar_coaliciones(escanos_tuple: tuple) -> list:
    escanos = dict(escanos_tuple)
    try:
        from dashboard.services.coalition_service import analizar_coaliciones
        return analizar_coaliciones(escanos)
    except Exception:
        return []


@st.cache_data(ttl=600)
def _probabilidad_bayesiana(sondeo_tuple: tuple, sigma: float = 2.5, n_sim: int = 5000) -> dict:
    sondeo = dict(sondeo_tuple)
    try:
        from dashboard.services.coalition_service import probabilidad_bayesiana_mayoria
        return probabilidad_bayesiana_mayoria(sondeo, sigma, n_sim)
    except Exception:
        np.random.seed(42)
        resultados = {}
        partidos = list(sondeo.keys())
        votos_base = np.array([sondeo.get(p, 0) for p in partidos])
        for _ in range(n_sim):
            ruido = np.random.normal(0, sigma, len(partidos))
            v_sim = np.clip(votos_base + ruido, 0.1, 60)
            total = sum(v_sim)
            validos = {p: v for p, v in zip(partidos, v_sim) if (v / total) * 100 >= 3.0}
            esc_sim = {p: 0 for p in validos}
            for _ in range(TOTAL_ESCANOS):
                if not validos:
                    break
                cocientes = {p: validos[p] / (esc_sim[p] + 1) for p in validos}
                g = max(cocientes, key=lambda k: cocientes[k])
                esc_sim[g] += 1
            mayoria_pp_vox = esc_sim.get("PP", 0) + esc_sim.get("VOX", 0) >= MAYORIA_ABS
            mayoria_psoe_izq = (esc_sim.get("PSOE", 0) + esc_sim.get("SUMAR", 0) +
                                esc_sim.get("ERC", 0) + esc_sim.get("JUNTS", 0) +
                                esc_sim.get("PNV", 0) + esc_sim.get("EH Bildu", 0)) >= MAYORIA_ABS
            resultados.setdefault("PP+VOX", 0)
            resultados.setdefault("PSOE+izquierda", 0)
            resultados["PP+VOX"] += int(mayoria_pp_vox)
            resultados["PSOE+izquierda"] += int(mayoria_psoe_izq)
        return {k: round(v / n_sim, 3) for k, v in resultados.items()}


def _normalizar_tipo_agenda(tipo: str, texto: str = "") -> str:
    raw = f"{tipo or ''} {texto or ''}".lower()
    if "senado"in raw:
        return "senado"
    if any(k in raw for k in ["congreso", "pleno", "comisión", "comision", "parlamento"]):
        return "congreso"
    if any(k in raw for k in ["consejo", "ministros", "gobierno"]):
        return "consejo"
    if any(k in raw for k in ["rueda", "prensa", "comparecencia", "entrevista", "comunicación"]):
        return "media"
    if any(k in raw for k in ["cumbre", "ue", "europe", "exterior", "internacional", "diplomacia"]):
        return "diplomacia"
    if any(k in raw for k in ["ley", "decreto", "boe", "legisl"]):
        return "legislación"
    if any(k in raw for k in ["psoe", "pp", "vox", "sumar", "junts", "erc", "pnv", "bildu"]):
        return "partido"
    return "institucional"


def _parse_agenda_dt(value) -> pd.Timestamp | None:
    dt = pd.to_datetime(value, errors="coerce")
    if pd.isna(dt):
        return None
    return dt


def _agenda_row_to_event(row: dict, lunes_dt: datetime, domingo_dt: datetime) -> dict | None:
    title = str(
        row.get("titulo_evento")
        or row.get("titulo")
        or row.get("title")
        or row.get("resumen")
        or ""
    ).strip()
    if not title:
        return None
    raw_date = (
        row.get("fecha_evento")
        or row.get("fecha_publicacion")
        or row.get("fecha")
        or row.get("date")
    )
    dt = _parse_agenda_dt(raw_date)
    if dt is None:
        return None
    dt_py = dt.to_pydatetime()
    if not (lunes_dt.date() <= dt_py.date() <= domingo_dt.date()):
        return None
    raw_hour = str(row.get("hora_inicio") or row.get("hora") or "").strip()
    if raw_hour:
        hour_match = re.search(r"\b(\d{1,2}:\d{2})\b", raw_hour)
        hora = hour_match.group(1) if hour_match else raw_hour[:5]
    else:
        hour_match = re.search(r"\b(\d{1,2}:\d{2})\b", str(raw_date))
        hora = hour_match.group(1) if hour_match else ""
    actor = str(
        row.get("actor")
        or row.get("nombre_lider")
        or row.get("partido")
        or row.get("fuente")
        or "Agenda oficial"
    ).strip()
    tipo = _normalizar_tipo_agenda(str(row.get("tipo_evento") or row.get("tipo") or ""), f"{actor} {title}")
    return {
        "dia": (dt_py.date() - lunes_dt.date()).days,
        "hora": hora or "—",
        "actor": actor[:38],
        "evento": title[:140],
        "tipo": tipo,
        "url": str(row.get("url_fuente") or row.get("url") or row.get("enlace") or ""),
        "fuente": str(row.get("fuente") or "BD"),
    }


@st.cache_data(ttl=900, show_spinner=False)
def _cargar_agenda_operativa(lunes_iso: str, domingo_iso: str) -> tuple[list[dict], str]:
    """Agenda real: BD institucional primero, fuentes oficiales online después."""
    lunes_dt = datetime.fromisoformat(lunes_iso)
    domingo_dt = datetime.fromisoformat(domingo_iso)
    rows: list[dict] = []
    source = ""

    try:
        df = _db.cargar_agenda_institucional(dias_atras=0, dias_adelante=7, limit=120)
        if df is not None and not df.empty:
            rows = df.to_dict("records")
            source = "BD agenda_item"
    except Exception:
        rows = []

    if not rows:
        try:
            from etl.sources.agendas_dinamicas import fetch_all_agendas

            rows = fetch_all_agendas(max_items_per_source=18)
            source = "Fuentes oficiales online"
        except Exception:
            rows = []
            source = ""

    events = []
    seen = set()
    for row in rows:
        ev = _agenda_row_to_event(row, lunes_dt, domingo_dt)
        if not ev:
            continue
        key = (ev["dia"], ev["hora"], ev["actor"].lower(), ev["evento"].lower())
        if key in seen:
            continue
        seen.add(key)
        events.append(ev)
    events.sort(key=lambda e: (e["dia"], e["hora"] if e["hora"] != "—"else "99:99", e["actor"]))
    return events[:70], source or "Sin fuente"


# ── Header ────────────────────────────────────────────────────────────────────
sondeo_actual = _cargar_sondeo()

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{PURPLE},{BLUE});
              border-radius:12px;display:flex;align-items:center;
              justify-content:center;font-size:1.5rem;flex-shrink:0"></div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.55rem;font-weight:900">Gobierno & Coalición</h2>
    <div style="color:{TEXT2};font-size:.82rem">
      Hemiciclo · Aritmética de coaliciones · Agenda ejecutiva · Escenarios de ruptura
    </div>
  </div>
  <div style="margin-left:auto;text-align:right">
    <div style="font-size:.7rem;color:{MUTED}">Actualización</div>
    <div style="font-size:.85rem;color:{CYAN};font-family:monospace">{datetime.now().strftime("%d/%m/%Y %H:%M")}</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_hemi, tab_coal, tab_agenda, tab_ruptura = st.tabs([
    "Hemiciclo",
    "Coaliciones",
    "Agenda",
    "⚠ Escenarios de Ruptura",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: HEMICICLO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_hemi:
    col_sel, col_info = st.columns([2, 3])
    with col_sel:
        escenario_elegido = st.selectbox(
            "Escenario",
            options=list(ESCENARIOS.keys()),
            index=0,
            key="hemi_escenario",
        )
    with col_info:
        info_escenario = ESCENARIOS[escenario_elegido]
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid '
            f'{info_escenario["color"]};border-radius:10px;padding:.7rem 1rem;margin-top:1.4rem">'
            f'<div style="font-size:.8rem;color:{TEXT2}">{info_escenario["descripcion"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    escanos_esc = ESCENARIOS[escenario_elegido]["escanos"]

    # Hemiciclo Plotly
    col_hemi, col_tabla = st.columns([3, 2])
    with col_hemi:
        try:
            from dashboard.services.coalition_service import hemiciclo_plotly
            fig_hemi = hemiciclo_plotly(
                escanos=escanos_esc,
                colores_partidos=COLORES_PARTIDOS,
                titulo=f"Congreso — {escenario_elegido}",
            )
            fig_hemi.update_layout(paper_bgcolor=BG2, plot_bgcolor=BG2)
            st.plotly_chart(fig_hemi, use_container_width=True)
        except Exception as exc_hemi:
            # Fallback hemiciclo manual
            partidos_ord = sorted(escanos_esc.items(), key=lambda x: x[1], reverse=True)
            total = sum(escanos_esc.values())
            n_filas = 5
            puntos_x: list[float] = []
            puntos_y: list[float] = []
            puntos_color: list[str] = []
            puntos_label: list[str] = []
            puntos_hover: list[str] = []

            for fila in range(n_filas):
                r = 0.45 + fila * 0.13
                n_en_fila = total // n_filas + (1 if fila < total % n_filas else 0)
                angulos = np.linspace(np.pi, 0, n_en_fila + 2)[1:-1]
                for ang in angulos:
                    puntos_x.append(float(r * np.cos(ang)))
                    puntos_y.append(float(r * np.sin(ang)))

            all_pts = list(zip(puntos_x[:total], puntos_y[:total]))
            idx_pt = 0
            for partido, n_esc in partidos_ord:
                color = COLORES_PARTIDOS.get(partido, CYAN)
                for _ in range(n_esc):
                    if idx_pt < len(all_pts):
                        puntos_color.append(color)
                        puntos_label.append(partido)
                        puntos_hover.append(f"{partido} ({n_esc} esc.)")
                        idx_pt += 1

            fig_hemi = go.Figure()
            for partido, n_esc in partidos_ord:
                idxs = [i for i, l in enumerate(puntos_label) if l == partido]
                if not idxs:
                    continue
                xs = [all_pts[i][0] for i in idxs if i < len(all_pts)]
                ys = [all_pts[i][1] for i in idxs if i < len(all_pts)]
                color = COLORES_PARTIDOS.get(partido, CYAN)
                fig_hemi.add_trace(go.Scatter(
                    x=xs, y=ys, mode="markers",
                    marker=dict(size=8, color=color, line=dict(width=0.5, color=BG2)),
                    name=f"{partido} ({n_esc})",
                    hovertemplate=f"<b>{partido}</b><br>{n_esc} escaños<extra></extra>",
                ))
            fig_hemi.add_shape(type="line", x0=0, y0=-0.05, x1=0, y1=0.75,
                               line=dict(color=RED, width=1.5, dash="dash"))
            fig_hemi.add_annotation(x=0.06, y=0.77, text=f"Mayoría<br>{MAYORIA_ABS}",
                                    font=dict(size=9, color=RED), showarrow=False)
            fig_hemi.update_layout(
                paper_bgcolor=BG2, plot_bgcolor=BG2,
                font=dict(color=TEXT),
                title=dict(text=f"Congreso — {escenario_elegido}", font=dict(size=13, color=TEXT2), x=0.5),
                showlegend=True,
                legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.1,
                            font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                xaxis=dict(visible=False, range=[-0.85, 0.85]),
                yaxis=dict(visible=False, range=[-0.1, 0.88], scaleanchor="x"),
                margin=dict(t=40, b=80, l=10, r=10),
                height=400,
            )
            st.plotly_chart(fig_hemi, use_container_width=True)

    with col_tabla:
        section_header("Aritmética de coalición", BLUE)
        # Tracker mayoría
        total_escanos_esc = sum(escanos_esc.values())
        partidos_sorted = sorted(escanos_esc.items(), key=lambda x: x[1], reverse=True)

        # KPI resumen
        partido_lider = partidos_sorted[0][0] if partidos_sorted else "—"
        esc_lider = partidos_sorted[0][1] if partidos_sorted else 0
        faltan_mayoria = max(0, MAYORIA_ABS - esc_lider)

        st.markdown(
            f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem">'
            f'{kpi_card("PRIMERA FUERZA", partido_lider, f"{esc_lider} escaños", COLORES_PARTIDOS.get(partido_lider, CYAN))}'
            f'{kpi_card("FALTAN P/MAYORÍA", str(faltan_mayoria), f"para {MAYORIA_ABS} escaños", RED if faltan_mayoria > 20 else AMBER if faltan_mayoria > 0 else GREEN)}'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Barra de mayoría absoluta
        pct_lider = esc_lider / TOTAL_ESCANOS * 100
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:.8rem 1rem;margin-bottom:.8rem">'
            f'<div style="display:flex;justify-content:space-between;margin-bottom:.4rem">'
            f'<span style="font-size:.72rem;color:{TEXT2}">Escaños {partido_lider}</span>'
            f'<span style="font-size:.72rem;color:{TEXT2}">{esc_lider} / {MAYORIA_ABS} (mayoría)</span>'
            f'</div>'
            f'<div style="background:{BORDER};border-radius:4px;height:8px;overflow:hidden">'
            f'<div style="background:{"linear-gradient(90deg," + GREEN + "," + CYAN + ")"if esc_lider >= MAYORIA_ABS else "linear-gradient(90deg," + RED + "," + AMBER + ")"};'
            f'width:{min(100, pct_lider / (MAYORIA_ABS / TOTAL_ESCANOS * 100) * 100):.1f}%;height:100%;border-radius:4px"></div>'
            f'</div></div>',
            unsafe_allow_html=True,
        )

        # Tabla de partidos
        for partido, esc in partidos_sorted:
            c = COLORES_PARTIDOS.get(partido, CYAN)
            pct_bar = esc / TOTAL_ESCANOS * 100
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem">'
                f'<div style="width:3px;height:18px;background:{c};border-radius:2px;flex-shrink:0"></div>'
                f'<span style="font-size:.78rem;font-weight:700;color:{TEXT};width:70px">{partido}</span>'
                f'<div style="flex:1;background:{BORDER};border-radius:3px;height:6px;overflow:hidden">'
                f'<div style="background:{c};width:{pct_bar:.1f}%;height:100%;border-radius:3px"></div></div>'
                f'<span style="font-size:.75rem;color:{TEXT2};font-family:monospace;width:45px;text-align:right">'
                f'{esc} esc</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        # Combinaciones para mayoría
        section_header("¿Quién necesita a quién?", PURPLE)
        combos_mayoria = []
        ps = list(escanos_esc.items())
        import itertools as _it
        for r in range(2, min(5, len(ps) + 1)):
            for combo in _it.combinations(ps, r):
                total_c = sum(e for _, e in combo)
                if total_c >= MAYORIA_ABS:
                    combos_mayoria.append((tuple(p for p, _ in combo), total_c))
                    break  # tomar el primer combo por tamaño
            if len(combos_mayoria) >= 5:
                break

        for partidos_c, total_c in combos_mayoria[:5]:
            colors_c = [COLORES_PARTIDOS.get(p, MUTED) for p in partidos_c]
            tags = "".join(
                f'<span style="background:{cc}22;color:{cc};font-size:.62rem;font-weight:700;'
                f'padding:.15rem .4rem;border-radius:5px;border:1px solid {cc}44">{p}</span> '
                for p, cc in zip(partidos_c, colors_c)
            )
            exceso = total_c - MAYORIA_ABS
            exceso_html = (
                f'<span style="color:{GREEN};font-size:.65rem">+{exceso}</span>'
                if exceso >= 0 else ""
            )
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
                f'padding:.5rem .7rem;margin-bottom:.35rem;display:flex;align-items:center;gap:.5rem">'
                f'<div style="flex:1">{tags}</div>'
                f'<span style="font-size:.72rem;color:{TEXT2};font-family:monospace">{total_c} esc {exceso_html}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: COALICIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_coal:
    section_header("Análisis de coaliciones posibles", CYAN)

    escanos_sondeo = _calcular_escanos(tuple(sorted(sondeo_actual.items())))
    coaliciones = _analizar_coaliciones(tuple(sorted(escanos_sondeo.items())))

    # Mostrar top coaliciones
    if coaliciones:
        cols_coal = st.columns(2)
        for ci, coal in enumerate(coaliciones[:6]):
            c_idx = ci % 2
            tiene_may = coal.tiene_mayoria
            prob_pct = int(coal.probabilidad * 100)
            color_may = GREEN if tiene_may else RED
            label_may = "MAYORÍA"if tiene_may else "SIN MAYORÍA"

            # Colores de partidos en la coalición
            tags_coal = "".join(
                f'<span style="background:{COLORES_PARTIDOS.get(p, MUTED)}22;'
                f'color:{COLORES_PARTIDOS.get(p, MUTED)};font-size:.65rem;font-weight:700;'
                f'padding:.18rem .5rem;border-radius:6px;border:1px solid {COLORES_PARTIDOS.get(p, MUTED)}44">{p}</span> '
                for p in coal.partidos
            )

            # Barra de probabilidad
            bar_color = GREEN if prob_pct >= 50 else AMBER if prob_pct >= 25 else RED

            with cols_coal[c_idx]:
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};'
                    f'border-top:3px solid {color_may};border-radius:12px;'
                    f'padding:1rem 1.1rem;margin-bottom:.7rem">'
                    f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">'
                    f'<span style="font-size:.85rem;font-weight:800;color:{TEXT}">{coal.nombre}</span>'
                    f'<span style="margin-left:auto;background:{color_may}22;color:{color_may};'
                    f'font-size:.6rem;font-weight:800;padding:.18rem .55rem;border-radius:6px;'
                    f'border:1px solid {color_may}44">{label_may}</span>'
                    f'</div>'
                    f'<div style="margin-bottom:.5rem">{tags_coal}</div>'
                    f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem">'
                    f'<span style="font-size:.72rem;color:{TEXT2}">Escaños: <b style="color:{TEXT}">{coal.escanos_totales}</b></span>'
                    f'<span style="font-size:.72rem;color:{TEXT2}">Prob: <b style="color:{bar_color}">{prob_pct}%</b></span>'
                    f'</div>'
                    f'<div style="background:{BORDER};border-radius:4px;height:5px;overflow:hidden">'
                    f'<div style="background:linear-gradient(90deg,{bar_color},{bar_color}88);'
                    f'width:{prob_pct}%;height:100%;border-radius:4px"></div>'
                    f'</div>'
                    f'<div style="font-size:.72rem;color:{MUTED};margin-top:.4rem">{coal.descripcion}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.info("No se han podido calcular coaliciones. Comprueba los datos del sondeo.")

    # Monte Carlo
    section_header("Probabilidad bayesiana — Monte Carlo 5.000 sim.", PURPLE)
    probs_mc = _probabilidad_bayesiana(tuple(sorted(sondeo_actual.items())))

    if probs_mc:
        fig_mc = go.Figure()
        nombres_mc = list(probs_mc.keys())
        valores_mc = [probs_mc[k] * 100 for k in nombres_mc]
        colores_mc = [GREEN if v >= 50 else AMBER if v >= 25 else RED for v in valores_mc]

        fig_mc.add_trace(go.Bar(
            x=nombres_mc,
            y=valores_mc,
            marker_color=colores_mc,
            marker_line_color=BORDER,
            marker_line_width=1,
            text=[f"{v:.1f}%"for v in valores_mc],
            textposition="outside",
            textfont=dict(color=TEXT2, size=12),
        ))
        fig_mc.add_hline(y=50, line_dash="dash", line_color=CYAN,
                         annotation_text="50% umbral", annotation_font_color=CYAN,
                         annotation_font_size=10)
        fig_mc.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT),
            height=280,
            margin=dict(l=10, r=10, t=10, b=10),
            xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT)),
            yaxis=dict(gridcolor=BORDER, title="Prob. mayoría (%)", tickfont=dict(color=TEXT2), range=[0, 105]),
        )
        st.plotly_chart(fig_mc, use_container_width=True)

    # Gauges de tensión de ruptura
    section_header("Indicadores de tensión de coalición", RED)
    TENSIONES = [
        {"label": "Tensión PSOE-SUMAR",    "value": 58, "color": AMBER},
        {"label": "Tensión PSOE-JUNTS",     "value": 75, "color": RED},
        {"label": "Estabilidad gobierno",   "value": 35, "color": RED},
        {"label": "Cohesión bloque izq.",   "value": 52, "color": AMBER},
    ]

    cols_gauge = st.columns(4)
    for gi, tension in enumerate(TENSIONES):
        val = tension["value"]
        c = tension["color"]
        with cols_gauge[gi]:
            fig_g = go.Figure(go.Indicator(
                mode="gauge+number",
                value=val,
                number={"suffix": "%", "font": {"color": c, "size": 22}},
                title={"text": tension["label"], "font": {"size": 10, "color": TEXT2}},
                gauge={
                    "axis": {"range": [0, 100], "tickcolor": MUTED, "tickfont": {"size": 8, "color": MUTED}},
                    "bar": {"color": c, "thickness": 0.3},
                    "steps": [
                        {"range": [0, 33],   "color": "rgba(16,185,129,0.13)"},
                        {"range": [33, 66],  "color": "rgba(245,158,11,0.13)"},
                        {"range": [66, 100], "color": "rgba(239,68,68,0.13)"},
                    ],
                    "threshold": {"line": {"color": RED, "width": 2}, "thickness": 0.75, "value": 70},
                },
            ))
            fig_g.update_layout(
                paper_bgcolor=BG2,
                plot_bgcolor=BG2,
                font=dict(color=TEXT),
                height=180,
                margin=dict(t=30, b=0, l=10, r=10),
            )
            st.plotly_chart(fig_g, use_container_width=True)

    # Análisis IA de coalición
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("Análisis IA — Politeia Brain", PURPLE)
    if st.button("Analizar situación de coalición con IA", key="btn_ia_coal"):
        escanos_str = ", ".join(f"{p}: {e}"for p, e in sorted(escanos_sondeo.items(), key=lambda x: x[1], reverse=True)[:8])
        with st.spinner("Consultando Politeia Brain…"):
            resp_coal = ""
            try:
                from dashboard.services.llm_local import analizar_coalicion, esta_disponible
                if esta_disponible():
                    resp_coal = analizar_coalicion(escanos_sondeo)
            except Exception:
                pass
        if resp_coal:
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {PURPLE}44;border-left:4px solid {PURPLE};'
                f'border-radius:12px;padding:1.3rem 1.5rem">',
                unsafe_allow_html=True,
            )
            st.markdown(resp_coal)
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.info(f"IA local no disponible. Distribución de escaños actual: {escanos_str}")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: AGENDA EJECUTIVA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_agenda:
    section_header("Agenda ejecutiva semanal", CYAN)

    # Calcular la semana actual
    hoy = datetime.now()
    lunes = hoy - timedelta(days=hoy.weekday())
    dias_semana = [(lunes + timedelta(days=i)) for i in range(7)]
    nombres_dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

    # Agenda real: BD institucional o fuentes oficiales online. Sin datos demo.
    TIPO_COLOR = {
        "legislación": CYAN,
        "diplomacia": BLUE,
        "partido": PURPLE,
        "media": AMBER,
        "consejo": GREEN,
        "congreso": RED,
        "senado": "#F472B6",
        "institucional": CYAN,
        "parlamento": RED,
        "exterior": BLUE,
    }

    agenda_eventos, agenda_fuente = _cargar_agenda_operativa(
        lunes.date().isoformat(),
        dias_semana[-1].date().isoformat(),
    )
    fuente_color = GREEN if agenda_eventos else AMBER
    st.markdown(
        f'<div style="font-size:.72rem;color:{TEXT2};margin:-.2rem 0 .7rem 0">'
        f'Fuente: <b style="color:{fuente_color}">{agenda_fuente}</b> · '
        f'{len(agenda_eventos)} eventos reales para esta semana</div>',
        unsafe_allow_html=True,
    )

    # Renderizar calendario semanal
    semana_str = f"{dias_semana[0].strftime('%d/%m')} — {dias_semana[6].strftime('%d/%m/%Y')}"
    st.markdown(
        f'<div style="text-align:center;font-size:.8rem;color:{MUTED};margin-bottom:.8rem">'
        f'Semana del {semana_str}</div>',
        unsafe_allow_html=True,
    )

    # Grid de la semana (5 días laborales + fin de semana agrupado)
    cols_cal = st.columns(7)
    for di, (nombre_dia, dia_dt) in enumerate(zip(nombres_dias, dias_semana)):
        eventos_dia = [e for e in agenda_eventos if e["dia"] == di]
        es_hoy = dia_dt.date() == hoy.date()
        borde_dia = CYAN if es_hoy else BORDER
        bg_dia = f"{CYAN}08"if es_hoy else BG2

        with cols_cal[di]:
            st.markdown(
                f'<div style="background:{bg_dia};border:1px solid {borde_dia};border-radius:10px;'
                f'padding:.5rem;min-height:120px">'
                f'<div style="font-size:.7rem;font-weight:800;color:{"" + CYAN if es_hoy else TEXT2};'
                f'text-align:center;margin-bottom:.4rem;border-bottom:1px solid {BORDER};padding-bottom:.3rem">'
                f'{nombre_dia[:3].upper()}<br>'
                f'<span style="font-size:.9rem;color:{CYAN if es_hoy else TEXT}">{dia_dt.day}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
            for ev in eventos_dia:
                tc = TIPO_COLOR.get(ev["tipo"], MUTED)
                st.markdown(
                    f'<div style="background:{tc}15;border-left:2px solid {tc};border-radius:4px;'
                    f'padding:.25rem .4rem;margin-bottom:.3rem">'
                    f'<div style="font-size:.55rem;color:{tc};font-weight:700">{ev["hora"]} · {ev["actor"]}</div>'
                    f'<div style="font-size:.58rem;color:{TEXT2};line-height:1.3">{ev["evento"][:45]}{"…"if len(ev["evento"])>45 else ""}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            st.markdown("</div>", unsafe_allow_html=True)

    if not agenda_eventos:
        st.info(
            "No hay agenda oficial disponible ahora mismo desde BD ni fuentes online. "
            "La página ya no muestra eventos simulados; ejecuta la ingesta institucional o reintenta cuando respondan las fuentes."
        )

    # Leyenda tipos
    st.markdown("<br>", unsafe_allow_html=True)
    leyenda_items = "".join(
        f'<span style="background:{c}22;color:{c};font-size:.65rem;font-weight:700;'
        f'padding:.2rem .6rem;border-radius:6px;border:1px solid {c}44">{t}</span> '
        for t, c in TIPO_COLOR.items()
    )
    st.markdown(
        f'<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem">'
        f'<span style="font-size:.65rem;color:{MUTED};align-self:center">Tipo:</span>'
        f'{leyenda_items}</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: ESCENARIOS DE RUPTURA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_ruptura:
    section_header("Escenarios de ruptura del gobierno", RED)

    ESCENARIOS_RUPTURA = [
        {
            "titulo": "Ruptura por presupuestos",
            "icono": "",
            "probabilidad": 42,
            "ventana": "Oct–Dic 2024",
            "color": RED,
            "disparadores": [
                "Rechazo JUNTS a los PGE en Congreso",
                "VOX presenta enmienda a la totalidad",
                "SUMAR exige reversión recortes sociales",
                "Incumplimiento objetivos de déficit (3.5% PIB)",
            ],
            "impacto_seats": {"PP": "+8", "PSOE": "-12", "VOX": "+5", "SUMAR": "-8", "JUNTS": "+3"},
            "alternativas": ["Gobierno PP+VOX (si >176)", "Gobierno PP en minoría", "Nuevas elecciones"],
            "descripcion": (
                "El escenario más probable de ruptura a corto plazo. "
                "Los presupuestos generales del Estado para 2025 requieren el apoyo de JUNTS, "
                "cuyas condiciones (infraestructuras, financiación singular) pueden ser inaceptables "
                "para el ala izquierda del ejecutivo."
            ),
        },
        {
            "titulo": "Moción de censura PP+VOX",
            "icono": "⚔",
            "probabilidad": 18,
            "ventana": "Ene–Mar 2025",
            "color": AMBER,
            "disparadores": [
                "PP alcanza acuerdo programático con VOX",
                "Abstención de JUNTS en moción",
                "Escándalo mayor en el gobierno",
                "Fragmentación bloque izquierda",
            ],
            "impacto_seats": {"PP": "+15", "PSOE": "-18", "VOX": "+3", "SUMAR": "-5"},
            "alternativas": ["Gobierno PP+VOX", "Gran coalición PP+PSOE", "Repetición electoral"],
            "descripcion": (
                "PP y VOX suman 170 escaños actuales — necesitan al menos 6 más para la moción. "
                "La abstención de JUNTS (7 escaños) es el factor clave. "
                "Feijóo descarta formalmente la alianza con VOX pero mantiene negociaciones informales."
            ),
        },
        {
            "titulo": "Desgaste electoral",
            "icono": "",
            "probabilidad": 35,
            "ventana": "2025–2026",
            "color": PURPLE,
            "disparadores": [
                "CIS muestra caída PSOE por debajo del 25%",
                "Elecciones autonómicas adversas en Cataluña/PV",
                "Fractura interna PSOE-Sánchez",
                "Inflación repunta por encima del 4%",
            ],
            "impacto_seats": {"PP": "+20", "PSOE": "-22", "VOX": "-5", "SUMAR": "-3", "JUNTS": "+2"},
            "alternativas": ["Convocatoria anticipada 2025", "Gobierno en minoría ampliada", "Cambio liderazgo PSOE"],
            "descripcion": (
                "El desgaste natural del gobierno tras 24 meses puede forzar una convocatoria anticipada. "
                "Los factores de riesgo incluyen el ciclo económico, la gestión territorial "
                "y la competencia interna en la izquierda entre PSOE y SUMAR."
            ),
        },
    ]

    for esc in ESCENARIOS_RUPTURA:
        prob = esc["probabilidad"]
        c = esc["color"]
        ventana_str = esc["ventana"]

        # Disparadores
        disp_html = "".join(
            f'<li style="color:{TEXT2};font-size:.78rem;margin:.25rem 0">! {d}</li>'
            for d in esc["disparadores"]
        )

        # Impacto seats
        impact_html = "".join(
            f'<span style="background:{"#10B98122"if v.startswith("+") else "#EF444422"};'
            f'color:{"#10B981"if v.startswith("+") else "#EF4444"};'
            f'font-size:.65rem;font-weight:800;padding:.15rem .45rem;border-radius:5px;'
            f'border:1px solid {"#10B98144"if v.startswith("+") else "#EF444444"}">'
            f'{p} {v}</span> '
            for p, v in esc["impacto_seats"].items()
        )

        # Alternativas
        alt_html = "".join(
            f'<span style="background:{BORDER};color:{TEXT2};font-size:.65rem;'
            f'padding:.15rem .45rem;border-radius:5px">{a}</span> '
            for a in esc["alternativas"]
        )

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};'
            f'border-top:4px solid {c};border-radius:14px;padding:1.3rem 1.5rem;margin-bottom:1rem">'
            f'<div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:.8rem">'
            f'<div style="font-size:2rem;flex-shrink:0">{esc["icono"]}</div>'
            f'<div style="flex:1">'
            f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem">'
            f'<span style="font-size:1.05rem;font-weight:900;color:{TEXT}">{esc["titulo"]}</span>'
            f'<span style="background:{c}22;color:{c};font-size:.68rem;font-weight:800;'
            f'padding:.2rem .6rem;border-radius:6px;border:1px solid {c}44">'
            f'P={prob}%</span>'
            f'<span style="margin-left:auto;font-size:.7rem;color:{MUTED}"> {ventana_str}</span>'
            f'</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.5">{esc["descripcion"]}</div>'
            f'</div></div>'
            f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">'
            f'<div>'
            f'<div style="font-size:.65rem;font-weight:800;color:{c};letter-spacing:.1em;margin-bottom:.4rem">DISPARADORES</div>'
            f'<ul style="margin:0;padding:0;list-style:none">{disp_html}</ul>'
            f'</div>'
            f'<div>'
            f'<div style="font-size:.65rem;font-weight:800;color:{CYAN};letter-spacing:.1em;margin-bottom:.4rem">IMPACTO ESTIMADO</div>'
            f'<div style="display:flex;flex-wrap:wrap;gap:.3rem">{impact_html}</div>'
            f'</div>'
            f'<div>'
            f'<div style="font-size:.65rem;font-weight:800;color:{PURPLE};letter-spacing:.1em;margin-bottom:.4rem">ALTERNATIVAS</div>'
            f'<div style="display:flex;flex-wrap:wrap;gap:.3rem">{alt_html}</div>'
            f'</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Timeline de ventanas de riesgo
    section_header("Línea de tiempo — Ventanas de riesgo", AMBER)
    eventos_timeline = [
        ("Sep 2024", "Debate presupuestos", RED, 0.1),
        ("Oct 2024", "Negociación PGE", AMBER, 0.25),
        ("Nov 2024", "Votación PGE", RED, 0.45),
        ("Dic 2024", "Cierre año fiscal", AMBER, 0.6),
        ("Ene 2025", "Posible moción", AMBER, 0.72),
        ("Mar 2025", "Evaluación gobierno", PURPLE, 0.85),
        ("Jun 2025", "Municipales parciales", PURPLE, 0.95),
    ]

    fig_tl = go.Figure()
    # Línea de base
    fig_tl.add_trace(go.Scatter(
        x=[ev[3] for ev in eventos_timeline],
        y=[0] * len(eventos_timeline),
        mode="lines",
        line=dict(color=BORDER, width=2),
        showlegend=False,
        hoverinfo="skip",
    ))
    # Eventos
    for etiqueta, descripcion, color, x_pos in eventos_timeline:
        fig_tl.add_trace(go.Scatter(
            x=[x_pos],
            y=[0],
            mode="markers+text",
            marker=dict(size=14, color=color, line=dict(width=2, color=BG2)),
            text=[etiqueta],
            textposition="top center",
            textfont=dict(size=9, color=TEXT2),
            hovertemplate=f"<b>{etiqueta}</b><br>{descripcion}<extra></extra>",
            showlegend=False,
        ))
        fig_tl.add_annotation(
            x=x_pos, y=-0.15,
            text=descripcion[:25],
            font=dict(size=8, color=MUTED),
            showarrow=False,
            xanchor="center",
        )

    fig_tl.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        font=dict(color=TEXT),
        height=200,
        margin=dict(l=10, r=10, t=30, b=50),
        xaxis=dict(visible=False, range=[-0.05, 1.05]),
        yaxis=dict(visible=False, range=[-0.35, 0.35]),
        title=dict(
            text="Ventanas temporales de riesgo de ruptura — 2024/2025",
            font=dict(size=11, color=TEXT2), x=0.5,
        ),
    )
    st.plotly_chart(fig_tl, use_container_width=True)
