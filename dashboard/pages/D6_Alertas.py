"""
D6 — Centro de Alertas
Feed de alertas en tiempo real clasificado por severidad, configuración de umbrales
y canales, historial con analíticas de gestión.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import datetime
import hashlib
import random

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    AMBER, RED, GREEN, TEXT, TEXT2, MUTED,
    section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Centro de Alertas — ElectSim",
    page_icon="🔔",
    layout="wide",
)

sidebar_nav()
mostrar_alertas_pagina("alertas")

# ── Estilos ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
body, .stApp {{ background:{BG}; color:{TEXT}; }}
.alert-card {{
  border-radius:12px;padding:.9rem 1.1rem;margin:.45rem 0;
  border:1px solid;transition:box-shadow .2s;
}}
.alert-card:hover {{ box-shadow:0 0 14px rgba(0,212,255,.12); }}
.sev-critica  {{ border-left:5px solid #EF4444!important; border-color:#EF4444!important; }}
.sev-alta     {{ border-left:5px solid #F97316!important; border-color:#F97316!important; }}
.sev-media    {{ border-left:5px solid #F59E0B!important; border-color:#F59E0B!important; }}
.sev-baja     {{ border-left:5px solid #10B981!important; border-color:#10B981!important; }}
.channel-badge {{
  display:inline-block;font-size:.62rem;font-weight:800;letter-spacing:.06em;
  padding:2px 7px;border-radius:4px;margin-right:4px;
}}
.audit-row {{
  display:flex;gap:.6rem;align-items:flex-start;
  padding:.45rem .6rem;border-bottom:1px solid {BORDER};
  font-size:.78rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Constantes de severidad ───────────────────────────────────────────────────
SEV_CONFIG = {
    "CRÍTICA": {"color": "#EF4444", "bg": "rgba(239,68,68,0.08)",   "icon": "🔴", "css": "sev-critica"},
    "ALTA":    {"color": "#F97316", "bg": "rgba(249,115,22,0.08)",  "icon": "🟠", "css": "sev-alta"},
    "MEDIA":   {"color": "#F59E0B", "bg": "rgba(245,158,11,0.08)",  "icon": "🟡", "css": "sev-media"},
    "BAJA":    {"color": "#10B981", "bg": "rgba(16,185,129,0.08)",  "icon": "🟢", "css": "sev-baja"},
}

CATEGORIES = ["Legislativa", "Mediática", "Electoral", "Económica", "Social", "Seguridad"]

CHANNEL_BADGES = {
    "Email":    ("#3B82F6", "📧"),
    "Telegram": ("#06B6D4", "✈️"),
    "Webhook":  ("#8B5CF6", "🔗"),
    "Platform": ("#10B981", "🖥️"),
}

# ── Session state ─────────────────────────────────────────────────────────────
if "alertas" not in st.session_state:
    st.session_state["alertas"] = []
if "alertas_leidas" not in st.session_state:
    st.session_state["alertas_leidas"] = set()
if "telegram_token" not in st.session_state:
    st.session_state["telegram_token"] = ""
if "telegram_chat_id" not in st.session_state:
    st.session_state["telegram_chat_id"] = ""

# ── Generación de alertas ─────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def _generar_alertas_base() -> list[dict]:
    """Genera alertas combinando BOE, noticias y NLP con fallback sintético."""
    alertas: list[dict] = []
    day_seed = int(hashlib.md5(datetime.date.today().isoformat().encode()).hexdigest(), 16) % 10000
    rng = random.Random(day_seed)

    # -- BOE alerts -----------------------------------------------------------
    try:
        from dashboard.services import boe_api as _boe
        if hasattr(_boe, "obtener_sumario"):
            sumario = _boe.obtener_sumario(datetime.date.today().isoformat())
            if isinstance(sumario, list):
                for item in sumario[:6]:
                    title = str(item.get("titulo", "Disposición BOE"))[:120]
                    tipo = str(item.get("tipo_clasificacion", "")).upper()
                    sev = "CRÍTICA" if tipo in {"LEY", "RD-LEY"} else "ALTA" if tipo == "RESOLUCIÓN" else "MEDIA"
                    h = hashlib.md5(title.encode()).hexdigest()[:8]
                    alertas.append({
                        "id": f"boe_{h}",
                        "titulo": title,
                        "desc": f"Tipo: {tipo} · BOE {datetime.date.today().isoformat()}",
                        "severidad": sev,
                        "categoria": "Legislativa",
                        "ts": datetime.datetime.now() - datetime.timedelta(minutes=rng.randint(5, 120)),
                        "fuente": "BOE",
                        "channels": ["Platform", "Email"],
                        "leida": False,
                        "urgencia": 90 if sev == "CRÍTICA" else 70,
                        "novedad": 80,
                    })
    except Exception:
        pass

    # -- News/NLP alerts -------------------------------------------------------
    try:
        from dashboard.services import news_crawler as _nc
        if hasattr(_nc, "fetch_latest"):
            noticias = _nc.fetch_latest(limit=8)
            for noticia in (noticias or []):
                title = str(noticia.get("title", "Noticia"))[:120]
                sent = float(noticia.get("sentiment_neg", 0) or 0)
                sev = "CRÍTICA" if sent > 0.75 else "ALTA" if sent > 0.5 else "MEDIA" if sent > 0.25 else "BAJA"
                h = hashlib.md5(title.encode()).hexdigest()[:8]
                alertas.append({
                    "id": f"news_{h}",
                    "titulo": title,
                    "desc": f"Sentimiento negativo: {sent:.0%} · {noticia.get('source', 'Prensa')}",
                    "severidad": sev,
                    "categoria": "Mediática",
                    "ts": datetime.datetime.now() - datetime.timedelta(minutes=rng.randint(2, 90)),
                    "fuente": str(noticia.get("source", "Prensa")),
                    "channels": ["Platform"],
                    "leida": False,
                    "urgencia": int(sent * 100),
                    "novedad": rng.randint(50, 95),
                })
    except Exception:
        pass

    # -- Synthetic fallback ---------------------------------------------------
    if len(alertas) < 4:
        templates = [
            ("Moción de censura: nuevas adhesiones parlamentarias", "CRÍTICA", "Electoral", "Prensa", ["Platform", "Email", "Telegram"], 95, 90),
            ("RD-Ley de medidas urgentes en materia energética publicado en BOE", "CRÍTICA", "Legislativa", "BOE", ["Platform", "Email"], 92, 85),
            ("Huelga de transporte convocada para próxima semana", "ALTA", "Social", "Sindicatos", ["Platform", "Telegram"], 78, 80),
            ("Encuesta CIS: caída de 3 puntos del partido en el gobierno", "ALTA", "Electoral", "CIS", ["Platform", "Email"], 75, 88),
            ("Declaraciones del portavoz: tensión en negociación presupuestaria", "ALTA", "Legislativa", "Congreso", ["Platform"], 70, 72),
            ("BOE: nueva resolución sobre financiación autonómica", "MEDIA", "Legislativa", "BOE", ["Platform"], 55, 65),
            ("Manifestación convocada en Madrid por grupos de oposición", "MEDIA", "Social", "Redes", ["Platform", "Telegram"], 50, 70),
            ("Sondeo regional: VOX sube en Cataluña según encuesta interna", "MEDIA", "Electoral", "Prensa", ["Platform"], 48, 60),
            ("Acuerdo de investidura: negociaciones retomadas", "MEDIA", "Electoral", "Prensa", ["Platform"], 45, 75),
            ("Agenda parlamentaria: pleno ordinario sin elementos críticos", "BAJA", "Legislativa", "Congreso", ["Platform"], 20, 40),
            ("Indicadores de satisfacción ciudadana estables en enero", "BAJA", "Social", "CIS", ["Platform"], 15, 35),
        ]
        for i, (title, sev, cat, src, chans, urg, nov) in enumerate(templates):
            h = hashlib.md5(title.encode()).hexdigest()[:8]
            offset_min = rng.randint(1, 360)
            alertas.append({
                "id": f"synth_{h}",
                "titulo": title,
                "desc": f"Fuente: {src} · Detectado automáticamente por ElectSim",
                "severidad": sev,
                "categoria": cat,
                "ts": datetime.datetime.now() - datetime.timedelta(minutes=offset_min),
                "fuente": src,
                "channels": chans,
                "leida": False,
                "urgencia": urg,
                "novedad": nov,
            })

    # Deduplicate by id
    seen: set[str] = set()
    deduped: list[dict] = []
    for a in alertas:
        if a["id"] not in seen:
            seen.add(a["id"])
            deduped.append(a)

    # Sort by urgencia × novedad desc
    deduped.sort(key=lambda x: x["urgencia"] * x["novedad"], reverse=True)
    return deduped


def _init_alertas():
    base = _generar_alertas_base()
    existing_ids = {a["id"] for a in st.session_state["alertas"]}
    for a in base:
        if a["id"] not in existing_ids:
            st.session_state["alertas"].append(a)


_init_alertas()
alertas_all = st.session_state["alertas"]
leidas = st.session_state["alertas_leidas"]

# Conteos
cnt = {sev: sum(1 for a in alertas_all if a["severidad"] == sev) for sev in SEV_CONFIG}
cnt_no_leidas = sum(1 for a in alertas_all if a["id"] not in leidas)

# ── Header ────────────────────────────────────────────────────────────────────
badge_html = (
    f'<span style="background:{RED};color:#fff;border-radius:12px;padding:2px 10px;'
    f'font-size:.78rem;font-weight:800;margin-left:.5rem">{cnt_no_leidas} sin leer</span>'
    if cnt_no_leidas > 0 else ""
)
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{RED},{AMBER});
    border-radius:12px;display:flex;align-items:center;justify-content:center;
    font-size:1.5rem;flex-shrink:0">🔔</div>
  <div>
    <div style="font-size:1.3rem;font-weight:900;color:{TEXT};letter-spacing:-.01em">
      Centro de Alertas{badge_html}</div>
    <div style="font-size:.8rem;color:{MUTED}">
      Feed en tiempo real · Priorizado por urgencia × novedad · Multi-canal</div>
  </div>
</div>
""", unsafe_allow_html=True)

