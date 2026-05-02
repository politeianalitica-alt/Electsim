"""Utilidades compartidas para todas las páginas del dashboard."""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st

# ── Design tokens (dark / tech theme) ────────────────────────────────────────
BG       = "#080C14"        # fondo principal
BG2      = "#0D1320"        # fondo secundario / cards
BG3      = "#111827"        # cards elevadas
BORDER   = "#1E293B"        # bordes suaves
BORDER2  = "#00D4FF26"      # borde cyan con alfa
CYAN     = "#00D4FF"        # acento primario
CYAN2    = "#22D3EE"        # acento secundario
BLUE     = "#3B82F6"        # azul acción
PURPLE   = "#8B5CF6"        # acento púrpura
TEXT     = "#E2E8F0"        # texto principal
TEXT2    = "#94A3B8"        # texto secundario
MUTED    = "#475569"        # texto apagado
GREEN    = "#10B981"
AMBER    = "#F59E0B"
RED      = "#EF4444"

_RAW_COLORES_PARTIDOS = {
    "PP":       "#009FDB",
    "PSOE":     "#E30613",
    "VOX":      "#63BE21",
    "SUMAR":    "#E4007C",
    "PODEMOS":  "#6A2E74",
    "CS":       "#EB6109",
    "ERC":      "#F4B20A",
    "JUNTS":    "#00AEEF",
    "PNV":      "#007A3D",
    "EH Bildu": "#A9C55A",
    "BNG":      "#73C6E0",
    "CUP":      "#FFCC00",
    "CC":       "#FFCB00",
    "UPN":      "#003A8C",
    "PRC":      "#008037",
    "IU":       "#C8293A",
    "UP":       "#6A2E74",
}


_PARTY_ALIASES = {
    "EH_BILDU": "EH Bildu",
    "BILDU": "EH Bildu",
    "JXCAT": "JUNTS",
}

# ── Nueva arquitectura simplificada: 8 secciones principales ─────────────────
# Cada sección es una mega-página con múltiples tabs internos.
# Las 27 páginas heredadas siguen accesibles desde cada sección.

SIDEBAR_CORE_LINKS: list[tuple[str, str]] = [
    # ── Módulos del Diseño (D-series) ────────────────────────────────────────
    ("pages/D1_Briefings.py",       "  Briefings"),
    ("pages/D2_Actores.py",         "  Mapa de Actores"),
    ("pages/D3_Termometro.py",      "  Termómetro de Riesgo"),
    ("pages/D4_Legislativo.py",     "  Monitor Legislativo"),
    ("pages/D5_Coalicion.py",       "  Gobierno & Coalición"),
    ("pages/D6_Alertas.py",         "  Alertas"),
    ("pages/D7_Medios.py",          "  Medios & Narrativa"),
    ("pages/D8_Geopolitica.py",     "  Geopolítica & RRII"),
    ("pages/D9_Communication.py",   "  Communication Intel"),
    ("pages/D10_Workspace.py",      "  Centro de Operaciones"),
    ("pages/N8_ChatIA.py",          "  Politeia Brain"),
    ("pages/N9_CommandCenter.py",   "  Command Center"),
]

# ── Módulos N-series (arquitectura anterior, siguen activos) ─────────────
SIDEBAR_N_LINKS: list[tuple[str, str]] = [
    ("pages/N0_Inicio.py",          "  Inicio"),
    ("pages/N1_Electoral.py",       "  Electoral"),
    ("pages/N2_Inteligencia.py",    "  Inteligencia"),
    ("pages/N3_Medios.py",          "  Medios (v2)"),
    ("pages/N4_Institucional.py",   "  Institucional"),
    ("pages/N5_Campana.py",         "⚔  Campaña"),
    ("pages/N6_Economia.py",        "  Economía"),
    ("pages/N7_Laboratorio.py",     "  Laboratorio"),
]

# Páginas heredadas — accesibles para compatibilidad
SIDEBAR_LEGACY_LINKS: list[tuple[str, str]] = [
    ("pages/0_Pagina_Inicial.py",       "Página inicial (v1)"),
    ("pages/1_Mapa_Electoral.py",       "Mapa Electoral"),
    ("pages/2_Nowcasting.py",           "Nowcasting"),
    ("pages/3_Escenarios.py",           "Escenarios"),
    ("pages/4_Coaliciones.py",          "Coaliciones"),
    ("pages/5_Agentes_LLM.py",          "Agentes LLM"),
    ("pages/6_Riesgo.py",               "Riesgo político"),
    ("pages/7_Validacion.py",           "Validación"),
    ("pages/8_Tiempo_Real.py",          "Tiempo real"),
    ("pages/9_Indices_Politeia.py",     "Índices"),
    ("pages/10_Prensa_Agenda.py",       "Prensa & Agenda"),
    ("pages/11_Congreso_Institucional.py", "Congreso"),
    ("pages/12_Macroeconomia.py",       "Macroeconomía"),
    ("pages/13_Briefing_Diario.py",     "Briefing diario"),
    ("pages/14_Monitor_Sentimiento.py", "Monitor sentimiento"),
    ("pages/15_Agenda_Lideres.py",      "Agenda líderes"),
    ("pages/16_Fichas_Politicos.py",    "Fichas políticos"),
    ("pages/17_Nowcasting_Component.py","Nowcasting avanzado"),
    ("pages/18_War_Room_Espana.py",     "War Room"),
    ("pages/19_Impacto_Campana.py",     "Impacto campaña"),
    ("pages/20_Monitor_Medios_RRSS.py", "Monitor RRSS"),
    ("pages/21_Opposition_Research.py", "Opposition research"),
    ("pages/22_Coordinacion_Campana.py","Coordinación campaña"),
    ("pages/23_Memoria_Institucional.py","Memoria institucional"),
    ("pages/24_Tracker_Narrativas.py",  "Tracker narrativas"),
    ("pages/25_Voto_Blando.py",         "Voto blando"),
    ("pages/26_Centro_Operaciones.py",  "Centro operaciones"),
    ("pages/27_IA_Local.py",            "IA local"),
]

# Retro-compat alias
SIDEBAR_MAIN_LINKS: list[tuple[str, str]] = [
    *SIDEBAR_CORE_LINKS,
]

PAGES_NAV: dict[str, list] = {
    "principal": SIDEBAR_CORE_LINKS,
    "legacy": SIDEBAR_LEGACY_LINKS,
}

# Vacío para que el código antiguo no explote si itera SIDEBAR_ADVANCED_GROUPS
SIDEBAR_ADVANCED_GROUPS: list[tuple[str, list[tuple[str, str]]]] = []


def _ensure_pages_bridge() -> None:
    """Garantiza que `pages/` exista en la raíz para Streamlit multipage."""
    root = _ROOT
    pages_root = root / "pages"
    dashboard_pages = root / "dashboard" / "pages"

    if not dashboard_pages.exists():
        return

    # Limpiar symlink roto.
    if pages_root.is_symlink() and not pages_root.exists():
        pages_root.unlink(missing_ok=True)

    if pages_root.exists():
        return

    try:
        pages_root.symlink_to(dashboard_pages, target_is_directory=True)
    except OSError:
        # Fallback defensivo: copia física.
        import shutil

        shutil.copytree(dashboard_pages, pages_root)


