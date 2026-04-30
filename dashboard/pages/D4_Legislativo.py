"""
D4 — Monitor Legislativo
Mega-página: BOE en vivo + Votaciones Congreso + Búsqueda + Análisis IA
"""
from __future__ import annotations
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

try:
    from dashboard.services import git_amigos_bridge as _git_amigos
except Exception:
    _git_amigos = None  # type: ignore

st.set_page_config(
    page_title="Monitor Legislativo — ElectSim",
    page_icon="",
    layout="wide",
)
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("legislativo")

# ── Paleta de impacto ─────────────────────────────────────────────────────────
IMPACT_CFG = {
    "CRÍTICO":     {"color": RED,    "border": "#7F1D1D", "bg": "#1A0A0A", "icon": "●"},
    "ALTO":        {"color": AMBER,  "border": "#78350F", "bg": "#1A1000", "icon": "●"},
    "MEDIO":       {"color": "#F59E0B", "border": "#92400E", "bg": "#171000", "icon": "●"},
    "BAJO":        {"color": GREEN,  "border": "#064E3B", "bg": "#091510", "icon": "●"},
    "INFORMATIVO": {"color": MUTED,  "border": BORDER,   "bg": BG2,       "icon": "○"},
}

# ── Funciones de carga ────────────────────────────────────────────────────────

@st.cache_data(ttl=300)
def _cargar_boe(fecha: str | None = None) -> list[dict]:
    try:
        from dashboard.services.boe_api import obtener_sumario
        return obtener_sumario(fecha)
    except Exception:
        return []


@st.cache_data(ttl=300)
def _clasificar_impacto(titulo: str, seccion: str, dept: str) -> str:
    try:
        from dashboard.services.boe_api import clasificar_impacto
        return clasificar_impacto(titulo, seccion, dept)
    except Exception:
        titulo_l = titulo.lower()
        if any(w in titulo_l for w in ["real decreto-ley", "estado de alarma", "presupuesto general"]):
            return "CRÍTICO"
        if any(w in titulo_l for w in ["real decreto", "ley orgánica", "ley "]):
            return "ALTO"
        if any(w in titulo_l for w in ["orden", "resolución", "instrucción"]):
            return "MEDIO"
        if any(w in titulo_l for w in ["anuncio", "convocatoria", "licitación"]):
            return "BAJO"
        return "INFORMATIVO"


@st.cache_data(ttl=600)
def _demo_votaciones() -> list[dict]:
    """Datos demostrativos realistas de votaciones del Congreso."""
    return [
        {
            "id": "VOT-2024-0891",
            "fecha": "2024-11-12",
            "iniciativa": "Proposición no de Ley sobre política energética",
            "tipo": "PNL",
            "resultado": "APROBADA",
            "PP": "contra", "PSOE": "favor", "VOX": "contra",
            "SUMAR": "favor", "JUNTS": "abstencion",
        },
        {
            "id": "VOT-2024-0892",
            "fecha": "2024-11-12",
            "iniciativa": "Reforma Ley de Vivienda — enmienda parcial art. 12",
            "tipo": "ENMIENDA",
            "resultado": "RECHAZADA",
            "PP": "contra", "PSOE": "favor", "VOX": "contra",
            "SUMAR": "favor", "JUNTS": "contra",
        },
        {
            "id": "VOT-2024-0893",
            "fecha": "2024-11-13",
            "iniciativa": "Moción de reprobación Ministro de Transportes",
            "tipo": "MOCIÓN",
            "resultado": "RECHAZADA",
            "PP": "favor", "PSOE": "contra", "VOX": "favor",
            "SUMAR": "contra", "JUNTS": "favor",
        },
        {
            "id": "VOT-2024-0894",
            "fecha": "2024-11-13",
            "iniciativa": "Prórroga estado de alarma sanitaria Canarias",
            "tipo": "RDL",
            "resultado": "APROBADA",
            "PP": "abstencion", "PSOE": "favor", "VOX": "contra",
            "SUMAR": "favor", "JUNTS": "favor",
        },
        {
            "id": "VOT-2024-0895",
            "fecha": "2024-11-14",
            "iniciativa": "Proyecto de Ley de Inteligencia Artificial",
            "tipo": "PLO",
            "resultado": "APROBADA",
            "PP": "favor", "PSOE": "favor", "VOX": "contra",
            "SUMAR": "favor", "JUNTS": "abstencion",
        },
        {
            "id": "VOT-2024-0896",
            "fecha": "2024-11-14",
            "iniciativa": "Creación Agencia Nacional de Ciberseguridad",
            "tipo": "PL",
            "resultado": "APROBADA",
            "PP": "favor", "PSOE": "favor", "VOX": "abstencion",
            "SUMAR": "favor", "JUNTS": "favor",
        },
    ]


# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{RED},{AMBER});
              border-radius:12px;display:flex;align-items:center;
              justify-content:center;font-size:1.5rem;flex-shrink:0"></div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.55rem;font-weight:900">Monitor Legislativo</h2>
    <div style="color:{TEXT2};font-size:.82rem">
      BOE en directo · Votaciones Congreso · Búsqueda normativa · Análisis IA
    </div>
  </div>
  <div style="margin-left:auto;text-align:right">
    <div style="font-size:.7rem;color:{MUTED}">Última actualización</div>
    <div style="font-size:.85rem;color:{CYAN};font-family:monospace">{datetime.now().strftime("%d/%m/%Y %H:%M")}</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_boe, tab_votaciones, tab_busqueda, tab_ia = st.tabs([
    "BOE Hoy",
    "Votaciones Congreso",
    "Búsqueda",
    "Análisis IA",
])

if _git_amigos is not None:
    try:
        _git_d4_summary = _git_amigos.summary_for_module("D4")
    except Exception:
        _git_d4_summary = {}
else:
    _git_d4_summary = {}

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: BOE HOY
# ═══════════════════════════════════════════════════════════════════════════════
with tab_boe:
    # Carga de datos
    with st.spinner("Cargando sumario BOE…"):
        items_raw = _cargar_boe()

    if not items_raw:
        st.warning("No se han podido cargar datos del BOE. Es posible que la API esté temporalmente no disponible.")
        items_raw = []

    # Enriquecer con impacto si no lo traen
    items: list[dict] = []
    for item in items_raw:
        if "impacto"not in item:
            item["impacto"] = _clasificar_impacto(
                item.get("titulo", ""),
                item.get("seccion", ""),
                item.get("departamento", ""),
            )
        items.append(item)

    # KPI cards
    counts = {lvl: sum(1 for i in items if i.get("impacto") == lvl) for lvl in IMPACT_CFG}
    total_items = len(items)

    st.markdown(f"""
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:1.2rem">
      {kpi_card("CRÍTICO",     str(counts.get("CRÍTICO",0)),     "disposiciones críticas", RED)}
      {kpi_card("ALTO",        str(counts.get("ALTO",0)),        "alto impacto",           AMBER)}
      {kpi_card("MEDIO",       str(counts.get("MEDIO",0)),       "impacto medio",          "#F59E0B")}
      {kpi_card("BAJO",        str(counts.get("BAJO",0)),        "bajo impacto",           GREEN)}
      {kpi_card("TOTAL BOE",   str(total_items),                 "disposiciones hoy",      CYAN)}
    </div>
    """, unsafe_allow_html=True)

    if _git_d4_summary:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {CYAN}33;border-left:3px solid {CYAN};'
            f'border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem">'
            f'<div style="font-size:.64rem;font-weight:900;color:{CYAN};letter-spacing:.12em;'
            f'text-transform:uppercase;margin-bottom:.25rem">FUENTES GIT AMIGOS INTEGRADAS</div>'
            f'<div style="font-size:.78rem;color:{TEXT2};line-height:1.55">'
            f'{_git_d4_summary.get("repos_disponibles",0)}/{_git_d4_summary.get("repos_catalogados",0)} repos disponibles para BOE, Senado, Congreso, Parlamento Europeo, contratación pública y datos UE. '
            f'Se usan como corpus local para búsqueda, análisis IA y señales del workspace.</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    if items:
        # Filtros
        col_f1, col_f2, col_f3 = st.columns([2, 2, 1])
        with col_f1:
            all_depts = sorted({i.get("departamento", "—") for i in items if i.get("departamento")})
            sel_depts = st.multiselect(
                "Departamento",
                options=all_depts,
                default=[],
                placeholder="Todos los departamentos",
                key="boe_depts",
            )
        with col_f2:
            sel_impact = st.multiselect(
                "Nivel de impacto",
                options=list(IMPACT_CFG.keys()),
                default=[],
                placeholder="Todos los niveles",
                key="boe_impact",
            )
        with col_f3:
            modo_agrupado = st.toggle("Agrupar por dpto.", value=False, key="boe_agrupar")

        # Aplicar filtros
        items_filtrados = items
        if sel_depts:
            items_filtrados = [i for i in items_filtrados if i.get("departamento") in sel_depts]
        if sel_impact:
            items_filtrados = [i for i in items_filtrados if i.get("impacto") in sel_impact]

        st.markdown(f"<div style='color:{MUTED};font-size:.78rem;margin-bottom:.5rem'>"
                    f"Mostrando {len(items_filtrados)} de {total_items} disposiciones</div>",
                    unsafe_allow_html=True)

        def _render_boe_card(item: dict) -> None:
            imp = item.get("impacto", "INFORMATIVO")
            cfg = IMPACT_CFG.get(imp, IMPACT_CFG["INFORMATIVO"])
            titulo = item.get("titulo", "Sin título")[:160]
            dept = item.get("departamento", "—")
            sec = item.get("seccion", "—")
            epi = item.get("epigrafe", "")
            url = item.get("url_html", item.get("url", "#"))
            id_boe = item.get("id", "")
            link_html = (
                f'<a href="{url}"target="_blank"rel="noopener noreferrer" '
                f'style="font-size:.72rem;color:{CYAN};text-decoration:none">Ver en BOE ↗</a>'
                if url and url != "#"else ""
            )
            st.markdown(
                f'<div style="background:{cfg["bg"]};border:1px solid {cfg["border"]};'
                f'border-left:4px solid {cfg["color"]};border-radius:10px;'
                f'padding:.85rem 1rem;margin-bottom:.55rem">'
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem">'
                f'<span style="background:{cfg["color"]}22;color:{cfg["color"]};'
                f'font-size:.62rem;font-weight:800;letter-spacing:.1em;padding:.2rem .6rem;'
                f'border-radius:99px;border:1px solid {cfg["color"]}44">'
                f'{cfg["icon"]} {imp}</span>'
                f'<span style="font-size:.68rem;color:{MUTED};font-family:monospace">Sección {sec}</span>'
                f'<span style="margin-left:auto;font-size:.68rem;color:{MUTED}">{id_boe}</span>'
                f'</div>'
                f'<div style="color:{TEXT};font-size:.88rem;font-weight:600;line-height:1.4;margin-bottom:.4rem">{titulo}</div>'
                f'<div style="display:flex;align-items:center;gap:1rem">'
                f'<span style="font-size:.72rem;color:{TEXT2}"> {dept}</span>'
                + (f'<span style="font-size:.72rem;color:{TEXT2}"> {epi[:60]}</span>'if epi else "")
                + f'<span style="margin-left:auto">{link_html}</span>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        if not modo_agrupado:
            # Ordenar por criticidad
            orden_imp = {"CRÍTICO": 0, "ALTO": 1, "MEDIO": 2, "BAJO": 3, "INFORMATIVO": 4}
            items_ord = sorted(items_filtrados, key=lambda x: orden_imp.get(x.get("impacto", "INFORMATIVO"), 9))
            for item in items_ord:
                _render_boe_card(item)
        else:
            # Agrupar por departamento
            grupos: dict[str, list[dict]] = {}
            for item in items_filtrados:
                d = item.get("departamento", "Sin departamento")
                grupos.setdefault(d, []).append(item)
            for dept_name, dept_items in sorted(grupos.items()):
                criticos = sum(1 for x in dept_items if x.get("impacto") == "CRÍTICO")
                altos = sum(1 for x in dept_items if x.get("impacto") == "ALTO")
                badge_extra = ""
                if criticos:
                    badge_extra += f' <span style="color:{RED};font-weight:700">● {criticos} crítico(s)</span>'
                if altos:
                    badge_extra += f' <span style="color:{AMBER};font-weight:700">● {altos} alto(s)</span>'
                with st.expander(
                    f" {dept_name}  ({len(dept_items)} disposiciones){badge_extra}",
                    expanded=(criticos > 0),
                ):
                    for item in dept_items:
                        _render_boe_card(item)
    else:
        st.info("No hay disposiciones del BOE disponibles para hoy. Prueba con otra fecha.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: VOTACIONES CONGRESO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_votaciones:
    section_header("Votaciones recientes — Congreso de los Diputados", BLUE)

    git_votos: list[dict] = []
    if _git_amigos is not None:
        try:
            git_votos = _git_amigos.search_corpus(
                "votaciones senado congreso diputados parliament voting initiatives",
                module="D4",
                limit=6,
            )
        except Exception:
            git_votos = []

    if git_votos:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BLUE}33;border-left:3px solid {BLUE};'
            f'border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem">'
            f'<div style="font-size:.64rem;font-weight:900;color:{BLUE};letter-spacing:.12em;'
            f'text-transform:uppercase;margin-bottom:.35rem">Capa local Congreso/Senado/PE</div>'
            f'<div style="font-size:.72rem;color:{TEXT2};line-height:1.45">'
            f'Señales leídas desde repos locales de Senado, Congreso y Parlamento Europeo. '
            f'Estas fuentes alimentan el RAG de Ollama y completan el mapa de votaciones cuando la fuente oficial no expone todos los metadatos.</div></div>',
            unsafe_allow_html=True,
        )
        for col, src in zip(st.columns(3), git_votos[:3]):
            with col:
                st.markdown(
                    f'<div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;padding:.55rem .7rem;min-height:118px">'
                    f'<div style="font-size:.7rem;font-weight:800;color:{TEXT}">{src.get("label","Git Amigos")}</div>'
                    f'<div style="font-size:.62rem;color:{MUTED};margin:.12rem 0">{src.get("repo","")}/{src.get("path","")}</div>'
                    f'<div style="font-size:.66rem;color:{TEXT2};line-height:1.35">{src.get("snippet","")[:180]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    votaciones = _demo_votaciones()
    partidos_voto = ["PP", "PSOE", "VOX", "SUMAR", "JUNTS"]
    voto_val = {"favor": 1, "abstencion": 0, "contra": -1}
    voto_label = {"favor": "A FAVOR", "abstencion": "ABSTENCIÓN", "contra": "EN CONTRA"}
    voto_color_map = {"favor": GREEN, "abstencion": AMBER, "contra": RED}

    # Heatmap Plotly
    z_matrix: list[list[int]] = []
    hover_text: list[list[str]] = []
    y_labels = []
    for v in votaciones:
        row = []
        htrow = []
        ini_short = v["iniciativa"][:45] + ("…"if len(v["iniciativa"]) > 45 else "")
        y_labels.append(ini_short)
        for p in partidos_voto:
            voto = v.get(p, "abstencion")
            row.append(voto_val.get(voto, 0))
            htrow.append(f"<b>{p}</b><br>{voto_label.get(voto,'—')}<br><i>{v['iniciativa'][:60]}</i>")
        z_matrix.append(row)
        hover_text.append(htrow)

    colorscale = [
        [0.0, RED],
        [0.5, AMBER],
        [1.0, GREEN],
    ]

    fig_heat = go.Figure(go.Heatmap(
        z=z_matrix,
        x=partidos_voto,
        y=y_labels,
        colorscale=colorscale,
        zmin=-1, zmax=1,
        hovertemplate="%{customdata}<extra></extra>",
        customdata=hover_text,
        showscale=True,
        colorbar=dict(
            title=dict(text="Voto", font=dict(color=TEXT2)),
            tickvals=[-1, 0, 1],
            ticktext=["Contra", "Abstención", "Favor"],
            tickfont=dict(color=TEXT2, size=11),
        ),
    ))
    fig_heat.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        font=dict(color=TEXT, family="Inter, sans-serif"),
        margin=dict(l=10, r=10, t=30, b=10),
        height=320,
        title=dict(
            text="Mapa de votaciones — Posición por partido",
            font=dict(size=13, color=TEXT2),
            x=0,
        ),
        xaxis=dict(
            tickfont=dict(color=TEXT, size=12),
            gridcolor=BORDER,
        ),
        yaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor=BORDER,
        ),
    )
    st.plotly_chart(fig_heat, use_container_width=True)

    # Tabla de votaciones
    section_header("Detalle por votación", BLUE)
    for v in votaciones:
        res_color = GREEN if v["resultado"] == "APROBADA"else RED
        disciplina_items = []
        for p in partidos_voto:
            voto = v.get(p, "abstencion")
            c = voto_color_map.get(voto, MUTED)
            disciplina_items.append(
                f'<span style="background:{c}22;color:{c};font-size:.65rem;font-weight:700;'
                f'padding:.15rem .45rem;border-radius:6px;border:1px solid {c}44">{p}: {voto_label[voto][:1]}</span>'
            )
        disciplina_html = " ".join(disciplina_items)
        tipo_color = PURPLE if v["tipo"] in ("PL","PLO","RDL") else CYAN
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
            f'padding:.85rem 1.1rem;margin-bottom:.5rem">'
            f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">'
            f'<span style="background:{tipo_color}22;color:{tipo_color};font-size:.62rem;font-weight:800;'
            f'padding:.18rem .55rem;border-radius:6px;border:1px solid {tipo_color}44">{v["tipo"]}</span>'
            f'<span style="font-size:.8rem;font-weight:700;color:{TEXT}">{v["iniciativa"][:90]}</span>'
            f'<span style="margin-left:auto;background:{res_color}22;color:{res_color};font-size:.65rem;'
            f'font-weight:800;padding:.2rem .6rem;border-radius:6px;border:1px solid {res_color}44">'
            f'{v["resultado"]}</span>'
            f'</div>'
            f'<div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap">'
            f'{disciplina_html}'
            f'<span style="margin-left:auto;font-size:.65rem;color:{MUTED}">{v["fecha"]} · {v["id"]}</span>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Índice de disciplina de partido
    section_header("Índice de cohesión por partido", PURPLE)
    cohesion_data: dict[str, dict] = {p: {"total": 0, "mayoria": 0} for p in partidos_voto}
    for v in votaciones:
        votos_parti = {p: v.get(p, "abstencion") for p in partidos_voto}
        for p in partidos_voto:
            cohesion_data[p]["total"] += 1
            # Posición mayoritaria del partido (demo: favor si PSOE/SUMAR, contra si PP/VOX, variable para JUNTS)
            moda = votos_parti[p]
            if moda != "abstencion":
                cohesion_data[p]["mayoria"] += 1

    cols_coh = st.columns(len(partidos_voto))
    for idx, p in enumerate(partidos_voto):
        pct = round(cohesion_data[p]["mayoria"] / max(cohesion_data[p]["total"], 1) * 100)
        c = COLORES_PARTIDOS.get(p, CYAN)
        with cols_coh[idx]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {c};'
                f'border-radius:10px;padding:.8rem;text-align:center">'
                f'<div style="font-size:1.5rem;font-weight:900;color:{c}">{pct}%</div>'
                f'<div style="font-size:.65rem;font-weight:700;color:{TEXT2};letter-spacing:.08em">{p}</div>'
                f'<div style="font-size:.6rem;color:{MUTED}">cohesión</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: BÚSQUEDA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_busqueda:
    section_header("Búsqueda en normativa BOE + corpus Git Amigos", CYAN)

    col_s1, col_s2 = st.columns([3, 1])
    with col_s1:
        query_text = st.text_input(
            "Buscar en el BOE",
            placeholder="Ej: energía renovable, pensiones, vivienda, ciberseguridad…",
            key="boe_query",
        )
    with col_s2:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        buscar_btn = st.button("Buscar", use_container_width=True, key="btn_buscar")

    col_f_a, col_f_b, col_f_c = st.columns(3)
    with col_f_a:
        fecha_desde = st.date_input(
            "Desde",
            value=datetime.now().date() - timedelta(days=30),
            key="busq_desde",
        )
    with col_f_b:
        fecha_hasta = st.date_input("Hasta", value=datetime.now().date(), key="busq_hasta")
    with col_f_c:
        tipos_busq = st.multiselect(
            "Tipo de norma",
            options=["Real Decreto-Ley", "Real Decreto", "Ley Orgánica", "Ley", "Orden", "Resolución", "Anuncio"],
            default=[],
            placeholder="Todos los tipos",
            key="busq_tipo",
        )

    # Fuente de items para buscar
    items_busq = items if items else []

    if query_text or buscar_btn:
        if not query_text.strip():
            st.warning("Introduce un término de búsqueda.")
        else:
            qlow = query_text.strip().lower()
            resultados = [
                i for i in items_busq
                if qlow in i.get("titulo", "").lower()
                or qlow in i.get("departamento", "").lower()
                or qlow in i.get("epigrafe", "").lower()
            ]

            # Filtrar tipos si se seleccionaron
            if tipos_busq:
                def _match_tipo(item: dict, tipos: list[str]) -> bool:
                    t = item.get("titulo", "").lower()
                    for tipo in tipos:
                        if tipo.lower() in t:
                            return True
                    return False
                resultados = [i for i in resultados if _match_tipo(i, tipos_busq)]

            st.markdown(
                f"<div style='color:{TEXT2};font-size:.8rem;margin-bottom:.8rem'>"
                f"<b style='color:{CYAN}'>{len(resultados)}</b> resultado(s) para «{query_text}»"
                f"</div>",
                unsafe_allow_html=True,
            )

            if resultados:
                # Tabla de resultados
                rows = []
                for r in resultados:
                    imp = r.get("impacto", "INFORMATIVO")
                    cfg = IMPACT_CFG.get(imp, IMPACT_CFG["INFORMATIVO"])
                    rows.append({
                        "Impacto": imp,
                        "Título": r.get("titulo", "—")[:120],
                        "Departamento": r.get("departamento", "—"),
                        "Sección": r.get("seccion", "—"),
                        "ID": r.get("id", "—"),
                    })
                df_res = pd.DataFrame(rows)
                st.dataframe(
                    df_res,
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "Impacto": st.column_config.TextColumn(width="small"),
                        "Título": st.column_config.TextColumn(width="large"),
                        "Departamento": st.column_config.TextColumn(width="medium"),
                    },
                )
            elif items_busq:
                st.info(f"No se han encontrado resultados para «{query_text}» en el BOE de hoy.")
            else:
                st.info("No hay datos del BOE cargados. La búsqueda se realizará cuando haya datos disponibles.")

            if _git_amigos is not None:
                try:
                    resultados_git = _git_amigos.search_corpus(query_text, module="D4", limit=8)
                except Exception:
                    resultados_git = []
                if resultados_git:
                    section_header("Resultados en repos Git Amigos", PURPLE)
                    for idx, res in enumerate(resultados_git, 1):
                        st.markdown(
                            f'<div style="background:{BG2};border:1px solid {PURPLE}33;border-left:3px solid {PURPLE};'
                            f'border-radius:9px;padding:.7rem .9rem;margin-bottom:.45rem">'
                            f'<div style="display:flex;gap:.5rem;align-items:center">'
                            f'<span style="font-size:.63rem;font-weight:900;color:{PURPLE};letter-spacing:.08em">GIT {idx}</span>'
                            f'<span style="font-size:.78rem;font-weight:800;color:{TEXT}">{res.get("label","Fuente local")}</span>'
                            f'<span style="margin-left:auto;font-size:.62rem;color:{MUTED};font-family:monospace">{res.get("repo","")}/{res.get("path","")}</span>'
                            f'</div>'
                            f'<div style="font-size:.7rem;color:{TEXT2};line-height:1.45;margin-top:.35rem">{res.get("snippet","")[:420]}</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
    else:
        # Estadísticas generales si no hay búsqueda activa
        if items_busq:
            st.markdown(f"<div style='color:{MUTED};font-size:.82rem'>Introduce un término para buscar entre las <b style='color:{TEXT}'>{len(items_busq)}</b> disposiciones del BOE cargadas hoy.</div>", unsafe_allow_html=True)

            # Distribución por sección
            section_header("Distribución por sección BOE", MUTED)
            secciones = {}
            for i in items_busq:
                s = i.get("seccion", "?")
                secciones[s] = secciones.get(s, 0) + 1

            if secciones:
                fig_sec = go.Figure(go.Bar(
                    x=list(secciones.keys()),
                    y=list(secciones.values()),
                    marker_color=CYAN,
                    marker_line_color=BORDER,
                    marker_line_width=1,
                    text=list(secciones.values()),
                    textposition="outside",
                    textfont=dict(color=TEXT2, size=11),
                ))
                fig_sec.update_layout(
                    paper_bgcolor=BG2,
                    plot_bgcolor=BG2,
                    font=dict(color=TEXT),
                    height=250,
                    margin=dict(l=10, r=10, t=10, b=10),
                    xaxis=dict(gridcolor=BORDER, title="Sección"),
                    yaxis=dict(gridcolor=BORDER, title="N.º disposiciones"),
                )
                st.plotly_chart(fig_sec, use_container_width=True)
        else:
            st.info("Carga primero datos del BOE en la pestaña 'BOE Hoy'para poder buscar.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: ANÁLISIS IA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_ia:
    section_header("Análisis IA — Politeia Brain", PURPLE)

    col_ia1, col_ia2 = st.columns([3, 1])
    with col_ia1:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {PURPLE};'
            f'border-radius:10px;padding:1rem 1.2rem;margin-bottom:.8rem">'
            f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:.4rem">Pregunta al asistente de IA</div>'
            f'<div style="font-size:.92rem;color:{TEXT};font-style:italic">'
            f'"¿Cuáles son las 3 normas más relevantes del BOE de hoy y qué impacto tienen?"'
            f'</div></div>',
            unsafe_allow_html=True,
        )
    with col_ia2:
        st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)
        run_ia = st.button("Analizar con IA", use_container_width=True, key="btn_ia_boe")

    if run_ia:
        # Preparar contexto
        contexto_items = []
        for item in (items or [])[:15]:
            imp = item.get("impacto", "?")
            titulo = item.get("titulo", "?")[:120]
            dept = item.get("departamento", "?")
            contexto_items.append(f"[{imp}] {titulo} — {dept}")

        contexto_boe = "\n".join(contexto_items) if contexto_items else "No hay datos del BOE disponibles hoy."
        contexto_git = ""
        if _git_amigos is not None:
            try:
                contexto_git = _git_amigos.llm_context_pack(
                    "BOE Congreso Senado Parlamento Europeo compliance normativa España",
                    module="D4",
                    max_chars=4500,
                )
            except Exception:
                contexto_git = ""
        fecha_hoy = datetime.now().strftime("%d de %B de %Y")

        pregunta = (
            f"Fecha: {fecha_hoy}\n\n"
            f"Disposiciones del BOE de hoy:\n{contexto_boe}\n\n"
            f"Fuentes locales Git Amigos disponibles:\n{contexto_git or 'Sin contexto local adicional.'}\n\n"
            f"¿Cuáles son las 3 normas más relevantes del BOE de hoy y qué impacto político, económico "
            f"o social tienen para España? Sé preciso y usa formato estructurado."
        )

        with st.spinner("Consultando Politeia Brain…"):
            respuesta_ia = ""
            ia_disponible = False
            try:
                from dashboard.services.llm_local import chat, esta_disponible
                ia_disponible = esta_disponible()
                if ia_disponible:
                    respuesta_ia = chat(
                        pregunta,
                        sistema=(
                            "Eres un experto jurídico y analista político especializado en normativa española. "
                            "Analiza las disposiciones del BOE con criterio político, económico y social. "
                            "Usa bullet points y markdown para estructurar tu respuesta. Responde en español."
                        ),
                    )
            except Exception as e:
                respuesta_ia = f"Error al conectar con el servicio IA: {e}"

        if ia_disponible and respuesta_ia:
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {PURPLE}44;border-left:4px solid {PURPLE};'
                f'border-radius:12px;padding:1.3rem 1.5rem;margin-top:.6rem">'
                f'<div style="font-size:.7rem;font-weight:800;letter-spacing:.12em;color:{PURPLE};'
                f'text-transform:uppercase;margin-bottom:.7rem"> Politeia Brain — Análisis Legislativo</div>',
                unsafe_allow_html=True,
            )
            st.markdown(respuesta_ia)
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            # Análisis demo si IA no disponible
            criticos_demo = [i for i in items if i.get("impacto") == "CRÍTICO"][:3]
            altos_demo = [i for i in items if i.get("impacto") == "ALTO"][:3]
            top_demo = (criticos_demo + altos_demo)[:3]

            st.markdown(
                f'<div style="background:{BG3};border:1px solid {AMBER}44;border-left:4px solid {AMBER};'
                f'border-radius:12px;padding:1.3rem 1.5rem">'
                f'<div style="font-size:.7rem;font-weight:800;color:{AMBER};letter-spacing:.12em;'
                f'text-transform:uppercase;margin-bottom:.8rem">⚠ IA Local no disponible — Análisis automático</div>',
                unsafe_allow_html=True,
            )
            if top_demo:
                for rank, item in enumerate(top_demo, 1):
                    imp = item.get("impacto", "—")
                    cfg = IMPACT_CFG.get(imp, IMPACT_CFG["INFORMATIVO"])
                    st.markdown(
                        f'<div style="margin-bottom:.7rem">'
                        f'<span style="color:{cfg["color"]};font-weight:800">{rank}. {item.get("titulo","")[:120]}</span><br>'
                        f'<span style="color:{TEXT2};font-size:.82rem">Dpto: {item.get("departamento","—")} · '
                        f'Impacto: <b style="color:{cfg["color"]}">{imp}</b></span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
            else:
                st.markdown(
                    f'<div style="color:{TEXT2}">No hay disposiciones de alto impacto hoy.</div>',
                    unsafe_allow_html=True,
                )
            st.markdown("</div>", unsafe_allow_html=True)

            st.info("Para activar el análisis con IA local arranca Ollama y usa el modelo configurado en ELECTSIM_OLLAMA_MODEL.")

    # Compliance export hint
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("Exportación para cumplimiento normativo", MUTED)
    col_exp1, col_exp2 = st.columns(2)
    with col_exp1:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem 1.2rem">'
            f'<div style="font-size:.75rem;font-weight:700;color:{CYAN};margin-bottom:.5rem"> LOBBYING COMPLIANCE</div>'
            f'<div style="font-size:.82rem;color:{TEXT2}">Exporta las disposiciones relevantes filtradas por sector '
            f'(Energía, Banca, Defensa, Farmacia…) para revisión de cumplimiento normativo y reporting de lobbying.</div>'
            f'<div style="margin-top:.8rem">'
            f'</div></div>',
            unsafe_allow_html=True,
        )
        if items:
            df_export = pd.DataFrame([{
                "id": i.get("id",""),
                "impacto": i.get("impacto",""),
                "titulo": i.get("titulo",""),
                "departamento": i.get("departamento",""),
                "seccion": i.get("seccion",""),
                "url": i.get("url_html", i.get("url","")),
            } for i in items])
            csv_data = df_export.to_csv(index=False).encode("utf-8")
            st.download_button(
                "⬇ Descargar CSV compliance",
                data=csv_data,
                file_name=f"boe_compliance_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv",
                use_container_width=True,
            )
    with col_exp2:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem 1.2rem">'
            f'<div style="font-size:.75rem;font-weight:700;color:{PURPLE};margin-bottom:.5rem"> SECTORES RELEVANTES</div>'
            f'<div style="font-size:.82rem;color:{TEXT2}">Clasificación sectorial automática de las disposiciones '
            f'del BOE por impacto en sectores estratégicos.</div>'
            f'<div style="margin-top:.8rem;display:flex;flex-wrap:wrap;gap:.4rem">',
            unsafe_allow_html=True,
        )
        sectores = ["Energía", "Defensa", "Banca", "Farmacia", "Tecnología", "Infraestructuras", "Laboral"]
        badges = ""
        for s in sectores:
            n = sum(1 for i in items if s.lower() in i.get("titulo","").lower())
            c = CYAN if n > 0 else MUTED
            badges += (
                f'<span style="background:{c}18;color:{c};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .55rem;border-radius:6px;border:1px solid {c}33">'
                f'{s} ({n})</span> '
            )
        st.markdown(
            f'{badges}</div></div>',
            unsafe_allow_html=True,
        )

    if _git_amigos is not None:
        try:
            compliance_refs = _git_amigos.compliance_signals("ai act dora nis2 contratacion boe eurlex", limit=6)
        except Exception:
            compliance_refs = []
        if compliance_refs:
            section_header("Referencias compliance desde Git Amigos", CYAN)
            for ref in compliance_refs[:4]:
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {CYAN}22;border-radius:8px;'
                    f'padding:.55rem .75rem;margin-bottom:.35rem">'
                    f'<span style="font-size:.7rem;font-weight:800;color:{CYAN}">{ref.get("label")}</span>'
                    f'<span style="font-size:.62rem;color:{MUTED};margin-left:.5rem">{ref.get("repo")}/{ref.get("path")}</span>'
                    f'<div style="font-size:.68rem;color:{TEXT2};line-height:1.35;margin-top:.25rem">{ref.get("snippet","")[:260]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