# KPI row
k1, k2, k3, k4, k5 = st.columns(5)
with k1:
    st.markdown(kpi_card("Total alertas", str(len(alertas_all)), sub="Activas en sistema", color=CYAN), unsafe_allow_html=True)
with k2:
    st.markdown(kpi_card("CRÍTICAS", str(cnt.get("CRÍTICA", 0)), sub="Requieren acción inmediata", color=RED), unsafe_allow_html=True)
with k3:
    st.markdown(kpi_card("ALTAS", str(cnt.get("ALTA", 0)), sub="Atención prioritaria", color=AMBER), unsafe_allow_html=True)
with k4:
    st.markdown(kpi_card("MEDIAS", str(cnt.get("MEDIA", 0)), sub="Seguimiento normal", color=PURPLE), unsafe_allow_html=True)
with k5:
    st.markdown(kpi_card("Sin leer", str(cnt_no_leidas), sub="Pendientes de revisión", color=BLUE), unsafe_allow_html=True)

st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_feed, tab_config, tab_hist = st.tabs(["🔔 Alertas Activas", "⚙️ Configurar", "📊 Historial"])

# ════════════════════════════════════════════════════════════════════════════
# TAB 1: ALERTAS ACTIVAS
# ════════════════════════════════════════════════════════════════════════════
with tab_feed:
    col_feed, col_sidebar = st.columns([2, 1])

    with col_sidebar:
        section_header("Filtros", CYAN)
        sev_filter = st.multiselect(
            "Severidad",
            ["CRÍTICA", "ALTA", "MEDIA", "BAJA"],
            default=["CRÍTICA", "ALTA", "MEDIA", "BAJA"],
            key="sev_filter",
        )
        cat_filter = st.multiselect(
            "Categoría",
            CATEGORIES,
            default=CATEGORIES,
            key="cat_filter",
        )
        mode = st.radio("Vista", ["Compacta", "Expandida"], horizontal=True, key="alert_mode")
        show_read = st.toggle("Mostrar leídas", value=False, key="show_read")

        st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)
        if st.button("Marcar todas como leídas", use_container_width=True):
            for a in alertas_all:
                leidas.add(a["id"])
            st.session_state["alertas_leidas"] = leidas
            st.rerun()

        if st.button("Actualizar feed", use_container_width=True):
            st.cache_data.clear()
            st.rerun()

        # Canales activos
        section_header("Canales activos", BLUE)
        for ch, (col, icon) in CHANNEL_BADGES.items():
            r2, g2, b2 = tuple(int(col.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:.6rem;margin:.3rem 0">
              <div style="width:28px;height:28px;background:rgba({r2},{g2},{b2},.18);
                border-radius:6px;display:flex;align-items:center;justify-content:center;
                font-size:1rem">{icon}</div>
              <span style="font-size:.82rem;color:{TEXT2}">{ch}</span>
              <span style="margin-left:auto;font-size:.65rem;font-weight:700;
                color:{col};background:rgba({r2},{g2},{b2},.15);border-radius:4px;
                padding:1px 6px">Activo</span>
            </div>
            """, unsafe_allow_html=True)

    with col_feed:
        section_header("Feed de alertas", RED)

        # Apply filters
        visible = [
            a for a in alertas_all
            if a["severidad"] in sev_filter
            and a["categoria"] in cat_filter
            and (show_read or a["id"] not in leidas)
        ]

        if not visible:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;
              padding:2.5rem;text-align:center;color:{MUTED};margin:1rem 0">
              <div style="font-size:2rem;margin-bottom:.5rem">✅</div>
              <div style="font-size:.95rem;font-weight:600">Sin alertas activas con los filtros actuales</div>
            </div>
            """, unsafe_allow_html=True)
        else:
            for alerta in visible:
                cfg = SEV_CONFIG[alerta["severidad"]]
                is_read = alerta["id"] in leidas
                opacity = "0.55" if is_read else "1"
                ts_str = alerta["ts"].strftime("%H:%M") if hasattr(alerta["ts"], "strftime") else str(alerta["ts"])

                def _ch_badge(ch: str) -> str:
                    c_hex = CHANNEL_BADGES[ch][0]
                    ic = CHANNEL_BADGES[ch][1]
                    r3, g3, b3 = tuple(int(c_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
                    return (
                        f'<span class="channel-badge" style="background:rgba({r3},{g3},{b3},0.25);'
                        f'color:{c_hex}">{ic} {ch}</span>'
                    )
                channels_html = "".join(
                    _ch_badge(ch)
                    for ch in alerta.get("channels", [])
                    if ch in CHANNEL_BADGES
                )

                score = alerta["urgencia"] * alerta["novedad"] // 100
                _c = cfg["color"]
                _cr, _cg, _cb = tuple(int(_c.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
                sev_bg = f"rgba({_cr},{_cg},{_cb},0.15)"

                if mode == "Expandida":
                    st.markdown(f"""
                    <div class="alert-card {cfg['css']}"
                      style="background:{cfg['bg']};opacity:{opacity}">
                      <div style="display:flex;align-items:flex-start;gap:.7rem">
                        <div style="font-size:1.3rem;flex-shrink:0">{cfg['icon']}</div>
                        <div style="flex:1">
                          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;
                            margin-bottom:.25rem">
                            <span style="font-size:.85rem;font-weight:800;color:{TEXT}">{alerta['titulo']}</span>
                            <span style="font-size:.65rem;font-weight:800;color:{_c};
                              background:{sev_bg};
                              border-radius:4px;padding:1px 7px">{alerta['severidad']}</span>
                            <span style="font-size:.65rem;color:{MUTED};background:{BG3};
                              border-radius:4px;padding:1px 6px">{alerta['categoria']}</span>
                          </div>
                          <div style="font-size:.76rem;color:{TEXT2};margin-bottom:.4rem">{alerta['desc']}</div>
                          <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">
                            <span style="font-size:.68rem;color:{MUTED}">🕐 {ts_str}</span>
                            <span style="font-size:.68rem;color:{MUTED}">📎 {alerta['fuente']}</span>
                            <span style="font-size:.68rem;color:{CYAN}">Score: {score}</span>
                            {channels_html}
                          </div>
                        </div>
                      </div>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    # Compact
                    st.markdown(f"""
                    <div class="alert-card {cfg['css']}"
                      style="background:{cfg['bg']};opacity:{opacity};padding:.6rem .9rem">
                      <div style="display:flex;align-items:center;gap:.6rem">
                        <span style="font-size:1rem;flex-shrink:0">{cfg['icon']}</span>
                        <span style="font-size:.8rem;font-weight:700;color:{TEXT};flex:1;
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{alerta['titulo']}</span>
                        <span style="font-size:.65rem;font-weight:800;color:{cfg['color']};
                          white-space:nowrap;margin-left:.4rem">{alerta['severidad']}</span>
                        <span style="font-size:.65rem;color:{MUTED};white-space:nowrap">{ts_str}</span>
                        <span style="font-size:.65rem;color:{CYAN};white-space:nowrap">⚡{score}</span>
                      </div>
                    </div>
                    """, unsafe_allow_html=True)

                col_mark, col_del = st.columns([3, 1])
                with col_mark:
                    if alerta["id"] not in leidas:
                        if st.button("Marcar leída", key=f"read_{alerta['id']}", use_container_width=True):
                            leidas.add(alerta["id"])
                            st.session_state["alertas_leidas"] = leidas
                            st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# TAB 2: CONFIGURAR
# ════════════════════════════════════════════════════════════════════════════
with tab_config:
    col_thresh, col_channels = st.columns([1, 1])

    with col_thresh:
        section_header("Umbrales por categoría", PURPLE)
        st.markdown(f"<div style='font-size:.78rem;color:{TEXT2};margin-bottom:.8rem'>Ajusta cuándo se genera una alerta para cada categoría</div>", unsafe_allow_html=True)

        if "thresholds" not in st.session_state:
            st.session_state["thresholds"] = {cat: 40 for cat in CATEGORIES}

        for cat in CATEGORIES:
            val = st.slider(
                f"{cat}",
                min_value=0, max_value=100,
                value=st.session_state["thresholds"].get(cat, 40),
                step=5,
                key=f"thr_{cat}",
                help=f"Umbral mínimo de score para activar alerta en categoría {cat}",
            )
            st.session_state["thresholds"][cat] = val

        st.markdown("<div style='margin:.8rem 0'></div>", unsafe_allow_html=True)
        section_header("Filtro de entidades", CYAN)

        entity_filter = st.text_area(
            "Entidades a monitorizar (una por línea)",
            value="Pedro Sánchez\nAlberto Núñez Feijóo\nSantiago Abascal\nYolanda Díaz\nCarles Puigdemont",
            height=130,
            key="entity_filter_text",
        )
        entities = [e.strip() for e in entity_filter.splitlines() if e.strip()]
        st.markdown(f"<div style='font-size:.72rem;color:{MUTED}'>{len(entities)} entidades configuradas</div>", unsafe_allow_html=True)

        st.markdown("<div style='margin:.8rem 0'></div>", unsafe_allow_html=True)
        section_header("Frecuencia de verificación", AMBER)
        freq = st.selectbox(
            "Intervalo de actualización",
            ["Tiempo real (1 min)", "5 minutos", "15 minutos", "30 minutos", "1 hora"],
            index=1,
            key="freq_select",
        )
        sev_min = st.selectbox(
            "Severidad mínima para notificar",
            ["BAJA", "MEDIA", "ALTA", "CRÍTICA"],
            index=1,
            key="sev_min_select",
        )
        if st.button("Guardar configuración", use_container_width=True, key="save_config"):
            st.success("Configuración guardada correctamente")

    with col_channels:
        section_header("Configuración de canales", BLUE)

        # Email
        with st.expander("📧 Email", expanded=False):
            st.text_input("Dirección de email", key="email_addr", placeholder="politeia@dominio.com")
            st.toggle("Activar notificaciones email", key="email_active", value=False)

        # Telegram
        with st.expander("✈️ Telegram Bot", expanded=True):
            tok = st.text_input(
                "Bot Token", type="password",
                value=st.session_state.get("telegram_token", ""),
                key="tg_token_input",
                placeholder="123456789:ABCdefGHI...",
            )
            chat = st.text_input(
                "Chat ID",
                value=st.session_state.get("telegram_chat_id", ""),
                key="tg_chat_input",
                placeholder="-100123456789",
            )
            col_save, col_test = st.columns(2)
            with col_save:
                if st.button("Guardar", key="tg_save", use_container_width=True):
                    st.session_state["telegram_token"] = tok
                    st.session_state["telegram_chat_id"] = chat
                    st.success("Guardado")
            with col_test:
                if st.button("Probar", key="tg_test", use_container_width=True):
                    tok_val = st.session_state.get("telegram_token", "")
                    chat_val = st.session_state.get("telegram_chat_id", "")
                    if not tok_val or not chat_val:
                        st.error("Configura token y chat ID primero")
                    else:
                        try:
                            import urllib.request
                            import json as _json
                            payload = {"chat_id": chat_val, "text": "🔔 ElectSim — Test de alerta OK"}
                            data_bytes = _json.dumps(payload).encode("utf-8")
                            req = urllib.request.Request(
                                f"https://api.telegram.org/bot{tok_val}/sendMessage",
                                data=data_bytes,
                                headers={"Content-Type": "application/json"},
                            )
                            with urllib.request.urlopen(req, timeout=5) as resp:
                                if resp.status == 200:
                                    st.success("Mensaje enviado correctamente")
                                else:
                                    st.error(f"Error: HTTP {resp.status}")
                        except Exception as e:
                            st.error(f"Error al enviar: {e}")

        # Webhook
        with st.expander("🔗 Webhook", expanded=False):
            st.text_input("URL del webhook", key="webhook_url", placeholder="https://mi-sistema.com/webhook")
            st.selectbox("Formato", ["JSON", "Form-encoded"], key="webhook_fmt")
            st.toggle("Activar webhook", key="webhook_active", value=False)

        # Alerta manual
        section_header("Crear alerta manual", RED)
        with st.form("manual_alert_form"):
            m_title = st.text_input("Título de la alerta *", key="manual_title")
            m_desc = st.text_area("Descripción", height=70, key="manual_desc")
            m_sev = st.selectbox("Severidad", ["BAJA", "MEDIA", "ALTA", "CRÍTICA"], index=2, key="manual_sev")
            m_cat = st.selectbox("Categoría", CATEGORIES, key="manual_cat")
            submitted = st.form_submit_button("Crear alerta", use_container_width=True)
            if submitted:
                if m_title.strip():
                    new_id = hashlib.md5((m_title + datetime.datetime.now().isoformat()).encode()).hexdigest()[:8]
                    st.session_state["alertas"].insert(0, {
                        "id": f"manual_{new_id}",
                        "titulo": m_title.strip(),
                        "desc": m_desc.strip() or "Alerta creada manualmente",
                        "severidad": m_sev,
                        "categoria": m_cat,
                        "ts": datetime.datetime.now(),
                        "fuente": "Manual",
                        "channels": ["Platform"],
                        "leida": False,
                        "urgencia": {"BAJA": 20, "MEDIA": 50, "ALTA": 75, "CRÍTICA": 95}[m_sev],
                        "novedad": 80,
                    })
                    st.success("Alerta creada correctamente")
                    st.rerun()
                else:
                    st.error("El título es obligatorio")


# ════════════════════════════════════════════════════════════════════════════
# TAB 3: HISTORIAL
# ════════════════════════════════════════════════════════════════════════════
with tab_hist:
    col_charts, col_log = st.columns([3, 2])

    with col_charts:
        section_header("Tendencia de alertas (últimos 30 días)", CYAN)

        day_seed = int(hashlib.md5(datetime.date.today().isoformat().encode()).hexdigest(), 16) % 10000
        rng = random.Random(day_seed)

        hist_days = [datetime.date.today() - datetime.timedelta(days=29 - i) for i in range(30)]
        hist_critica = [max(0, int(cnt.get("CRÍTICA", 1) + rng.uniform(-1, 2))) for _ in hist_days]
        hist_alta    = [max(0, int(cnt.get("ALTA", 2)    + rng.uniform(-2, 3))) for _ in hist_days]
        hist_media   = [max(0, int(cnt.get("MEDIA", 3)   + rng.uniform(-2, 4))) for _ in hist_days]
        hist_baja    = [max(0, int(cnt.get("BAJA", 4)    + rng.uniform(-1, 3))) for _ in hist_days]
        hist_days_str = [d.isoformat() for d in hist_days]

        fig_hist = go.Figure()
        for label, values, color in [
            ("CRÍTICA", hist_critica, "#EF4444"),
            ("ALTA",    hist_alta,    "#F97316"),
            ("MEDIA",   hist_media,   "#F59E0B"),
            ("BAJA",    hist_baja,    "#10B981"),
        ]:
            fig_hist.add_trace(go.Bar(
                x=hist_days_str,
                y=values,
                name=label,
                marker_color=color,
                hovertemplate=f"<b>{label}</b><br>%{{x}}<br>%{{y}} alertas<extra></extra>",
            ))

        fig_hist.update_layout(
            barmode="stack",
            paper_bgcolor=BG2,
            plot_bgcolor=BG2,
            height=280,
            margin=dict(l=10, r=10, t=20, b=40),
            xaxis=dict(tickfont=dict(color=MUTED, size=10), gridcolor=BORDER, color=MUTED),
            yaxis=dict(tickfont=dict(color=MUTED, size=10), gridcolor=BORDER, color=MUTED),
            legend=dict(font=dict(color=TEXT2, size=11), bgcolor=BG3,
                        bordercolor=BORDER, borderwidth=1, orientation="h",
                        yanchor="bottom", y=1.02, xanchor="right", x=1),
            font=dict(color=TEXT),
        )
        st.plotly_chart(fig_hist, use_container_width=True, config={"displayModeBar": False})

        # Management KPIs
        section_header("KPIs de gestión", PURPLE)
        total_30 = sum(hist_critica) + sum(hist_alta) + sum(hist_media) + sum(hist_baja)
        leidas_count = len(leidas)
        mgmt_rate = min(100, int(leidas_count / max(len(alertas_all), 1) * 100))

        mk1, mk2, mk3, mk4 = st.columns(4)
        with mk1:
            st.markdown(kpi_card("Alertas 30d", str(total_30), sub="Total generadas", color=CYAN), unsafe_allow_html=True)
        with mk2:
            st.markdown(kpi_card("Tasa gestión", f"{mgmt_rate}%", sub="Leídas / total activas", color=GREEN if mgmt_rate >= 70 else AMBER), unsafe_allow_html=True)
        with mk3:
            critica_30 = sum(hist_critica)
            st.markdown(kpi_card("Críticas 30d", str(critica_30), sub="Requirieron acción", color=RED), unsafe_allow_html=True)
        with mk4:
            avg_daily = round(total_30 / 30, 1)
            st.markdown(kpi_card("Media diaria", str(avg_daily), sub="Alertas/día", color=PURPLE), unsafe_allow_html=True)

        # Category breakdown donut
        section_header("Distribución por categoría", AMBER)
        cat_counts = {}
        for a in alertas_all:
            cat_counts[a["categoria"]] = cat_counts.get(a["categoria"], 0) + 1

        if cat_counts:
            cat_colors = ["#00D4FF", "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444"]
            fig_donut = go.Figure(go.Pie(
                labels=list(cat_counts.keys()),
                values=list(cat_counts.values()),
                hole=0.55,
                marker=dict(colors=cat_colors[:len(cat_counts)], line=dict(color=BG, width=2)),
                textfont=dict(color=TEXT, size=11),
                hovertemplate="<b>%{label}</b><br>%{value} alertas (%{percent})<extra></extra>",
            ))
            fig_donut.update_layout(
                paper_bgcolor=BG2,
                height=230,
                margin=dict(l=10, r=10, t=10, b=10),
                showlegend=True,
                legend=dict(font=dict(color=TEXT2, size=10), bgcolor=BG3,
                            bordercolor=BORDER, borderwidth=1),
                font=dict(color=TEXT),
                annotations=[dict(text=f"<b>{len(alertas_all)}</b><br>total",
                                  x=0.5, y=0.5, font=dict(size=14, color=TEXT),
                                  showarrow=False)],
            )
            st.plotly_chart(fig_donut, use_container_width=True, config={"displayModeBar": False})

    with col_log:
        section_header("Registro de auditoría", BLUE)
        st.markdown(f"<div style='font-size:.72rem;color:{MUTED};margin-bottom:.5rem'>Últimas {min(len(alertas_all), 20)} alertas procesadas</div>", unsafe_allow_html=True)

        audit_html = ""
        for a in alertas_all[:20]:
            cfg = SEV_CONFIG[a["severidad"]]
            ts_str = a["ts"].strftime("%d/%m %H:%M") if hasattr(a["ts"], "strftime") else str(a["ts"])
            read_str = "✓ Leída" if a["id"] in leidas else "· Pendiente"
            read_col = GREEN if a["id"] in leidas else MUTED
            audit_html += f"""
            <div class="audit-row">
              <span style="font-size:.9rem;flex-shrink:0">{cfg['icon']}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:.76rem;color:{TEXT};white-space:nowrap;
                  overflow:hidden;text-overflow:ellipsis">{a['titulo'][:60]}</div>
                <div style="font-size:.65rem;color:{MUTED};margin-top:1px">
                  {a['categoria']} · {a['fuente']} · {ts_str}
                </div>
              </div>
              <span style="font-size:.65rem;color:{read_col};flex-shrink:0;margin-left:.4rem">{read_str}</span>
            </div>
            """

        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
          overflow:hidden;max-height:520px;overflow-y:auto">
          {audit_html}
        </div>
        """, unsafe_allow_html=True)

        # Export button
        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        if st.button("Exportar historial CSV", use_container_width=True, key="export_hist"):
            df_export = pd.DataFrame([
                {
                    "id": a["id"],
                    "titulo": a["titulo"],
                    "severidad": a["severidad"],
                    "categoria": a["categoria"],
                    "fuente": a["fuente"],
                    "timestamp": a["ts"].isoformat() if hasattr(a["ts"], "isoformat") else str(a["ts"]),
                    "leida": a["id"] in leidas,
                    "urgencia": a["urgencia"],
                    "novedad": a["novedad"],
                }
                for a in alertas_all
            ])
            csv_str = df_export.to_csv(index=False)
            st.download_button(
                "Descargar CSV",
                data=csv_str.encode("utf-8"),
                file_name=f"alertas_{datetime.date.today().isoformat()}.csv",
                mime="text/csv",
                use_container_width=True,
                key="dl_csv",
            )