def _resolve_page_path(path: str) -> str | None:
    """Devuelve ruta relativa válida para st.page_link o None si no existe."""
    target = _ROOT / path
    if target.exists():
        return path
    # Fallback por nombre de archivo dentro de pages/
    alt = _ROOT / "pages" / Path(path).name
    if alt.exists():
        return f"pages/{Path(path).name}"
    return None


def _safe_page_link(path: str, label: str) -> None:
    """Renderiza enlaces de página sin romper toda la app por una ruta inválida."""
    resolved = _resolve_page_path(path)
    if resolved is None:
        return
    try:
        st.page_link(resolved, label=label)
    except Exception:
        # Compatibilidad defensiva: algunas combinaciones de versión/contexto
        # lanzan errores internos (p. ej. KeyError('url_pathname')) en page_link.
        # La navegación no debe romper la renderización de la página.
        return


def _render_page_links(links: list[tuple[str, str]]) -> None:
    for path, label in links:
        _safe_page_link(path, label=label)


def _badge_alertas_sidebar() -> None:
    """Muestra resumen rápido de alertas no leídas en la barra lateral."""
    try:
        from dashboard.db import cargar_alertas

        df = cargar_alertas(solo_no_leidas=True)
    except Exception:
        return

    if df.empty:
        return

    sev_col = "severidad"if "severidad"in df.columns else None
    if sev_col is None:
        return

    criticas = int((df[sev_col].astype(str).str.upper() == "CRITICAL").sum())
    warnings = int((df[sev_col].astype(str).str.upper().isin({"WARNING", "ALTA", "MEDIUM", "MEDIA"})).sum())

    if criticas > 0:
        st.markdown(
            f'<div style="background:#7f1d1d;border:1px solid {RED};border-radius:8px;'
            f'padding:0.5rem 0.75rem;margin:0.5rem 0;font-size:0.8rem;color:#fee2e2">'
            f'● <strong>{criticas} alerta{"s"if criticas != 1 else ""} crítica{"s"if criticas != 1 else ""}</strong>'
            f"</div>",
            unsafe_allow_html=True,
        )
    if warnings > 0:
        st.markdown(
            f'<div style="background:#451a03;border:1px solid {AMBER};border-radius:8px;'
            f'padding:0.5rem 0.75rem;margin:0.5rem 0;font-size:0.8rem;color:#fef3c7">'
            f'● <strong>{warnings} advertencia{"s"if warnings != 1 else ""}</strong>'
            f"</div>",
            unsafe_allow_html=True,
        )


def mostrar_alertas_pagina(pagina_id: str, max_alertas: int = 3) -> None:
    """Renderiza alertas relevantes para una página concreta."""
    try:
        from dashboard.db import cargar_alertas

        df = cargar_alertas(solo_no_leidas=True)
    except Exception:
        return

    if df.empty:
        return

    sev = df["severidad"].astype(str).str.upper() if "severidad"in df.columns else pd.Series(["INFO"] * len(df))
    if "pagina_relevante"in df.columns:
        rel = df["pagina_relevante"].fillna("").astype(str).str.strip()
        # No inyectamos todas las alertas CRITICAL en todas las páginas: eso
        # acababa mostrando seeds antiguos/estáticos como si fueran contexto vivo.
        mask = (rel == pagina_id) | ((rel.str.lower() == "global") & (sev == "CRITICAL"))
        df_pag = df[mask]
    else:
        return

    if df_pag.empty:
        return

    for _, row in df_pag.head(max_alertas).iterrows():
        severidad = str(row.get("severidad", "INFO")).upper()
        titulo = str(row.get("titulo", "Alerta"))
        descripcion = str(row.get("descripcion", ""))
        msg = f"**{titulo}** — {descripcion[:220]}"
        if severidad == "CRITICAL":
            st.error(msg, icon="")
        elif severidad in {"WARNING", "ALTA", "MEDIUM", "MEDIA"}:
            st.warning(msg)
        else:
            st.info(msg)


def ai_dashboard_insight(context_data: dict, insight_type: str = "general") -> str:
    """Genera un insight local con Politeia Brain sobre datos actuales del dashboard."""
    try:
        engine = _get_ai_engine_resource()
        if not engine.is_ollama_available():
            return ""
        return engine.reason_dashboard(context_data, insight_type=insight_type)
    except Exception:
        return ""


@st.cache_resource(show_spinner="Iniciando motor IA local...")
def _get_ai_engine_resource():
    from agents.ai_engine import AIEngine

    return AIEngine()


@st.cache_resource(show_spinner=False)
def _get_local_store_resource():
    from agents.local_intelligence import get_local_store

    return get_local_store()


def ai_dependency_status() -> dict[str, str]:
    """Health check visible para diagnosticar IA local desde Streamlit."""
    status: dict[str, str] = {}
    try:
        import chromadb  # noqa: F401

        status["chromadb"] = "ok"
    except Exception as exc:
        status["chromadb"] = f"missing: {exc}"
    try:
        import sentence_transformers  # noqa: F401

        status["sentence_transformers"] = "ok"
    except Exception as exc:
        status["sentence_transformers"] = f"missing: {exc}"
    try:
        import spacy  # type: ignore

        if any(spacy.util.is_package(model) for model in ("es_core_news_lg", "es_core_news_md", "es_core_news_sm")):
            status["spacy_es"] = "ok"
        else:
            status["spacy_es"] = "missing model"
    except Exception as exc:
        status["spacy_es"] = f"missing: {exc}"
    try:
        status["engine"] = str(_get_ai_engine_resource().status())
    except Exception as exc:
        status["engine"] = f"error: {exc}"
    return status


def render_ai_insight_card(context_data: dict, insight_type: str = "general", *, button_label: str = "Analizar con IA") -> None:
    """Renderiza un botón de insight IA reutilizable para cualquier página."""
    if st.button(button_label, use_container_width=True):
        with st.spinner("Politeia Brain razonando..."):
            insight = ai_dashboard_insight(context_data, insight_type)
        if insight:
            st.info(insight)
        else:
            st.warning("IA local no disponible. Revisa Ollama y la página Cerebro Ollama.")


def render_sidebar_ai_chatbot() -> None:
    """Chat compacto en sidebar para razonar sobre el dashboard desde cualquier página."""
    with st.expander("  Analista IA", expanded=False):
        try:
            engine = _get_ai_engine_resource()
            store = _get_local_store_resource()
            status = engine.status()
            color = GREEN if status.get("ollama") else AMBER
            st.caption(
                f"Modelo: {status.get('model')} · Vectores: {status.get('vector_count')} · "
                f"{'Ollama activo'if status.get('ollama') else 'Ollama offline'}"
            )
            question = st.text_area(
                "Pregunta al cerebro local",
                key="sidebar_ai_question",
                height=90,
                placeholder="¿Qué está pasando en el dashboard y qué debería revisar?",
            )
            use_context = st.checkbox("Usar memoria semántica", value=True, key="sidebar_ai_semantic")
            if st.button("Razonar", key="sidebar_ai_run", use_container_width=True):
                if not question.strip():
                    st.warning("Escribe una pregunta.")
                else:
                    if status.get("ollama"):
                        with st.spinner("Recuperando memoria local..."):
                            streamed = store.chat(
                                question,
                                k=5,
                                use_llm=True,
                                allow_tools=True,
                                stream=True,
                                use_semantic=use_context,
                            )
                        if hasattr(streamed, "answer"):
                            response = streamed.answer
                            st.markdown(response)
                            st.caption(f"{streamed.model} · evidencias: {len(streamed.citations)}")
                        else:
                            response = st.write_stream(streamed)
                            st.caption(f"{status.get('model')} · streaming Ollama")
                    else:
                        with st.spinner("Consultando memoria local..."):
                            result = store.chat(
                                question,
                                k=5,
                                use_llm=False,
                                allow_tools=True,
                                use_semantic=use_context,
                            )
                        response = result.answer
                        st.markdown(response)
                        st.caption(f"{result.model} · evidencias: {len(result.citations)}")
                    st.session_state.setdefault("sidebar_ai_history", []).append(
                        {"question": question, "answer": response}
                    )
            if st.session_state.get("sidebar_ai_history"):
                if st.button("Limpiar chat IA", key="sidebar_ai_clear", use_container_width=True):
                    st.session_state.sidebar_ai_history = []
                    st.rerun()
            st.markdown(
                f"<div style='height:2px;background:{color};border-radius:2px;margin-top:.6rem'></div>",
                unsafe_allow_html=True,
            )
        except Exception as exc:
            st.caption(f"IA local no disponible: {exc}")


