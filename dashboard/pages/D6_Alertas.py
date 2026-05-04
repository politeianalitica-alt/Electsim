"""
D6 — Centro de Alertas · Alert Intelligence Center
Feed en tiempo real, KPIs de severidad, signal cards con acciones,
timeline chart, análisis IA consolidado y panel de reglas de detección.
"""
from __future__ import annotations

import datetime
import hashlib
import random
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    AMBER, RED, GREEN, TEXT, TEXT2, MUTED,
    sidebar_nav, mostrar_alertas_pagina,
    section_header, kpi_card,
    signal_card, scrolling_ticker, intel_header,
)

st.set_page_config(
    page_title="Centro de Alertas — ElectSim",
    page_icon="",
    layout="wide",
)

sidebar_nav()

# ── Estilos ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
body, .stApp {{ background:{BG}; color:{TEXT}; }}
.alert-action-row {{
  display:flex;gap:.5rem;margin-top:.45rem;flex-wrap:wrap;
}}
.action-pill {{
  font-size:.62rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  padding:.18rem .55rem;border-radius:4px;border:1px solid;cursor:pointer;
  transition:all .15s;
}}
.dim-badge {{
  display:inline-block;font-size:.6rem;font-weight:700;letter-spacing:.07em;
  padding:.15rem .5rem;border-radius:4px;background:{BG3};color:{TEXT2};
  border:1px solid {BORDER};margin-right:.3rem;
}}
.rule-row {{
  display:flex;align-items:center;gap:.8rem;padding:.55rem .75rem;
  border-bottom:1px solid {BORDER};font-size:.78rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Demo data ─────────────────────────────────────────────────────────────────
DEMO_ALERTAS = [
    {
        "id": "A001",
        "titulo": "Fractura pacto PSOE-SUMAR en reforma laboral",
        "severidad": "critico",
        "dimension": "Político",
        "estado": "abierta",
        "descripcion": "Fuentes parlamentarias confirman desacuerdo en punto clave de la reforma. Riesgo de votación fallida antes del 15 de junio.",
        "fecha": "hace 2h",
    },
    {
        "id": "A002",
        "titulo": "Pico de sentimiento negativo — Sánchez (-0.74)",
        "severidad": "alto",
        "dimension": "Mediático",
        "estado": "abierta",
        "descripcion": "El índice de sentimiento del Presidente alcanza mínimos de 8 meses en redes sociales. Correlación con debate vivienda.",
        "fecha": "hace 4h",
    },
    {
        "id": "A003",
        "titulo": "BOE: decreto-ley con impacto fiscal sin previo aviso",
        "severidad": "alto",
        "dimension": "Legislativo",
        "estado": "abierta",
        "descripcion": "Publicado BOE extraordinario con medidas fiscales no anticipadas. Reacción de los mercados pendiente.",
        "fecha": "hace 6h",
    },
    {
        "id": "A004",
        "titulo": "Narrativa 'caos gubernamental' gana tracción (+340%)",
        "severidad": "alto",
        "dimension": "Mediático",
        "estado": "seguimiento",
        "descripcion": "La narrativa ha escalado desde posición 12 a posición 3 en 24 horas.",
        "fecha": "hace 8h",
    },
    {
        "id": "A005",
        "titulo": "CIS: intención de voto PP sube 1.8pp en 2 semanas",
        "severidad": "medio",
        "dimension": "Electoral",
        "estado": "seguimiento",
        "descripcion": "Movimiento por encima del margen de error estadístico. Segunda semana consecutiva.",
        "fecha": "hace 12h",
    },
    {
        "id": "A006",
        "titulo": "Alianza Renew Europa — posición española bajo presión",
        "severidad": "medio",
        "dimension": "Geopolítico",
        "estado": "abierta",
        "descripcion": "Tres eurodiputados españoles de Renew han votado contra posición del gobierno en Parlamento Europeo.",
        "fecha": "hace 18h",
    },
    {
        "id": "A007",
        "titulo": "Inflación subyacente repunta 0.3pp — dato INE",
        "severidad": "medio",
        "dimension": "Económico",
        "estado": "leída",
        "descripcion": "El dato supera ligeramente la previsión. Puede alimentar narrativa de pérdida de poder adquisitivo.",
        "fecha": "hace 1d",
    },
    {
        "id": "A008",
        "titulo": "ERC anuncia posición sobre presupuestos",
        "severidad": "bajo",
        "dimension": "Legislativo",
        "estado": "leída",
        "descripcion": "Portavoz ERC declara condiciones para apoyar presupuestos. Análisis en curso.",
        "fecha": "hace 2d",
    },
]

SEV_CONFIG = {
    "critico": {"color": RED,    "bg": f"rgba(239,68,68,0.08)",   "label": "CRÍTICA", "level": "critical"},
    "alto":    {"color": AMBER,  "bg": f"rgba(245,158,11,0.08)",  "label": "ALTA",    "level": "high"},
    "medio":   {"color": BLUE,   "bg": f"rgba(59,130,246,0.08)",  "label": "MEDIA",   "level": "medium"},
    "bajo":    {"color": GREEN,  "bg": f"rgba(16,185,129,0.08)",  "label": "BAJA",    "level": "low"},
}

DETECTION_RULES = [
    {"id": "R01", "nombre": "Sentimiento negativo líder < -0.6", "dimension": "Mediático", "umbral": "Sentiment < -0.6", "activa": True},
    {"id": "R02", "nombre": "BOE: publicación de RD-Ley", "dimension": "Legislativo", "umbral": "tipo=RD-LEY", "activa": True},
    {"id": "R03", "nombre": "Narrativa viral +200% en 24h", "dimension": "Mediático", "umbral": "growth > 200%", "activa": True},
    {"id": "R04", "nombre": "Intención de voto ±1.5pp semanal", "dimension": "Electoral", "umbral": "Δvoto > 1.5pp", "activa": True},
    {"id": "R05", "nombre": "Votación parlamentaria con riesgo de fracaso", "dimension": "Político", "umbral": "prob_fracaso > 30%", "activa": False},
    {"id": "R06", "nombre": "Dato macro fuera de previsión ±0.3pp", "dimension": "Económico", "umbral": "|Δ| > 0.3pp", "activa": True},
    {"id": "R07", "nombre": "Voto europeo contra posición española", "dimension": "Geopolítico", "umbral": "n_votos_contrarios > 2", "activa": False},
]

# ── Session state ─────────────────────────────────────────────────────────────
if "d6_alertas" not in st.session_state:
    st.session_state["d6_alertas"] = [dict(a) for a in DEMO_ALERTAS]
if "d6_leidas" not in st.session_state:
    st.session_state["d6_leidas"] = {"A007", "A008"}
if "d6_escaladas" not in st.session_state:
    st.session_state["d6_escaladas"] = set()
if "d6_asignadas" not in st.session_state:
    st.session_state["d6_asignadas"] = {}
if "d6_rules" not in st.session_state:
    st.session_state["d6_rules"] = {r["id"]: r["activa"] for r in DETECTION_RULES}
if "d6_ai_analysis" not in st.session_state:
    st.session_state["d6_ai_analysis"] = None

alertas = st.session_state["d6_alertas"]
leidas = st.session_state["d6_leidas"]
escaladas = st.session_state["d6_escaladas"]
asignadas = st.session_state["d6_asignadas"]

# ── Conteos ───────────────────────────────────────────────────────────────────
cnt_critico = sum(1 for a in alertas if a["severidad"] == "critico")
cnt_alto    = sum(1 for a in alertas if a["severidad"] == "alto")
cnt_medio   = sum(1 for a in alertas if a["severidad"] == "medio")
cnt_bajo    = sum(1 for a in alertas if a["severidad"] == "bajo")
cnt_abiertas = sum(1 for a in alertas if a["estado"] == "abierta")

# ── intel_header ──────────────────────────────────────────────────────────────
_status_label = "ALERTA CRÍTICA ACTIVA" if cnt_critico > 0 else ("SEGUIMIENTO ACTIVO" if cnt_alto > 0 else "ACTIVO")
_status_key   = "critical" if cnt_critico > 0 else ("pending" if cnt_alto > 0 else "activo")
intel_header(
    title="Centro de Alertas",
    subtitle="Alert Intelligence",
    status=_status_label,
    time_str=datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
)

# ── Scrolling ticker ──────────────────────────────────────────────────────────
ticker_items = [
    f"[{SEV_CONFIG[a['severidad']]['label']}] {a['titulo']} · {a['fecha']}"
    for a in alertas
    if a["estado"] != "leída"
]
scrolling_ticker(ticker_items)

st.markdown("<div style='margin:.6rem 0'></div>", unsafe_allow_html=True)

# ── KPI row ───────────────────────────────────────────────────────────────────
k1, k2, k3, k4 = st.columns(4)
with k1:
    st.markdown(kpi_card("Críticas", str(cnt_critico), sub="Acción inmediata requerida", color=RED), unsafe_allow_html=True)
with k2:
    st.markdown(kpi_card("Altas", str(cnt_alto), sub="Atención prioritaria", color=AMBER), unsafe_allow_html=True)
with k3:
    st.markdown(kpi_card("Medias", str(cnt_medio), sub="Seguimiento normal", color=BLUE), unsafe_allow_html=True)
with k4:
    st.markdown(kpi_card("Bajas", str(cnt_bajo), sub="Informativo", color=GREEN), unsafe_allow_html=True)

st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

# ── Main layout: feed + sidebar ───────────────────────────────────────────────
col_feed, col_sidebar = st.columns([3, 1])

# ════════════════════════════════════════════════════════════════════════════
# SIDEBAR — Filtros + Reglas
# ════════════════════════════════════════════════════════════════════════════
with col_sidebar:
    section_header("Filtros", CYAN)

    sev_opts = {"Crítica": "critico", "Alta": "alto", "Media": "medio", "Baja": "bajo"}
    sev_sel = st.multiselect(
        "Severidad",
        list(sev_opts.keys()),
        default=list(sev_opts.keys()),
        key="d6_sev_filter",
    )
    sev_filter_vals = [sev_opts[s] for s in sev_sel]

    dims_all = sorted({a["dimension"] for a in alertas})
    dim_sel = st.multiselect("Dimensión", dims_all, default=dims_all, key="d6_dim_filter")

    estado_opts = ["Todas", "Abiertas", "Seguimiento", "Leídas"]
    estado_sel = st.selectbox("Estado", estado_opts, key="d6_estado_filter")

    st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

    col_r1, col_r2 = st.columns(2)
    with col_r1:
        if st.button("Marcar todas leídas", use_container_width=True, key="d6_mark_all"):
            for a in alertas:
                leidas.add(a["id"])
                if a["estado"] != "leída":
                    a["estado"] = "leída"
            st.rerun()
    with col_r2:
        if st.button("Actualizar feed", use_container_width=True, key="d6_refresh"):
            st.rerun()

    # ── Reglas de detección ─────────────────────────────────────────────────
    st.markdown("<div style='margin:.8rem 0 .3rem'></div>", unsafe_allow_html=True)
    with st.expander("Reglas de detección", expanded=False):
        st.markdown(
            f"<div style='font-size:.72rem;color:{MUTED};margin-bottom:.6rem'>"
            f"{sum(1 for r in DETECTION_RULES if st.session_state['d6_rules'].get(r['id'], r['activa']))} / "
            f"{len(DETECTION_RULES)} reglas activas</div>",
            unsafe_allow_html=True,
        )
        for rule in DETECTION_RULES:
            r_active = st.session_state["d6_rules"].get(rule["id"], rule["activa"])
            r_color = GREEN if r_active else MUTED
            new_state = st.toggle(
                f"{rule['nombre']}",
                value=r_active,
                key=f"d6_rule_{rule['id']}",
                help=f"{rule['dimension']} · Umbral: {rule['umbral']}",
            )
            st.session_state["d6_rules"][rule["id"]] = new_state
            st.markdown(
                f"<div style='font-size:.62rem;color:{MUTED};margin-top:-.4rem;margin-bottom:.4rem;padding-left:.3rem'>"
                f"{rule['dimension']} · {rule['umbral']}</div>",
                unsafe_allow_html=True,
            )

    # ── AI analysis button ──────────────────────────────────────────────────
    st.markdown("<div style='margin:.8rem 0 .3rem'></div>", unsafe_allow_html=True)
    section_header("Inteligencia IA", PURPLE)
    if st.button("Análisis consolidado IA", use_container_width=True, key="d6_ai_btn"):
        _llm_ok = False
        try:
            from dashboard.services.llm_local import chat as llm_chat, disponible as llm_disp
            _llm_ok = llm_disp().get("brain", False) or llm_disp().get("general", False)
        except Exception:
            pass

        if _llm_ok:
            with st.spinner("Analizando alertas con IA..."):
                try:
                    resumen = "; ".join(
                        f"[{SEV_CONFIG[a['severidad']]['label']}] {a['titulo']}"
                        for a in alertas if a["estado"] != "leída"
                    )
                    prompt = (
                        f"Analiza estas alertas del sistema de inteligencia política española: {resumen}. "
                        "En 5-6 líneas: identifica el patrón principal, el riesgo sistémico más grave "
                        "y recomienda las 2-3 acciones prioritarias para el equipo de comunicación y estrategia."
                    )
                    resp = llm_chat(prompt, sistema="Eres un analista de inteligencia política de alto nivel especializado en España.")
                    st.session_state["d6_ai_analysis"] = resp
                except Exception as e:
                    st.session_state["d6_ai_analysis"] = f"Error: {e}"
        else:
            # Fallback sintético
            top_sev = [a for a in alertas if a["severidad"] == "critico" and a["estado"] != "leída"]
            top_names = ", ".join(a["titulo"][:40] for a in top_sev[:2]) or "ninguna crítica activa"
            st.session_state["d6_ai_analysis"] = (
                f"**Análisis consolidado (modo demo):**\n\n"
                f"Se detectan {cnt_abiertas} alertas abiertas, de las cuales {cnt_critico} son críticas. "
                f"Los focos de atención prioritaria son: {top_names}. "
                f"El patrón dominante es una combinación de presión mediática negativa y fragilidad parlamentaria "
                f"que puede acelerar una crisis de coalición antes del verano. "
                f"**Acciones recomendadas:** (1) Activar protocolo de comunicación de crisis para narrativa 'caos gubernamental'. "
                f"(2) Monitorizar la votación de reforma laboral en las próximas 48h. "
                f"(3) Preparar respuesta al dato del INE antes de que sea amplificado por la oposición.\n\n"
                f"_Conecta Ollama (politeia-brain) para análisis personalizado en tiempo real._"
            )

    if st.session_state.get("d6_ai_analysis"):
        st.markdown(
            f'<div style="background:{BG3};border:1px solid {PURPLE}44;border-radius:8px;'
            f'padding:.9rem 1rem;font-size:.78rem;color:{TEXT2};line-height:1.6;margin-top:.5rem">'
            f'{st.session_state["d6_ai_analysis"].replace(chr(10),"<br>")}'
            f'</div>',
            unsafe_allow_html=True,
        )
        if st.button("Limpiar análisis", key="d6_clear_ai", use_container_width=True):
            st.session_state["d6_ai_analysis"] = None
            st.rerun()

# ════════════════════════════════════════════════════════════════════════════
# MAIN FEED — Alert signal cards
# ════════════════════════════════════════════════════════════════════════════
with col_feed:
    section_header("Feed de alertas", RED)

    # Filter
    visible = []
    for a in alertas:
        if a["severidad"] not in sev_filter_vals:
            continue
        if a["dimension"] not in dim_sel:
            continue
        if estado_sel == "Abiertas" and a["estado"] != "abierta":
            continue
        elif estado_sel == "Seguimiento" and a["estado"] != "seguimiento":
            continue
        elif estado_sel == "Leídas" and a["estado"] != "leída":
            continue
        visible.append(a)

    if not visible:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;'
            f'padding:2.5rem;text-align:center;color:{MUTED};margin:1rem 0">'
            f'<div style="font-size:1.6rem;margin-bottom:.5rem"></div>'
            f'<div style="font-size:.95rem;font-weight:600">Sin alertas con los filtros actuales</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    else:
        for alerta in visible:
            cfg = SEV_CONFIG[alerta["severidad"]]
            is_read = alerta["id"] in leidas
            is_escalada = alerta["id"] in escaladas
            asignado_a = asignadas.get(alerta["id"], "")

            # Enrich body with state badges
            estado_color = {
                "abierta": RED, "seguimiento": AMBER, "leída": GREEN
            }.get(alerta["estado"], MUTED)
            estado_label = alerta["estado"].upper()

            dim_html = f'<span class="dim-badge">{alerta["dimension"]}</span>'
            escalada_html = (
                f'<span style="font-size:.6rem;color:{PURPLE};font-weight:700;'
                f'background:{PURPLE}18;border-radius:4px;padding:.15rem .45rem;margin-left:.3rem">ESCALADA</span>'
                if is_escalada else ""
            )
            asignado_html = (
                f'<span style="font-size:.62rem;color:{CYAN};">→ {asignado_a}</span>'
                if asignado_a else ""
            )

            body_extra = (
                f'{dim_html}'
                f'<span style="font-size:.6rem;color:{estado_color};font-weight:700;'
                f'background:{estado_color}18;border-radius:4px;padding:.15rem .45rem">{estado_label}</span>'
                f'{escalada_html}'
                f' {asignado_html}'
                f'<br><span style="color:{MUTED};font-size:.75rem">{alerta["descripcion"]}</span>'
            )

            opacity_style = "opacity:.55;" if is_read else ""

            # Render signal_card
            card_html = signal_card(
                title=alerta["titulo"],
                body=body_extra,
                level=cfg["level"],
                source=f"ElectSim · {alerta['dimension']}",
                time_ago=alerta["fecha"],
            )
            # Inject opacity
            card_html = card_html.replace(
                'border-radius:8px;padding:1rem 1.2rem;margin-bottom:.6rem',
                f'border-radius:8px;padding:1rem 1.2rem;margin-bottom:.6rem;{opacity_style}',
            )
            st.markdown(card_html, unsafe_allow_html=True)

            # Action row
            action_cols = st.columns([1, 1, 2, 2])
            with action_cols[0]:
                if alerta["id"] not in leidas:
                    if st.button(" Leída", key=f"d6_read_{alerta['id']}", use_container_width=True):
                        leidas.add(alerta["id"])
                        alerta["estado"] = "leída"
                        st.rerun()
                else:
                    st.markdown(
                        f'<div style="font-size:.65rem;color:{GREEN};padding:.4rem .6rem;text-align:center"> Leída</div>',
                        unsafe_allow_html=True,
                    )
            with action_cols[1]:
                if alerta["id"] not in escaladas:
                    if st.button("↑ Escalar", key=f"d6_esc_{alerta['id']}", use_container_width=True):
                        escaladas.add(alerta["id"])
                        if alerta["estado"] == "leída":
                            alerta["estado"] = "seguimiento"
                        st.rerun()
                else:
                    st.markdown(
                        f'<div style="font-size:.65rem;color:{PURPLE};padding:.4rem .6rem;text-align:center">↑ Escalada</div>',
                        unsafe_allow_html=True,
                    )
            with action_cols[2]:
                asignee = st.text_input(
                    "Asignar a",
                    value=asignado_a,
                    key=f"d6_asign_in_{alerta['id']}",
                    placeholder="nombre o equipo",
                    label_visibility="collapsed",
                )
            with action_cols[3]:
                if st.button("Asignar", key=f"d6_asign_btn_{alerta['id']}", use_container_width=True):
                    if asignee.strip():
                        asignadas[alerta["id"]] = asignee.strip()
                        st.rerun()

    # ── Alert Timeline ────────────────────────────────────────────────────────
    st.markdown("<div style='margin:1.2rem 0 .3rem'></div>", unsafe_allow_html=True)
    section_header("Timeline de alertas · últimos 30 días", CYAN)

    day_seed = int(hashlib.md5(datetime.date.today().isoformat().encode()).hexdigest(), 16) % 10000
    rng = random.Random(day_seed)
    hist_days = [datetime.date.today() - datetime.timedelta(days=29 - i) for i in range(30)]
    hist_days_str = [d.strftime("%d/%m") for d in hist_days]

    hist_critico = [max(0, int(cnt_critico + rng.uniform(-1, 1.5))) for _ in hist_days]
    hist_alto    = [max(0, int(cnt_alto    + rng.uniform(-1, 2)))   for _ in hist_days]
    hist_medio   = [max(0, int(cnt_medio   + rng.uniform(-1, 2.5))) for _ in hist_days]
    hist_bajo    = [max(0, int(cnt_bajo    + rng.uniform(-1, 2)))   for _ in hist_days]

    fig = go.Figure()
    for label, values, color in [
        ("Crítica", hist_critico, RED),
        ("Alta",    hist_alto,    AMBER),
        ("Media",   hist_medio,   BLUE),
        ("Baja",    hist_bajo,    GREEN),
    ]:
        fig.add_trace(go.Bar(
            x=hist_days_str,
            y=values,
            name=label,
            marker_color=color,
            hovertemplate=f"<b>{label}</b><br>%{{x}}<br>%{{y}} alertas<extra></extra>",
        ))

    fig.update_layout(
        barmode="stack",
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        height=220,
        margin=dict(l=10, r=10, t=10, b=30),
        xaxis=dict(tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED, tickangle=-45),
        yaxis=dict(tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED),
        legend=dict(
            font=dict(color=TEXT2, size=10), bgcolor=BG3, bordercolor=BORDER, borderwidth=1,
            orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
        ),
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
