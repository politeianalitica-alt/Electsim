"""
dashboard/ui/safe_render.py — Renderizado seguro de contenido externo.

PROBLEMA: st.markdown(f"<div>{user_data}</div>", unsafe_allow_html=True)
puede ejecutar HTML/JS malicioso si user_data viene de:
  - contactos CRM, documentos subidos, notas manuales,
  - resúmenes IA, datos externos, content assets.

CORRECCIÓN: siempre escapar antes de interpolar en HTML.

Uso:
    from dashboard.ui.safe_render import escape_user_text, safe_markdown, render_safe_html

    # MAL: st.markdown(f"<div>{contact['notes']}</div>", unsafe_allow_html=True)
    # BIEN:
    safe_notes = escape_user_text(contact["notes"])
    st.markdown(f"<div>{safe_notes}</div>", unsafe_allow_html=True)

    # O mejor:
    render_safe_html("<div>{notes}</div>", {"notes": contact["notes"]})
"""
from __future__ import annotations

import html
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Tags HTML básicos permitidos en markdown seguro
_ALLOWED_TAGS = {"b", "i", "em", "strong", "code", "br", "p", "ul", "li", "ol"}

# Patrones de contenido peligroso
_DANGEROUS_PATTERNS = [
    re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),  # onclick=, onload=, etc.
    re.compile(r"<iframe[^>]*>", re.IGNORECASE),
    re.compile(r"<object[^>]*>", re.IGNORECASE),
    re.compile(r"<embed[^>]*>", re.IGNORECASE),
    re.compile(r"data:text/html", re.IGNORECASE),
    re.compile(r"vbscript:", re.IGNORECASE),
]


def escape_user_text(text: Any, max_length: int = 5000) -> str:
    """
    Escapa HTML en texto de usuario para inserción segura en markdown HTML.

    Args:
        text: texto a escapar (cualquier tipo, se convierte a str)
        max_length: longitud máxima (trunca si excede)

    Returns:
        Texto con caracteres HTML escapados, seguro para interpolar en HTML.
    """
    if text is None:
        return ""
    s = str(text)
    if len(s) > max_length:
        s = s[:max_length] + "…"
    return html.escape(s, quote=True)


def strip_unsafe_html(text: str) -> str:
    """
    Elimina tags y patrones HTML peligrosos de un string.

    Mantiene el texto visible pero elimina el HTML potencialmente malicioso.
    NO es un sanitizador completo (para eso usar bleach), pero filtra lo peor.

    Args:
        text: HTML a limpiar

    Returns:
        Texto limpio de elementos peligrosos.
    """
    if not text:
        return ""
    result = text
    for pattern in _DANGEROUS_PATTERNS:
        result = pattern.sub("", result)
    # Eliminar todos los tags que no están en la lista permitida
    result = re.sub(
        r"<(/?)(\w+)([^>]*)>",
        lambda m: f"<{m.group(1)}{m.group(2)}>" if m.group(2).lower() in _ALLOWED_TAGS else "",
        result,
    )
    return result


def safe_markdown(text: str, allow_basic_markdown: bool = True) -> str:
    """
    Prepara texto para usarlo con st.markdown() de forma segura.

    Si allow_basic_markdown=True: permite **, *, `, pero escapa HTML.
    Si allow_basic_markdown=False: escapa todo.

    Args:
        text: texto a preparar
        allow_basic_markdown: si se permite markdown básico (negrita, cursiva, código)

    Returns:
        Texto seguro para st.markdown().
    """
    if not text:
        return ""
    if not allow_basic_markdown:
        return html.escape(str(text), quote=True)
    # Escapar HTML pero preservar markdown básico
    s = strip_unsafe_html(str(text))
    return s


def render_safe_html(template: str, context: dict[str, Any]) -> None:
    """
    Renderiza una plantilla HTML escapando todos los valores del contexto.

    Uso:
        render_safe_html(
            "<div class='note'>{notes}</div>",
            {"notes": contact["notes"]}
        )

    Args:
        template: plantilla con {placeholders}
        context: valores a interpolar (se escapan automáticamente)
    """
    try:
        import streamlit as st
        safe_context = {k: escape_user_text(v) for k, v in context.items()}
        html_content = template.format_map(safe_context)
        st.markdown(html_content, unsafe_allow_html=True)
    except Exception as exc:
        logger.warning("render_safe_html error: %s", exc)
        try:
            import streamlit as st
            st.text(str(context))
        except Exception:
            pass


def safe_html_badge(text: str, color: str = "#6B7280", bg: str = "#1f2937") -> str:
    """
    Crea un badge HTML con texto seguro.

    Args:
        text: texto del badge (se escapa)
        color: color del texto
        bg: color de fondo

    Returns:
        HTML string seguro para usar en st.markdown(unsafe_allow_html=True).
    """
    safe_text = escape_user_text(text, max_length=50)
    return (
        f'<span style="background:{bg};color:{color};padding:.1rem .4rem;'
        f'border-radius:4px;font-size:.7rem;font-weight:600">{safe_text}</span>'
    )


def escape_for_json_display(data: Any, indent: int = 2) -> str:
    """Convierte datos a JSON escapado para display en UI."""
    import json
    try:
        return html.escape(json.dumps(data, ensure_ascii=False, indent=indent, default=str))
    except Exception:
        return html.escape(str(data))