def render_ai_chat_sidebar(store=None, page_context: dict | None = None) -> None:
    """Alias compatible para páginas que quieran invocar explícitamente el chat IA."""
    _ = store, page_context
    render_sidebar_ai_chatbot()


def _normalize_siglas(siglas: str) -> str:
    return str(siglas).strip().upper().replace(" ", "_").replace("-", "_")


def _build_party_colors() -> dict[str, str]:
    colors: dict[str, str] = {}
    for key, val in _RAW_COLORES_PARTIDOS.items():
        norm = _normalize_siglas(key)
        colors[key] = val
        colors[key.upper()] = val
        colors[norm] = val
        colors[norm.replace("_", " ")] = val
    for alias, canonical in _PARTY_ALIASES.items():
        val = _RAW_COLORES_PARTIDOS.get(canonical, CYAN)
        norm = _normalize_siglas(alias)
        colors[alias] = val
        colors[alias.upper()] = val
        colors[norm] = val
        colors[norm.replace("_", " ")] = val
    return colors


COLORES_PARTIDOS = _build_party_colors()


def color_partido(siglas: str) -> str:
    sigla_raw = str(siglas)
    sigla_norm = _normalize_siglas(sigla_raw)
    return (
        COLORES_PARTIDOS.get(sigla_raw)
        or COLORES_PARTIDOS.get(sigla_raw.upper())
        or COLORES_PARTIDOS.get(sigla_norm)
        or COLORES_PARTIDOS.get(sigla_norm.replace("_", " "))
        or CYAN
    )


def hex_to_rgba(hex_color: str, alpha: float = 1.0) -> str:
    """Convierte un color hex (#RRGGBB) a una cadena rgba() válida en Plotly.

    Plotly 6.x rechaza el formato de 8 dígitos `#RRGGBBAA`, por lo que para
    aplicar transparencia hay que construir `rgba(r,g,b,a)` explícitamente.
    Si el input no es hex válido, devuelve un rgba CYAN translúcido por defecto.
    """
    h = str(hex_color or "").lstrip("#").strip()
    a = max(0.0, min(1.0, float(alpha)))
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    if len(h) != 6:
        return f"rgba(0,212,255,{a:.2f})"
    try:
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
    except ValueError:
        return f"rgba(0,212,255,{a:.2f})"
    return f"rgba({r},{g},{b},{a:.2f})"


# ── Helpers de datos (casting seguro Decimal/float, formato macro) ───────────


def safe_numeric(df, cols):
    """Castea columnas a float para evitar TypeError por Decimal de psycopg v3.

    No muta el DataFrame de entrada; devuelve una copia con las columnas
    pedidas convertidas via `pd.to_numeric(..., errors='coerce').astype(float)`
    y NaN rellenos con 0.0.  Columnas ausentes se ignoran en silencio.
    """
    if df is None or getattr(df, "empty", True):
        return df
    out = df.copy()
    for c in cols:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors="coerce").astype(float).fillna(0.0)
    return out


