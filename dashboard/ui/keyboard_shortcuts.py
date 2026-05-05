"""Keyboard shortcuts hint system."""

from __future__ import annotations

try:
    import streamlit as st  # type: ignore
except Exception:  # pragma: no cover
    st = None  # type: ignore


KEYBOARD_SHORTCUTS: dict[str, str] = {
    "Cmd+K / Ctrl+K": "Abrir paleta de comandos",
    "G then H": "Ir a Inicio",
    "G then B": "Ir a Briefings",
    "G then A": "Ir a Alertas",
    "G then W": "Ir a Workspace",
    "Esc": "Cerrar modal",
    "?": "Mostrar ayuda de atajos",
    "/": "Buscar en página actual",
    "N": "Nueva nota / issue",
    "R": "Refrescar datos",
    "Cmd+S": "Guardar borrador",
    "Cmd+Shift+P": "Cambiar workspace",
}


_SHORTCUTS_CSS = """
<style>
.kbd-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 8px 16px; }
.kbd-key {
  display: inline-block; padding: 4px 10px;
  background: #111827; border: 1px solid #1E293B; border-radius: 6px;
  font-family: ui-monospace, monospace; font-size: 12px; color: #E2E8F0;
}
.kbd-desc { color: #94A3B8; font-size: 13px; align-self: center; }
.kbd-section-title {
  color: #E2E8F0; font-size: 16px; font-weight: 600; margin-bottom: 12px;
  border-bottom: 1px solid #1E293B; padding-bottom: 8px;
}
</style>
"""


def render_shortcuts_help() -> None:
    """Renderiza el panel de ayuda con todos los atajos."""
    if st is None:
        return
    st.markdown(_SHORTCUTS_CSS, unsafe_allow_html=True)
    st.markdown('<div class="kbd-section-title">Atajos de teclado</div>', unsafe_allow_html=True)
    rows_html = []
    for key, desc in KEYBOARD_SHORTCUTS.items():
        rows_html.append(
            f'<div><span class="kbd-key">{key}</span></div>'
            f'<div class="kbd-desc">{desc}</div>'
        )
    st.markdown(
        f'<div class="kbd-grid">{"".join(rows_html)}</div>',
        unsafe_allow_html=True,
    )


_SHORTCUTS_JS = """
<script>
(function() {
  if (window.__electsim_shortcuts_ready) return;
  window.__electsim_shortcuts_ready = true;

  let chord = null;
  let chordTimer = null;

  function setFlag(name) {
    try {
      window.parent.postMessage({type: "electsim_shortcut", name: name}, "*");
    } catch (e) { /* noop */ }
  }

  document.addEventListener("keydown", function(e) {
    const isMeta = e.metaKey || e.ctrlKey;
    // Cmd+K / Ctrl+K -> palette
    if (isMeta && e.key.toLowerCase() === "k") {
      e.preventDefault(); setFlag("show_palette"); return;
    }
    if (isMeta && e.key.toLowerCase() === "s") {
      e.preventDefault(); setFlag("save_draft"); return;
    }
    if (isMeta && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault(); setFlag("switch_workspace"); return;
    }
    if (e.key === "Escape") { setFlag("close_modal"); return; }
    if (e.key === "?") { setFlag("open_help"); return; }
    // chord G then X
    if (e.key.toLowerCase() === "g" && !isMeta) {
      chord = "g";
      if (chordTimer) clearTimeout(chordTimer);
      chordTimer = setTimeout(() => { chord = null; }, 1200);
      return;
    }
    if (chord === "g") {
      const k = e.key.toLowerCase();
      if (k === "h") setFlag("go_home");
      else if (k === "b") setFlag("go_briefings");
      else if (k === "a") setFlag("go_alerts");
      else if (k === "w") setFlag("go_workspace");
      chord = null;
    }
  });
})();
</script>
"""


def inject_shortcuts_js() -> None:
    """Inyecta JavaScript que escucha atajos y dispara flags vía postMessage."""
    if st is None:
        return
    st.markdown(_SHORTCUTS_JS, unsafe_allow_html=True)
