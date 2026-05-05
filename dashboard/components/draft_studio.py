"""
Draft Studio — ElectSim.

Componente de redacción asistida para comunicaciones políticas.
Integra fuentes de datos vivas: encuestas, narrativas, datos legislativos.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

# ── Design tokens ──────────────────────────────────────────────────────────────
_BG2    = "#0D1320"
_BG3    = "#111827"
_BORDER = "#1E293B"
_CYAN   = "#00D4FF"
_BLUE   = "#3B82F6"
_PURPLE = "#8B5CF6"
_TEXT   = "#E2E8F0"
_TEXT2  = "#94A3B8"
_MUTED  = "#475569"
_GREEN  = "#10B981"
_AMBER  = "#F59E0B"
_RED    = "#EF4444"

# ── Modelos ────────────────────────────────────────────────────────────────────

class DraftTemplate(BaseModel):
    """Plantilla de redaccion para comunicaciones politicas."""

    id:             str
    name:           str
    description:    str
    asset_type:     str
    body_template:  str = Field(description="Plantilla con variables {{ clave }}")
    variables:      list[str] = Field(default_factory=list,
                                      description="Lista de nombres de variables disponibles")
    example_filled: str = Field(default="", description="Ejemplo con variables rellenas")


# ── Catálogo de plantillas ─────────────────────────────────────────────────────

_TEMPLATES: dict[str, DraftTemplate] = {
    "nota_prensa": DraftTemplate(
        id="nota_prensa",
        name="Nota de Prensa",
        description="Nota de prensa oficial para distribucion a medios.",
        asset_type="press_release",
        body_template=(
            "NOTA DE PRENSA\n"
            "{{ fecha }}\n\n"
            "{{ candidato }} SOBRE {{ titular }}\n\n"
            "{{ cuerpo }}\n\n"
            "DATOS CLAVE\n"
            "{{ datos_clave }}\n\n"
            "---\n"
            "Para mas informacion, contactar con el gabinete de prensa."
        ),
        variables=["candidato", "fecha", "titular", "cuerpo", "datos_clave"],
        example_filled=(
            "NOTA DE PRENSA\n"
            "5 de mayo de 2026\n\n"
            "PARTIDO EJEMPLO SOBRE REFORMA FISCAL\n\n"
            "El partido ha anunciado hoy una nueva propuesta de reforma fiscal "
            "que beneficiara a las clases medias.\n\n"
            "DATOS CLAVE\n"
            "- PP 33.2% | PSOE 28.5% — diferencia de 4.7 puntos\n"
            "- 8 iniciativas legislativas esta semana en el Congreso\n\n"
            "---\n"
            "Para mas informacion, contactar con el gabinete de prensa."
        ),
    ),

    "tuit_electoral": DraftTemplate(
        id="tuit_electoral",
        name="Tuit Electoral",
        description="Mensaje para redes sociales (maximo 280 caracteres).",
        asset_type="social_post",
        body_template=(
            "{{ partido }} lidera con {{ dato }}% segun los ultimos sondeos.\n"
            "La diferencia con el segundo partido es historica.\n"
            "#{{ hashtag }} #Elecciones2026"
        ),
        variables=["partido", "dato", "hashtag"],
        example_filled=(
            "PP lidera con 33.2% segun los ultimos sondeos.\n"
            "La diferencia con el segundo partido es historica.\n"
            "#PP #Elecciones2026"
        ),
    ),

    "declaracion_institucional": DraftTemplate(
        id="declaracion_institucional",
        name="Declaracion Institucional",
        description="Declaracion formal de posicion institucional.",
        asset_type="statement",
        body_template=(
            "DECLARACION INSTITUCIONAL\n"
            "{{ fecha }}\n\n"
            "{{ cargo }} declara:\n\n"
            "{{ declaracion }}\n\n"
            "Esta posicion se basa en los siguientes fundamentos:\n"
            "{{ fundamentos }}\n\n"
            "{{ firma }}\n"
            "{{ cargo }}\n"
            "{{ organizacion }}"
        ),
        variables=["fecha", "cargo", "declaracion", "fundamentos", "firma", "organizacion"],
        example_filled=(
            "DECLARACION INSTITUCIONAL\n"
            "5 de mayo de 2026\n\n"
            "El Portavoz declara:\n\n"
            "Nuestro grupo parlamentario rechaza la propuesta presentada hoy "
            "por considerar que no responde a los intereses de la ciudadania.\n\n"
            "Esta posicion se basa en los siguientes fundamentos:\n"
            "- Ausencia de impacto social evaluado\n"
            "- Falta de consenso con los agentes sociales\n\n"
            "Firma\n"
            "Portavoz\n"
            "Grupo Parlamentario"
        ),
    ),

    "briefing_ejecutivo": DraftTemplate(
        id="briefing_ejecutivo",
        name="Briefing Ejecutivo",
        description="Resumen ejecutivo de una pagina para la direccion.",
        asset_type="briefing",
        body_template=(
            "BRIEFING EJECUTIVO — {{ fecha }}\n"
            "CONFIDENCIAL\n\n"
            "SITUACION ACTUAL\n"
            "{{ situacion }}\n\n"
            "DATOS CLAVE\n"
            "- Encuesta PP: {{ encuesta_pp }}%\n"
            "- Encuesta PSOE: {{ encuesta_psoe }}%\n"
            "- Narrativa dominante: {{ narrativa_top }}\n"
            "- ITPE: {{ itpe }}/100\n\n"
            "RECOMENDACION\n"
            "{{ recomendacion }}\n\n"
            "PROXIMOS PASOS\n"
            "{{ proximos_pasos }}"
        ),
        variables=[
            "fecha", "situacion", "encuesta_pp", "encuesta_psoe",
            "narrativa_top", "itpe", "recomendacion", "proximos_pasos",
        ],
        example_filled=(
            "BRIEFING EJECUTIVO — 5 de mayo de 2026\n"
            "CONFIDENCIAL\n\n"
            "SITUACION ACTUAL\n"
            "El escenario electoral se mantiene estable con PP en cabeza.\n\n"
            "DATOS CLAVE\n"
            "- Encuesta PP: 33.2%\n"
            "- Encuesta PSOE: 28.5%\n"
            "- Narrativa dominante: Coste de vida\n"
            "- ITPE: 52/100\n\n"
            "RECOMENDACION\n"
            "Mantener posicionamiento en temas economicos.\n\n"
            "PROXIMOS PASOS\n"
            "1. Reunion de estrategia el lunes\n"
            "2. Rueda de prensa el miercoles"
        ),
    ),

    "mensaje_militantes": DraftTemplate(
        id="mensaje_militantes",
        name="Mensaje a Militantes",
        description="Comunicacion interna para la base del partido.",
        asset_type="internal_comms",
        body_template=(
            "Estimados militantes y simpatizantes,\n\n"
            "{{ saludo }}\n\n"
            "SITUACION POLITICA\n"
            "{{ contexto }}\n\n"
            "NUESTRO MENSAJE\n"
            "{{ mensaje_principal }}\n\n"
            "COMO PUEDES AYUDAR\n"
            "{{ llamada_accion }}\n\n"
            "Juntos somos mas fuertes.\n\n"
            "Un saludo,\n"
            "{{ firmante }}"
        ),
        variables=["saludo", "contexto", "mensaje_principal", "llamada_accion", "firmante"],
        example_filled=(
            "Estimados militantes y simpatizantes,\n\n"
            "Queremos compartir con vosotros las ultimas novedades.\n\n"
            "SITUACION POLITICA\n"
            "Las encuestas nos situan en una posicion de liderazgo claro.\n\n"
            "NUESTRO MENSAJE\n"
            "Seguimos trabajando por una Espana mas justa y cohesionada.\n\n"
            "COMO PUEDES AYUDAR\n"
            "Comparte nuestro mensaje y asiste al acto del proximo sabado.\n\n"
            "Juntos somos mas fuertes.\n\n"
            "Un saludo,\n"
            "La Direccion"
        ),
    ),
}


# ── Funciones de plantillas ────────────────────────────────────────────────────

def get_template(template_id: str) -> DraftTemplate | None:
    """Devuelve una plantilla por ID, o None si no existe."""
    return _TEMPLATES.get(template_id)


def list_templates() -> list[DraftTemplate]:
    """Devuelve la lista de todas las plantillas disponibles."""
    return list(_TEMPLATES.values())


def fill_template(template_id: str, variables: dict[str, str]) -> str:
    """
    Rellena una plantilla sustituyendo {{ clave }} por el valor correspondiente.

    Las variables que no se encuentran en `variables` se dejan como estan.
    """
    tmpl = _TEMPLATES.get(template_id)
    if tmpl is None:
        return f"[Plantilla '{template_id}' no encontrada]"

    result = tmpl.body_template
    for key, value in variables.items():
        result = result.replace(f"{{{{ {key} }}}}", str(value))
        result = result.replace(f"{{{{{key}}}}}", str(value))

    return result


# ── Paleta de datos vivos ──────────────────────────────────────────────────────

def get_live_data_palette() -> dict[str, str]:
    """
    Devuelve un diccionario con datos vivos insertables en los borradores.

    Todos los valores son strings para facilitar la insercion directa.
    """
    now = datetime.now(tz=timezone.utc)
    _MESES_ES = [
        "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    fecha_hoy = f"{now.day} de {_MESES_ES[now.month]} de {now.year}"

    # Datos electorales
    pp_pct:   float = 33.2
    psoe_pct: float = 28.5
    try:
        from dashboard.db import cargar_nowcasting  # type: ignore
        df = cargar_nowcasting()
        if df is not None and not df.empty:
            last = df.iloc[-1]
            pp_pct   = float(last.get("PP",   33.2))
            psoe_pct = float(last.get("PSOE", 28.5))
    except Exception:
        pass

    # Narrativa top
    narrativa_top = "Coste de vida"
    try:
        from services.intelligence.morning_briefing_engine import get_cached_briefing  # type: ignore
        briefing = get_cached_briefing("demo")
        if briefing:
            narratives = getattr(briefing, "active_narratives", [])
            if narratives:
                narrativa_top = str(
                    narratives[0].get("frame_label", narrativa_top)
                    if isinstance(narratives[0], dict)
                    else getattr(narratives[0], "frame_label", narrativa_top)
                )
    except Exception:
        pass

    # Alertas activas
    alerta_count = 0
    try:
        from services.intelligence.alert_engine import get_unread_count  # type: ignore
        alerta_count = get_unread_count("demo")
    except Exception:
        pass

    # ITPE
    itpe_score = "52"
    try:
        from services.intelligence.risk_scorer import get_itpe_score  # type: ignore
        itpe_score = str(int(get_itpe_score(tenant_id="demo")))
    except Exception:
        pass

    diferencia = pp_pct - psoe_pct
    diff_sign = "+" if diferencia >= 0 else ""

    return {
        "encuesta_pp":      f"{pp_pct:.1f}",
        "encuesta_psoe":    f"{psoe_pct:.1f}",
        "diferencia_pp_psoe": f"{diff_sign}{diferencia:.1f}",
        "narrativa_top":    narrativa_top,
        "alerta_activa":    str(alerta_count),
        "fecha_hoy":        fecha_hoy,
        "itpe":             itpe_score,
    }


# ── Componente Streamlit ───────────────────────────────────────────────────────

def render_draft_studio() -> None:
    """
    Renderiza el Draft Studio completo como componente Streamlit.

    Layout: dos columnas (editor | paleta de datos) + acciones debajo.
    """
    try:
        import streamlit as st
    except ImportError:
        return

    # Inicializar estado de sesion
    if "drafts" not in st.session_state:
        st.session_state["drafts"] = []
    if "draft_current_text" not in st.session_state:
        st.session_state["draft_current_text"] = ""
    if "draft_selected_template" not in st.session_state:
        st.session_state["draft_selected_template"] = "nota_prensa"

    templates = list_templates()
    template_options = {t.id: t.name for t in templates}

    col_editor, col_palette = st.columns([2, 1], gap="medium")

    # ── Columna izquierda: editor ──────────────────────────────────────────────
    with col_editor:
        st.markdown(
            f'<div style="font-size:.65rem;font-weight:700;color:{_CYAN};'
            f'letter-spacing:.1em;text-transform:uppercase;margin-bottom:.4rem">'
            f'Editor de Borrador</div>',
            unsafe_allow_html=True,
        )

        selected_id = st.selectbox(
            "Plantilla",
            options=list(template_options.keys()),
            format_func=lambda x: template_options[x],
            key="draft_template_selector",
        )
        st.session_state["draft_selected_template"] = selected_id

        selected_tmpl = get_template(selected_id)
        initial_text = (
            selected_tmpl.body_template
            if selected_tmpl and not st.session_state["draft_current_text"]
            else st.session_state["draft_current_text"]
        )

        # Mostrar descripcion de la plantilla
        if selected_tmpl:
            st.markdown(
                f'<div style="font-size:.65rem;color:{_MUTED};margin-bottom:.4rem">'
                f'{selected_tmpl.description}</div>',
                unsafe_allow_html=True,
            )

        draft_text = st.text_area(
            "Borrador",
            value=initial_text,
            height=340,
            key="draft_text_area",
            label_visibility="collapsed",
        )
        st.session_state["draft_current_text"] = draft_text

        # Metricas de texto
        words = len(draft_text.split()) if draft_text.strip() else 0
        chars = len(draft_text)
        char_color = _RED if chars > 280 and selected_id == "tuit_electoral" else _TEXT2

        st.markdown(
            f'<div style="display:flex;gap:1.2rem;margin-top:.3rem">'
            f'<span style="font-size:.62rem;color:{_MUTED}">'
            f'Palabras: <strong style="color:{_TEXT2}">{words}</strong></span>'
            f'<span style="font-size:.62rem;color:{_MUTED}">'
            f'Caracteres: <strong style="color:{char_color}">{chars}</strong></span>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Columna derecha: paleta de datos vivos ─────────────────────────────────
    with col_palette:
        st.markdown(
            f'<div style="font-size:.65rem;font-weight:700;color:{_AMBER};'
            f'letter-spacing:.1em;text-transform:uppercase;margin-bottom:.4rem">'
            f'Paleta de Datos Vivos</div>',
            unsafe_allow_html=True,
        )

        palette = get_live_data_palette()

        _PALETTE_LABELS: dict[str, str] = {
            "encuesta_pp":         "PP %",
            "encuesta_psoe":       "PSOE %",
            "diferencia_pp_psoe":  "Diferencia PP-PSOE",
            "narrativa_top":       "Narrativa principal",
            "alerta_activa":       "Alertas activas",
            "fecha_hoy":           "Fecha de hoy",
            "itpe":                "ITPE",
        }

        for key, value in palette.items():
            label = _PALETTE_LABELS.get(key, key)
            col_chip, col_btn = st.columns([3, 1])
            with col_chip:
                st.markdown(
                    f'<div style="background:{_BG3};border:1px solid {_BORDER};'
                    f'border-radius:6px;padding:.3rem .6rem;margin-bottom:.2rem">'
                    f'<div style="font-size:.58rem;color:{_MUTED}">{label}</div>'
                    f'<div style="font-size:.72rem;font-weight:600;color:{_TEXT};'
                    f'font-family:JetBrains Mono,monospace">{value}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            with col_btn:
                if st.button("Insertar", key=f"insert_{key}", help=f"Insertar {label}"):
                    current = st.session_state.get("draft_current_text", "")
                    st.session_state["draft_current_text"] = current + f" {value}"
                    st.session_state[f"draft_insert_{key}"] = True
                    st.rerun()

        # Bloque de valores en formato codigo
        st.markdown(
            f'<div style="background:{_BG3};border:1px solid {_BORDER};'
            f'border-radius:6px;padding:.6rem .8rem;margin-top:.6rem;'
            f'font-family:JetBrains Mono,monospace;font-size:.62rem;'
            f'color:{_TEXT2};line-height:1.6">'
            + "".join(
                f'<div><span style="color:{_MUTED}">{k}:</span> '
                f'<span style="color:{_CYAN}">{v}</span></div>'
                for k, v in palette.items()
            )
            + f'</div>',
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)

    # ── Acciones ───────────────────────────────────────────────────────────────
    col_analyze, col_save, col_guardrail = st.columns(3, gap="small")

    with col_analyze:
        if st.button("Analizar riesgos", use_container_width=True, type="secondary"):
            _run_risk_analysis(st, st.session_state.get("draft_current_text", ""))

    with col_save:
        if st.button("Guardar borrador", use_container_width=True, type="primary"):
            text = st.session_state.get("draft_current_text", "").strip()
            if text:
                tmpl_name = template_options.get(
                    st.session_state.get("draft_selected_template", ""), "Borrador"
                )
                st.session_state["drafts"].append({
                    "template": tmpl_name,
                    "text":     text,
                    "saved_at": datetime.now(tz=timezone.utc).strftime("%d/%m/%Y %H:%M"),
                })
                st.success("Borrador guardado correctamente.")
            else:
                st.warning("El borrador esta vacio.")

    with col_guardrail:
        if st.button("Enviar a Guardrails", use_container_width=True, type="secondary"):
            _run_guardrail_check(st, st.session_state.get("draft_current_text", ""))

    # ── Lista de borradores guardados ──────────────────────────────────────────
    drafts: list[dict] = st.session_state.get("drafts", [])
    if drafts:
        st.markdown(
            f'<div style="font-size:.65rem;font-weight:700;color:{_MUTED};'
            f'letter-spacing:.1em;text-transform:uppercase;margin-top:1rem;'
            f'margin-bottom:.4rem">Borradores Guardados ({len(drafts)})</div>',
            unsafe_allow_html=True,
        )
        for i, draft in enumerate(reversed(drafts)):
            with st.expander(
                f"{draft['template']} — {draft['saved_at']}",
                expanded=False,
            ):
                st.text(draft["text"][:500] + ("..." if len(draft["text"]) > 500 else ""))


def _run_risk_analysis(st: Any, text: str) -> None:
    """Ejecuta un analisis de riesgos del borrador (con fallback mock)."""
    if not text.strip():
        st.warning("El borrador esta vacio.")
        return

    result = None
    try:
        from communications.comms_guardrails import check_message_risks  # type: ignore
        result = check_message_risks(text)
    except Exception:
        pass

    if result is None:
        # Fallback mock
        words = text.lower()
        risks: list[str] = []
        if any(w in words for w in ["ataque", "critica", "enemigo"]):
            risks.append("Tono ofensivo detectado — revisar")
        if any(w in words for w in ["100%", "siempre", "nunca", "garantizado"]):
            risks.append("Lenguaje absoluto — puede percibirse como poco creible")
        if len(text) > 1200:
            risks.append("Texto muy largo — considerar reducir para mayor impacto")

        if risks:
            for r in risks:
                st.warning(r)
        else:
            st.success("Sin riesgos de comunicacion identificados.")
        return

    # Si hay resultado del motor real
    st.write(result)


def _run_guardrail_check(st: Any, text: str) -> None:
    """Ejecuta verificacion de guardrails de contenido."""
    if not text.strip():
        st.warning("El borrador esta vacio.")
        return

    passed = True
    issues: list[str] = []
    words = text.lower()

    # Guardrails basicos
    if len(text.strip()) < 10:
        issues.append("Contenido demasiado corto")
        passed = False
    if any(w in words for w in ["fake", "falso", "mentira", "inventado"]):
        issues.append("Posible contenido desinformativo — revision requerida")
        passed = False
    if any(w in words for w in ["datos confidenciales", "informacion secreta"]):
        issues.append("Posible divulgacion de informacion sensible")
        passed = False

    if passed:
        st.success("Verificacion de guardrails superada. El contenido puede publicarse.")
    else:
        for issue in issues:
            st.error(f"Guardrail: {issue}")
        st.info("El contenido requiere revision antes de publicarse.")