def safe_float(value, default=0.0):
    """Convierte Decimal / str / None a float sin propagar TypeError."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def macro_value(
    df_macro: pd.DataFrame,
    indicador: str,
    fmt: str = ".1f",
    suffix: str = "",
    default: str = "—",
) -> str:
    """Formatea el último valor de un indicador macroeconómico.

    Blinda contra Decimal, columnas ausentes y DataFrames vacíos.
    """
    if df_macro is None or df_macro.empty or "indicador"not in df_macro.columns:
        return default
    fila = df_macro[df_macro["indicador"] == indicador]
    if fila.empty:
        return default
    val = safe_float(fila.iloc[0].get("valor"), default=float("nan"))
    if val != val:  # NaN
        return default
    try:
        return f"{val:{fmt}}{suffix}"
    except (TypeError, ValueError):
        return default


def top_partido(df_nc: pd.DataFrame) -> tuple[str, float]:
    """Devuelve (siglas, pct) del partido líder en nowcasting."""
    if df_nc is None or df_nc.empty or "estimacion_pct"not in df_nc.columns:
        return "—", 0.0
    row = df_nc.sort_values("estimacion_pct", ascending=False).iloc[0]
    return str(row.get("partido_siglas", "—")), safe_float(row.get("estimacion_pct"))


def semaforo_color(
    value: float,
    thr_ok: float,
    thr_warn: float,
    higher_is_better: bool = True,
) -> str:
    """Devuelve GREEN/AMBER/RED según un valor y sus umbrales."""
    v = safe_float(value)
    if higher_is_better:
        if v >= thr_ok:
            return GREEN
        if v >= thr_warn:
            return AMBER
        return RED
    if v <= thr_ok:
        return GREEN
    if v <= thr_warn:
        return AMBER
    return RED


def section_header(label: str, color: str | None = None) -> None:
    """Renderiza un header de sección con barra lateral + línea degradada.

    HTML en una sola línea para evitar el detector de code-block del parser
    de markdown de Streamlit (saltos + indentación lo disparan).
    """
    c = color or CYAN
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:.7rem;margin:1.2rem 0 .8rem">'
        f'<div style="width:4px;height:18px;background:linear-gradient({c},{BLUE});border-radius:2px"></div>'
        f'<span style="font-size:.66rem;font-weight:700;color:{c};'
        f'letter-spacing:.15em;text-transform:uppercase">{label}</span>'
        f'<div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>'
        f"</div>",
        unsafe_allow_html=True,
    )


def kpi_card(
    label: str,
    value: str,
    sub: str = "",
    color: str | None = None,
) -> str:
    """Devuelve el HTML de una tarjeta KPI (para usar en st.markdown).

    El HTML va en una sola línea a propósito: los saltos de línea con
    indentación disparan el detector de code-block del parser de markdown
    de Streamlit y el bloque se renderiza como texto en lugar de como tarjeta.
    """
    c = color or CYAN
    sub_html = (
        f'<div style="font-size:.62rem;color:{TEXT2};margin-top:.25rem">{sub}</div>'
        if sub
        else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
        f'border-top:2px solid {c};padding:.9rem 1rem">'
        f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;'
        f'text-transform:uppercase;color:{MUTED}">{label}</div>'
        f'<div style="font-size:1.55rem;font-weight:900;color:{c};'
        f"font-family:'JetBrains Mono',monospace;line-height:1.1;margin-top:.3rem\">{value}</div>"
        f"{sub_html}</div>"
    )


def coming_soon_card(
    titulo: str,
    descripcion: str = "",
    hitos: list[str] | None = None,
    eta: str = "",
) -> None:
    """Muestra un banner 'Próximamente'para módulos en desarrollo.

    Usar en páginas que no tienen datos ni implementación funcional aún,
    de modo que no se muestre una pantalla en blanco desde el menú.
    """
    hitos_html = ""
    if hitos:
        items = "".join(f"<li style='margin:.3rem 0;color:{TEXT2}'>{h}</li>"for h in hitos)
        hitos_html = f"<ul style='margin:.5rem 0 0 1rem;padding:0;list-style:disc'>{items}</ul>"
    eta_html = f"<div style='margin-top:.8rem;font-size:.8rem;color:{MUTED}'>ETA estimado: {eta}</div>"if eta else ""
    st.markdown(
        f"""
        <div style="
            border:1px solid {BORDER};border-left:4px solid {CYAN};
            border-radius:14px;padding:2rem 2.2rem;margin:2rem 0;
            background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);
            max-width:680px;
        ">
            <div style="font-size:1.6rem;margin-bottom:.4rem"></div>
            <div style="font-size:1.35rem;font-weight:800;color:{TEXT};margin-bottom:.4rem">{titulo}</div>
            {""if not descripcion else f'<div style="color:{TEXT2};font-size:.95rem;margin-bottom:.6rem">{descripcion}</div>'}
            {hitos_html}
            {eta_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def aplicar_estilos():
    """Inyecta el tema dark/tech global en todas las páginas.

    CSS custom properties en :root permiten cambiar el color primario editando
    una sola línea aquí, en lugar de editar los 20+ ficheros de páginas.
    Las constantes Python (BG, CYAN, etc.) se mantienen para código Python;
    el CSS usa var(--ep-*) para componentes HTML inline.
    """
    st.markdown(f"""
    <style>
    /* ── Design tokens como CSS custom properties ─────────────────── */
    /* Edita aquí para cambiar el tema global. Refs: var(--ep-*) en HTML inline */
    :root {{
        --ep-bg:        {BG};
        --ep-bg2:       {BG2};
        --ep-bg3:       {BG3};
        --ep-border:    {BORDER};
        --ep-cyan:      {CYAN};
        --ep-cyan2:     {CYAN2};
        --ep-blue:      {BLUE};
        --ep-purple:    {PURPLE};
        --ep-text:      {TEXT};
        --ep-text2:     {TEXT2};
        --ep-muted:     {MUTED};
        --ep-green:     {GREEN};
        --ep-amber:     {AMBER};
        --ep-red:       {RED};
    }}

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

    /* ── Reset y base ─────────────────────────────────────────────── */
    [data-testid="stSidebarNav"] {{ display: none !important; }}

    html, body, .stApp, .main {{
        background: var(--ep-bg) !important;
        color: {TEXT};
        font-family: 'Inter', system-ui, sans-serif;
    }}
    .main .block-container {{
        background: {BG} !important;
        padding-top: 1.5rem;
    }}

    /* ── Sidebar ──────────────────────────────────────────────────── */
    [data-testid="stSidebar"] {{
        background: linear-gradient(180deg, {BG2} 0%, #0A0F1C 100%) !important;
        border-right: 1px solid {BORDER} !important;
        min-width: 220px !important;
    }}
    [data-testid="stSidebar"] * {{
        color: {TEXT2} !important;
    }}
    /* Página-link principal (8 módulos) */
    [data-testid="stSidebar"] a[data-testid="stPageLink-NavLink"] {{
        border-radius: 8px !important;
        padding: .55rem .75rem !important;
        margin: .15rem 0 !important;
        font-size: .82rem !important;
        font-weight: 600 !important;
        letter-spacing: .02em !important;
        transition: all .18s ease !important;
        border: 1px solid transparent !important;
        display: flex !important;
        align-items: center !important;
        gap: .5rem !important;
    }}
    [data-testid="stSidebar"] a[data-testid="stPageLink-NavLink"]:hover {{
        background: {CYAN}15 !important;
        color: {CYAN} !important;
        border-color: {CYAN}33 !important;
        box-shadow: 0 0 12px {CYAN}15 !important;
    }}
    [data-testid="stSidebar"] a[data-testid="stPageLink-NavLink"][aria-current="page"],
    [data-testid="stSidebar"] a[data-testid="stPageLink-NavLink"].active {{
        background: linear-gradient(135deg, {CYAN}20, {BLUE}18) !important;
        color: {CYAN} !important;
        border-color: {CYAN}44 !important;
        box-shadow: 0 0 16px {CYAN}20 !important;
    }}

    /* ── Metrics ──────────────────────────────────────────────────── */
    [data-testid="stMetric"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-top: 2px solid {CYAN}55 !important;
        border-radius: 10px !important;
        padding: 1rem 1.2rem !important;
        transition: border-color .2s ease, box-shadow .2s ease;
    }}
    [data-testid="stMetric"]:hover {{
        border-top-color: {CYAN} !important;
        box-shadow: 0 0 16px {CYAN}22 !important;
    }}
    [data-testid="stMetricLabel"] {{
        color: {MUTED} !important;
        font-size: clamp(.75rem, .72rem + .12vw, .84rem) !important;
        font-weight: 700 !important;
        letter-spacing: .08em !important;
        text-transform: uppercase !important;
    }}
    [data-testid="stMetricValue"] {{
        color: {TEXT} !important;
        font-size: 1.55rem !important;
        font-weight: 800 !important;
        font-family: 'JetBrains Mono', monospace !important;
    }}
    [data-testid="stMetricDelta"] {{
        font-size: clamp(.75rem, .72rem + .12vw, .84rem) !important;
        font-weight: 600 !important;
    }}

    /* ── Divider ──────────────────────────────────────────────────── */
    hr {{
        border: none !important;
        border-top: 1px solid {BORDER} !important;
        margin: 1.2rem 0 !important;
    }}

    /* ── Buttons ──────────────────────────────────────────────────── */
    .stButton button {{
        background: linear-gradient(135deg, {CYAN}22, {BLUE}33) !important;
        color: {CYAN} !important;
        border: 1px solid {CYAN}55 !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: .82rem !important;
        letter-spacing: .04em !important;
        transition: all .2s ease !important;
    }}
    .stButton button:hover {{
        background: {CYAN}33 !important;
        border-color: {CYAN} !important;
        box-shadow: 0 0 12px {CYAN}44 !important;
    }}

    /* ── Inputs / Selects ─────────────────────────────────────────── */
    [data-testid="stSelectbox"] > div,
    [data-testid="stMultiSelect"] > div,
    [data-testid="stTextInput"] > div,
    [data-testid="stNumberInput"] > div,
    [data-testid="stDateInput"] > div,
    [data-testid="stTimeInput"] > div,
    [data-testid="stTextArea"] > div,
    [data-testid="stFileUploader"] > div,
    .stSelectbox [data-baseweb="select"] > div,
    .stMultiSelect [data-baseweb="select"] > div {{
        background: {BG2} !important;
        border-color: {BORDER} !important;
        color: {TEXT} !important;
        border-radius: 8px !important;
    }}
    /* Inputs internos (el <input> real) */
    [data-testid="stSelectbox"] input,
    [data-testid="stMultiSelect"] input,
    [data-testid="stTextInput"] input,
    [data-testid="stNumberInput"] input,
    [data-testid="stDateInput"] input,
    [data-testid="stTimeInput"] input,
    [data-testid="stTextArea"] textarea {{
        background: {BG2} !important;
        color: {TEXT} !important;
        caret-color: {CYAN} !important;
    }}
    /* Valor seleccionado dentro del BaseWeb select */
    [data-baseweb="select"] span,
    [data-baseweb="select"] div[title] {{
        color: {TEXT} !important;
    }}
    /* Tags de MultiSelect */
    [data-baseweb="tag"] {{
        background: {BG3} !important;
        color: {TEXT} !important;
        border: 1px solid {BORDER} !important;
    }}
    [data-baseweb="tag"] [role="button"] {{
        color: {TEXT2} !important;
    }}

    /* ── Popovers / menús desplegables (BaseWeb) ──────────────────── */
    [data-baseweb="popover"],
    [data-baseweb="menu"],
    [data-baseweb="calendar"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        color: {TEXT} !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.55) !important;
    }}
    [data-baseweb="popover"] [role="listbox"],
    [data-baseweb="menu"] ul,
    [data-baseweb="select-dropdown"] {{
        background: {BG2} !important;
        color: {TEXT} !important;
    }}
    [data-baseweb="popover"] li,
    [data-baseweb="menu"] li,
    [data-baseweb="popover"] [role="option"] {{
        background: {BG2} !important;
        color: {TEXT} !important;
    }}
    [data-baseweb="popover"] li:hover,
    [data-baseweb="menu"] li:hover,
    [data-baseweb="popover"] [role="option"]:hover,
    [data-baseweb="popover"] [aria-selected="true"] {{
        background: {CYAN}1A !important;
        color: {CYAN} !important;
    }}
    /* Calendar (stDateInput) */
    [data-baseweb="calendar"] * {{ color: {TEXT} !important; }}
    [data-baseweb="calendar"] [aria-selected="true"] {{
        background: {CYAN}33 !important;
        color: {CYAN} !important;
    }}
    [data-baseweb="calendar"] button:hover {{
        background: {CYAN}22 !important;
    }}

    /* ── Radio / Checkbox ─────────────────────────────────────────── */
    [data-testid="stRadio"] label,
    [data-testid="stCheckbox"] label,
    .stRadio label, .stCheckbox label {{
        color: {TEXT2} !important;
    }}
    [data-testid="stRadio"] [role="radiogroup"] {{
        background: transparent !important;
    }}

    /* ── Slider ───────────────────────────────────────────────────── */
    .stSlider [data-testid="stSlider"] {{
        color: {CYAN} !important;
    }}
    [data-baseweb="slider"] [role="slider"] {{
        background: {CYAN} !important;
        border: 2px solid {BG} !important;
    }}
    [data-baseweb="slider"] div[data-testid="stTickBarMin"],
    [data-baseweb="slider"] div[data-testid="stTickBarMax"] {{
        color: {MUTED} !important;
    }}

    /* ── Dataframe (st.dataframe / st.data_editor) ────────────────── */
    .stDataFrame, [data-testid="stDataFrame"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 10px !important;
    }}
    /* Glide Data Grid: Streamlit expone CSS vars para el canvas.
       Sobrescribir aquí pinta celdas, cabeceras y fondos internos. */
    [data-testid="stDataFrame"],
    [data-testid="stDataFrameResizable"],
    .stDataFrame > div {{
        --gdg-bg-cell: {BG2};
        --gdg-bg-cell-medium: {BG3};
        --gdg-bg-header: {BG3};
        --gdg-bg-header-has-focus: {CYAN}22;
        --gdg-bg-header-hovered: {BG3};
        --gdg-bg-bubble: {BG3};
        --gdg-bg-bubble-selected: {CYAN}33;
        --gdg-bg-search-result: {CYAN}22;
        --gdg-border-color: {BORDER};
        --gdg-drilldown-border: {BORDER};
        --gdg-horizontal-border-color: {BORDER};
        --gdg-text-dark: {TEXT};
        --gdg-text-medium: {TEXT2};
        --gdg-text-light: {MUTED};
        --gdg-text-bubble: {TEXT};
        --gdg-text-header: {TEXT};
        --gdg-text-header-selected: {CYAN};
        --gdg-accent-color: {CYAN};
        --gdg-accent-fg: {BG};
        --gdg-accent-light: {CYAN}22;
        --gdg-link-color: {CYAN};
        --gdg-cell-horizontal-padding: 10px;
        --gdg-cell-vertical-padding: 6px;
    }}
    /* st.table clásica */
    .stTable, [data-testid="stTable"] table {{
        background: {BG2} !important;
        color: {TEXT} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 10px !important;
    }}
    [data-testid="stTable"] thead tr th {{
        background: {BG3} !important;
        color: {TEXT} !important;
        border-bottom: 1px solid {BORDER} !important;
    }}
    [data-testid="stTable"] tbody tr td {{
        background: {BG2} !important;
        color: {TEXT2} !important;
        border-bottom: 1px solid {BORDER} !important;
    }}
    [data-testid="stTable"] tbody tr:hover td {{
        background: {CYAN}0E !important;
    }}

    /* ── Info / warnings ──────────────────────────────────────────── */
    .stAlert {{
        background: {BG2} !important;
        border-color: {BORDER} !important;
        color: {TEXT2} !important;
        border-radius: 8px !important;
    }}

    /* ── Tabs ─────────────────────────────────────────────────── */
    [data-testid="stTabs"] [data-baseweb="tab-list"] {{
        background: {BG2} !important;
        border-bottom: 1px solid {BORDER} !important;
        border-radius: 10px 10px 0 0 !important;
        gap: .3rem !important;
        padding: .35rem .4rem 0 !important;
    }}
    [data-testid="stTabs"] [data-baseweb="tab"] {{
        background: {BG3} !important;
        color: {TEXT2} !important;
        border: 1px solid {BORDER} !important;
        border-bottom: none !important;
        border-radius: 8px 8px 0 0 !important;
        font-weight: 600 !important;
        font-size: .78rem !important;
        letter-spacing: .05em !important;
        padding: .45rem 1.1rem !important;
        transition: background .18s ease, color .18s ease, border-color .18s ease !important;
    }}
    [data-testid="stTabs"] [data-baseweb="tab"]:hover {{
        background: {CYAN}0F !important;
        color: {CYAN} !important;
        border-color: {CYAN}44 !important;
    }}
    [data-testid="stTabs"] [aria-selected="true"] {{
        background: linear-gradient(180deg,{CYAN}1A,{BG2}) !important;
        color: {CYAN} !important;
        border-color: {CYAN}66 !important;
        border-bottom: 1px solid {BG2} !important;
    }}

    /* ── Expander ─────────────────────────────────────────────────── */
    [data-testid="stExpander"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 8px !important;
    }}

    /* ── Caption / misc text ──────────────────────────────────────── */
    .stCaption {{ color: {MUTED} !important; }}
    p, li {{ color: {TEXT2}; }}
    h1, h2, h3 {{ color: {TEXT}; }}

    /* ── Scrollbar ────────────────────────────────────────────────── */
    * {{
        scrollbar-width: thin;
        scrollbar-color: {BORDER} {BG};
    }}
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: {BG}; }}
    ::-webkit-scrollbar-thumb {{ background: {BORDER}; border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: {CYAN}55; }}
    </style>
    """, unsafe_allow_html=True)


def sidebar_nav():
    """Renderiza la barra lateral personalizada con tema dark/tech."""
    _ensure_pages_bridge()
    aplicar_estilos()
    with st.sidebar:
        try:
            from dashboard.services.cliente_context import selector_cliente_sidebar

            selector_cliente_sidebar()
        except Exception:
            pass

        # Logo / header
        st.markdown(f"""
        <div style="padding:1.4rem 1rem 1rem;border-bottom:1px solid {BORDER};margin-bottom:.8rem">
            <div style="display:flex;align-items:center;gap:.6rem">
                <div style="width:32px;height:32px;border-radius:8px;overflow:hidden;flex-shrink:0;
                            box-shadow:0 2px 8px rgba(0,0,0,0.35)">
                  <svg viewBox="0 0 100 100"xmlns="http://www.w3.org/2000/svg"style="width:100%;height:100%;display:block">
                    <rect width="100"height="100"rx="0"fill="#F0A214"/>
                    <circle cx="22"cy="28"r="13"stroke="#1B3FA8"stroke-width="5"fill="none"/>
                    <circle cx="22"cy="28"r="5.5"fill="#F0A214"/>
                    <circle cx="22"cy="28"r="5.5"stroke="#1B3FA8"stroke-width="2.5"fill="none"/>
                    <circle cx="22"cy="28"r="2.2"fill="#1B3FA8"/>
                    <circle cx="78"cy="28"r="13"stroke="#1B3FA8"stroke-width="5"fill="none"/>
                    <circle cx="78"cy="28"r="5.5"fill="#F0A214"/>
                    <circle cx="78"cy="28"r="5.5"stroke="#1B3FA8"stroke-width="2.5"fill="none"/>
                    <circle cx="78"cy="28"r="2.2"fill="#1B3FA8"/>
                    <rect x="21"y="24"width="58"height="8"fill="#1B3FA8"/>
                    <rect x="8"y="37"width="84"height="10"rx="2"fill="#1B3FA8"/>
                    <rect x="14"y="58"width="19"height="30"rx="3"fill="#1B3FA8"/>
                    <rect x="40"y="50"width="19"height="38"rx="3"fill="#1B3FA8"/>
                    <rect x="66"y="43"width="19"height="45"rx="3"fill="#1B3FA8"/>
                  </svg>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:800;color:{TEXT};letter-spacing:-.01em;line-height:1.1">ElectSim</div>
                    <div style="font-size:.6rem;font-weight:600;letter-spacing:.14em;color:{MUTED};
                                text-transform:uppercase">Politeia · v2.0</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # ── IA Brain status chip — con estado de ingesta automática ─────────────
        try:
            from dashboard.services.llm_local import disponible as _llm_disp
            _s = _llm_disp()
            _brain_on = _s.get("brain", False)
            _model_name = "politeia-brain"if _brain_on else ("qwen2.5"if _s.get("general") else "sin IA")
            _brain_color = GREEN if _brain_on else (AMBER if _s.get("ollama") else MUTED)
            _ollama_on = bool(_s.get("ollama"))
        except Exception:
            _brain_on = False
            _model_name = "sin IA"
            _brain_color = MUTED
            _ollama_on = False

        # Worker de ingesta automática
        _worker_active = False
        _total_docs = 0
        try:
            from dashboard.services import brain_auto_ingestion as _ing
            _ing_est = _ing.estado_worker()
            _worker_active = _ing_est.get("running", False)
            _total_docs = _ing_est.get("total_indexado", 0)
            # Auto-arrancar si Ollama está disponible y worker no corre
            if _ollama_on and not _worker_active:
                _ing.iniciar_worker()
                _worker_active = True
        except Exception:
            pass

        _worker_badge = (
            f'<span style="font-size:.62rem;color:{GREEN};margin-left:auto;"> {_total_docs}</span>'
            if _worker_active else
            f'<span style="font-size:.62rem;color:{MUTED};margin-left:auto;">⏸ pausado</span>'
        )

        st.markdown(
            f'<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;'
            f'background:{_brain_color}11;border:1px solid {_brain_color}33;'
            f'border-radius:8px;margin:.4rem 0 .8rem">'
            f'<span style="width:7px;height:7px;border-radius:50%;background:{_brain_color};'
            f'display:inline-block;box-shadow:0 0 6px {_brain_color}"></span>'
            f'<span style="font-size:.68rem;color:{_brain_color};font-weight:700">'
            f' {_model_name}</span>'
            f'{_worker_badge}'
            f'</div>',
            unsafe_allow_html=True,
        )

        render_sidebar_ai_chatbot()

        st.markdown(
            f'<div style="font-size:.55rem;color:{MUTED};font-weight:800;'
            f'letter-spacing:.14em;text-transform:uppercase;margin:.4rem .2rem .4rem;'
            f'padding-left:.2rem">Módulos Politeia</div>',
            unsafe_allow_html=True,
        )

        # Módulos D-series (diseño oficial)
        _render_page_links(SIDEBAR_CORE_LINKS)

        st.markdown(f'<div style="height:1px;background:{BORDER};margin:.8rem 0"></div>',
                    unsafe_allow_html=True)

        # Módulos N-series en expander
        with st.expander("  Módulos v2 (análisis)", expanded=False):
            _render_page_links(SIDEBAR_N_LINKS)

        # Páginas heredadas en expander colapsado
        with st.expander("  Clásicos (v1)", expanded=False):
            st.markdown(
                f'<div style="font-size:.7rem;color:{MUTED};margin-bottom:.5rem">'
                f'Páginas individuales</div>',
                unsafe_allow_html=True,
            )
            _render_page_links(SIDEBAR_LEGACY_LINKS)

        _badge_alertas_sidebar()

        # Footer
        dot_color = CYAN
        status_text = "SISTEMA ACTIVO"
        extra_text = "DATOS EN TIEMPO REAL"
        try:
            from dashboard.db import cargar_alertas

            alertas = cargar_alertas(solo_no_leidas=True, limit=1)
            if alertas.empty:
                status_text = "SIN ALERTAS ABIERTAS"
            else:
                sev = str(alertas.iloc[0].get("severidad", "")).upper()
                if sev in {"CRITICAL", "ALTA", "HIGH"}:
                    dot_color = RED
                    status_text = "ALERTA ACTIVA"
                    extra_text = "REVISAR PANEL DE ALERTAS"
                elif sev in {"MEDIA", "MEDIUM", "WARNING"}:
                    dot_color = AMBER
                    status_text = "SEGUIMIENTO ACTIVO"
        except Exception:
            dot_color = MUTED
            status_text = "ESTADO NO DISPONIBLE"
            extra_text = "SINCRONIZACIÓN PENDIENTE"

        st.markdown(f"""
        <div style="border-top:1px solid {BORDER};margin-top:1.2rem;padding:1rem .5rem .5rem;
                    font-size:.62rem;color:{MUTED};text-align:center;letter-spacing:.06em">
            <span style="color:{dot_color}">●</span> {status_text} &nbsp;·&nbsp; {extra_text}
        </div>
        """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PREMIUM COMPONENTS — Palantir-grade visual language
# ══════════════════════════════════════════════════════════════════════════════

# ── Plotly dark theme ─────────────────────────────────────────────────────────
PLOTLY_THEME: dict = {
    "layout": {
        "paper_bgcolor": BG2,
        "plot_bgcolor": BG,
        "font": {"family": "Inter, system-ui, sans-serif", "color": TEXT2, "size": 12},
        "xaxis": {"gridcolor": BORDER, "linecolor": BORDER, "tickfont": {"color": MUTED}},
        "yaxis": {"gridcolor": BORDER, "linecolor": BORDER, "tickfont": {"color": MUTED}},
        "colorway": [CYAN, BLUE, PURPLE, GREEN, AMBER, RED],
        "hoverlabel": {"bgcolor": BG3, "bordercolor": BORDER, "font": {"color": TEXT, "size": 13}},
        "margin": {"l": 40, "r": 20, "t": 40, "b": 40},
        "legend": {"bgcolor": BG2, "bordercolor": BORDER, "font": {"color": TEXT2}},
    }
}


def apply_plotly_theme(fig):
    """Apply the premium dark PLOTLY_THEME to any plotly figure and return it."""
    fig.update_layout(**PLOTLY_THEME["layout"])
    return fig


def metric_delta_card(label: str, value: str, delta: str, delta_pct: str, color: str, sub: str) -> str:
    """Premium KPI card with colored delta arrow and percentage. Returns HTML string."""
    arrow = "&#9650;" if not delta.startswith("-") else "&#9660;"
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {color};'
        f'border-radius:8px;padding:1rem 1.2rem;min-width:140px;flex:1;">'
        f'<div style="font-size:.65rem;color:{MUTED};letter-spacing:.1em;text-transform:uppercase;margin-bottom:.4rem">{label}</div>'
        f'<div style="font-size:1.75rem;font-weight:700;color:{TEXT};line-height:1;letter-spacing:-.02em">{value}</div>'
        f'<div style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem">'
        f'<span style="color:{color};font-size:.85rem;font-weight:600">{arrow} {delta}</span>'
        f'<span style="background:{color}22;color:{color};font-size:.65rem;font-weight:600;padding:.1rem .4rem;border-radius:4px">{delta_pct}</span>'
        f'</div>'
        f'<div style="font-size:.65rem;color:{MUTED};margin-top:.3rem">{sub}</div>'
        f'</div>'
    )


def signal_card(title: str, body: str, level: str, source: str, time_ago: str) -> str:
    """Intel signal card with severity color border. Returns HTML string."""
    _level_map = {"critical": RED, "high": AMBER, "medium": BLUE, "low": GREEN, "info": CYAN}
    border_color = _level_map.get(level.lower(), MUTED)
    level_label = level.upper()
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {border_color};'
        f'border-radius:8px;padding:1rem 1.2rem;margin-bottom:.6rem;position:relative;">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
        f'<span style="font-size:.85rem;font-weight:600;color:{TEXT};flex:1;padding-right:.5rem">{title}</span>'
        f'<span style="background:{border_color}22;color:{border_color};font-size:.6rem;font-weight:700;'
        f'padding:.2rem .5rem;border-radius:4px;letter-spacing:.08em;white-space:nowrap">{level_label}</span>'
        f'</div>'
        f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.5;margin-bottom:.6rem">{body}</div>'
        f'<div style="display:flex;justify-content:space-between;align-items:center">'
        f'<span style="font-size:.65rem;color:{MUTED}">{source}</span>'
        f'<span style="font-size:.65rem;color:{MUTED}">{time_ago}</span>'
        f'</div>'
        f'</div>'
    )


def news_card(title: str, source: str, sentiment: str, time_ago: str, url: str, snippet: str) -> str:
    """Premium news card with sentiment badge. Returns HTML string."""
    _sent_map = {"positivo": GREEN, "negativo": RED, "neutral": MUTED, "mixto": AMBER}
    sent_color = _sent_map.get(sentiment.lower(), MUTED)
    href = f'href="{url}" target="_blank"' if url else ""
    link_open = f'<a {href} style="text-decoration:none;">' if url else "<span>"
    link_close = "</a>" if url else "</span>"
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:.9rem 1.1rem;margin-bottom:.5rem;">'
        f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem">'
        f'<span style="font-size:.65rem;color:{CYAN};font-weight:600;letter-spacing:.06em;text-transform:uppercase">{source}</span>'
        f'<div style="display:flex;align-items:center;gap:.4rem">'
        f'<span style="background:{sent_color}22;color:{sent_color};font-size:.6rem;font-weight:700;padding:.15rem .45rem;border-radius:4px;letter-spacing:.06em">{sentiment.upper()}</span>'
        f'<span style="font-size:.62rem;color:{MUTED}">{time_ago}</span>'
        f'</div>'
        f'</div>'
        f'{link_open}<div style="font-size:.85rem;font-weight:600;color:{TEXT};line-height:1.35;margin-bottom:.35rem">{title}</div>{link_close}'
        f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.45;border-top:1px solid {BORDER};padding-top:.35rem">{snippet}</div>'
        f'</div>'
    )


def actor_badge(name: str, party: str, score: float, trend: str) -> str:
    """Compact actor intelligence badge. Returns HTML string."""
    trend_color = GREEN if trend == "up" else (RED if trend == "down" else MUTED)
    trend_icon = "&#9650;" if trend == "up" else ("&#9660;" if trend == "down" else "&#8212;"
    )
    score_pct = int(round(score * 100))
    bar_color = GREEN if score >= 0.7 else (AMBER if score >= 0.4 else RED)
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:.75rem 1rem;display:flex;align-items:center;gap:.9rem;margin-bottom:.4rem;">'
        f'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,{CYAN}33,{BLUE}33);'
        f'border:2px solid {CYAN}55;display:flex;align-items:center;justify-content:center;'
        f'font-size:.8rem;font-weight:700;color:{CYAN};flex-shrink:0">{name[0].upper()}</div>'
        f'<div style="flex:1;min-width:0">'
        f'<div style="font-size:.82rem;font-weight:600;color:{TEXT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</div>'
        f'<div style="font-size:.65rem;color:{MUTED};margin-top:.1rem">{party}</div>'
        f'<div style="height:3px;background:{BORDER};border-radius:2px;margin-top:.4rem">'
        f'<div style="height:3px;width:{score_pct}%;background:{bar_color};border-radius:2px;transition:width .4s ease"></div>'
        f'</div>'
        f'</div>'
        f'<div style="text-align:right;flex-shrink:0">'
        f'<div style="font-size:1rem;font-weight:700;color:{TEXT}">{score_pct}</div>'
        f'<div style="font-size:.7rem;color:{trend_color};font-weight:600">{trend_icon}</div>'
        f'</div>'
        f'</div>'
    )


def confidence_badge(score: float) -> str:
    """Small pill showing confidence level (0.0-1.0). Returns HTML string."""
    pct = int(round(score * 100))
    color = GREEN if score >= 0.75 else (AMBER if score >= 0.5 else RED)
    label = "ALTA" if score >= 0.75 else ("MEDIA" if score >= 0.5 else "BAJA")
    return (
        f'<span style="display:inline-flex;align-items:center;gap:.3rem;background:{color}18;'
        f'border:1px solid {color}44;border-radius:20px;padding:.15rem .6rem;font-size:.62rem;font-weight:700;color:{color};letter-spacing:.06em">'
        f'<span style="width:6px;height:6px;border-radius:50%;background:{color};display:inline-block"></span>'
        f'CONF. {label} {pct}%'
        f'</span>'
    )


def risk_matrix_html(risks: list[dict]) -> str:
    """2x2 likelihood/impact risk matrix rendered as HTML. Returns HTML string.

    Each risk dict: {label: str, likelihood: float 0-1, impact: float 0-1, color: str (optional)}
    """
    cells = {(0, 0): [], (0, 1): [], (1, 0): [], (1, 1): []}
    for r in risks:
        lk = 1 if r.get("likelihood", 0.5) >= 0.5 else 0
        im = 1 if r.get("impact", 0.5) >= 0.5 else 0
        cells[(lk, im)].append(r)

    def _cell_bg(lk: int, im: int) -> str:
        if lk == 1 and im == 1:
            return f"{RED}18"
        if lk == 1 and im == 0:
            return f"{AMBER}14"
        if lk == 0 and im == 1:
            return f"{AMBER}14"
        return f"{GREEN}10"

    def _render_items(items: list[dict]) -> str:
        if not items:
            return f'<span style="color:{MUTED};font-size:.62rem">—</span>'
        parts = []
        for it in items:
            c = it.get("color", CYAN)
            parts.append(
                f'<span style="background:{c}22;color:{c};font-size:.6rem;font-weight:600;'
                f'padding:.1rem .35rem;border-radius:4px;display:inline-block;margin:.1rem .1rem 0 0">{it["label"]}</span>'
            )
        return "".join(parts)

    grid_style = (
        f'display:grid;grid-template-columns:1fr 1fr;gap:4px;'
        f'background:{BORDER};border-radius:8px;overflow:hidden;'
        f'border:1px solid {BORDER}'
    )
    header_row = (
        f'<div style="display:grid;grid-template-columns:80px 1fr 1fr;gap:4px;margin-bottom:4px">'
        f'<div></div>'
        f'<div style="text-align:center;font-size:.62rem;color:{MUTED};letter-spacing:.08em">IMPACTO BAJO</div>'
        f'<div style="text-align:center;font-size:.62rem;color:{MUTED};letter-spacing:.08em">IMPACTO ALTO</div>'
        f'</div>'
    )
    rows_html = ""
    for lk_label, lk_val in [("PROB. ALTA", 1), ("PROB. BAJA", 0)]:
        rows_html += (
            f'<div style="display:grid;grid-template-columns:80px 1fr 1fr;gap:4px;margin-bottom:4px">'
            f'<div style="display:flex;align-items:center;justify-content:flex-end;padding-right:6px;'
            f'font-size:.6rem;color:{MUTED};letter-spacing:.07em;text-align:right">{lk_label}</div>'
        )
        for im_val in [0, 1]:
            bg = _cell_bg(lk_val, im_val)
            rows_html += (
                f'<div style="background:{bg};border-radius:6px;padding:.5rem .6rem;min-height:54px">'
                f'{_render_items(cells[(lk_val, im_val)])}'
                f'</div>'
            )
        rows_html += "</div>"

    return (
        f'<div style="font-size:.65rem;color:{MUTED};letter-spacing:.08em;margin-bottom:.4rem">MATRIZ DE RIESGOS</div>'
        f'{header_row}'
        f'{rows_html}'
    )


def scrolling_ticker(items: list[str]) -> None:
    """Renders a CSS-animated scrolling news ticker in Streamlit."""
    if not items:
        return
    separator = f'<span style="color:{CYAN};margin:0 1.2rem;font-size:.7rem">&#9679;</span>'
    content = separator.join(
        f'<span style="color:{TEXT2};font-size:.72rem;letter-spacing:.03em">{item}</span>'
        for item in items
    )
    doubled = content + separator + content
    html = (
        f'<style>'
        f'@keyframes marquee-scroll {{from {{transform:translateX(0)}} to {{transform:translateX(-50%)}}}}'
        f'.ticker-wrap {{background:{BG2};border-top:1px solid {BORDER};border-bottom:1px solid {BORDER};'
        f'overflow:hidden;width:100%;padding:.45rem 0;position:relative;}}'
        f'.ticker-label {{position:absolute;left:0;top:0;height:100%;display:flex;align-items:center;'
        f'background:linear-gradient(90deg,{BG2} 70%,{BG2}00);padding:0 1rem;z-index:2;}}'
        f'.ticker-content {{display:inline-flex;align-items:center;white-space:nowrap;'
        f'animation:marquee-scroll 90s linear infinite;}}'
        f'.ticker-content:hover {{animation-play-state:paused;}}'
        f'</style>'
        f'<div class="ticker-wrap">'
        f'<div class="ticker-label"><span style="font-size:.6rem;font-weight:700;color:{CYAN};letter-spacing:.12em">LIVE</span></div>'
        f'<div style="padding-left:4rem;overflow:hidden">'
        f'<div class="ticker-content">{doubled}</div>'
        f'</div>'
        f'</div>'
    )
    st.markdown(html, unsafe_allow_html=True)


def intel_header(title: str, subtitle: str, status: str, time_str: str) -> None:
    """Premium full-width page header with glassmorphism, live indicator, and gradient border."""
    status_color = GREEN if status.lower() in {"live", "activo", "active"} else (AMBER if status.lower() in {"pending", "pendiente", "warning"} else MUTED)
    html = (
        f'<style>'
        f'@keyframes pulse-dot {{0%,100%{{opacity:1;transform:scale(1)}}50%{{opacity:.4;transform:scale(1.4)}}}}'
        f'.intel-live-dot {{animation:pulse-dot 1.8s ease-in-out infinite;display:inline-block;'
        f'width:7px;height:7px;border-radius:50%;background:{status_color};margin-right:.4rem;vertical-align:middle;}}'
        f'</style>'
        f'<div style="background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);'
        f'border:1px solid {BORDER};border-bottom:2px solid {CYAN}44;border-radius:10px;'
        f'padding:1.2rem 1.6rem 1rem;margin-bottom:1.2rem;'
        f'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);'
        f'box-shadow:0 4px 24px {BG}cc,inset 0 1px 0 {CYAN}18;">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem">'
        f'<div>'
        f'<div style="font-size:.62rem;color:{MUTED};letter-spacing:.12em;text-transform:uppercase;margin-bottom:.3rem">'
        f'ElectSim Intelligence &nbsp;/&nbsp; <span style="color:{CYAN}">{subtitle}</span>'
        f'</div>'
        f'<h2 style="margin:0;font-size:1.4rem;font-weight:700;color:{TEXT};letter-spacing:-.02em;line-height:1.15">{title}</h2>'
        f'</div>'
        f'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.3rem">'
        f'<div style="display:flex;align-items:center;background:{status_color}18;border:1px solid {status_color}44;'
        f'border-radius:20px;padding:.25rem .7rem;gap:.2rem">'
        f'<span class="intel-live-dot"></span>'
        f'<span style="font-size:.65rem;font-weight:700;color:{status_color};letter-spacing:.08em">{status.upper()}</span>'
        f'</div>'
        f'<span style="font-size:.62rem;color:{MUTED}">{time_str}</span>'
        f'</div>'
        f'</div>'
        f'<div style="height:1px;background:linear-gradient(90deg,{CYAN}44,{BLUE}22,transparent);margin-top:.8rem"></div>'
        f'</div>'
    )
    st.markdown(html, unsafe_allow_html=True)
