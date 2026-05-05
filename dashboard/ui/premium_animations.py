"""Premium animations CSS — fade-ins, hover states, page transitions."""

from __future__ import annotations

try:
    import streamlit as st  # type: ignore
except Exception:  # pragma: no cover
    st = None  # type: ignore


PREMIUM_CSS = """
<style>
/* ---------- Keyframes ---------- */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position: 800px 0; }
}
@keyframes pulse-cyan {
  0%   { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.45); }
  70%  { box-shadow: 0 0 0 12px rgba(0, 212, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0); }
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes count-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---------- Page entry ---------- */
[data-testid="stAppViewContainer"] > .main {
  animation: fadeInUp 0.4s ease-out;
}

/* ---------- Premium card ---------- */
.premium-card {
  background: #0D1320;
  border: 1px solid #1E293B;
  border-radius: 12px;
  padding: 16px;
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
.premium-card:hover {
  transform: translateY(-2px);
  border-color: #00D4FF;
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.18);
}

/* ---------- Skeleton loader ---------- */
.skeleton {
  display: block;
  background: linear-gradient(90deg, #111827 0%, #1E293B 50%, #111827 100%);
  background-size: 1600px 100%;
  animation: shimmer 1.6s infinite linear;
  border-radius: 8px;
}

/* ---------- Tooltip ---------- */
.premium-tooltip {
  position: relative;
  display: inline-block;
}
.premium-tooltip[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 125%; left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: #E2E8F0;
  border: 1px solid #1E293B;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  font-size: 12px;
  z-index: 9999;
}

/* ---------- Scroll ---------- */
html { scroll-behavior: smooth; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #0D1320; }
::-webkit-scrollbar-thumb { background: #00D4FF; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #3B82F6; }

/* ---------- Focus & selection ---------- */
input:focus, textarea:focus, select:focus,
.stTextInput input:focus, .stTextArea textarea:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px #00D4FF !important;
  border-color: #00D4FF !important;
}
::selection { background: rgba(0, 212, 255, 0.30); color: #E2E8F0; }

/* ---------- Streamlit overrides ---------- */
button[kind="primary"], .stButton > button {
  transition: transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}
.stButton > button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.20);
}
section[data-testid="stSidebar"] {
  transition: width 250ms ease;
}
header[data-testid="stHeader"] {
  position: sticky; top: 0; z-index: 999;
  background: #080C14;
  border-bottom: 1px solid #1E293B;
}

/* ---------- KPI count-up ---------- */
.kpi-number { animation: count-up 0.6s ease-out; }

/* ---------- Pulse alert ---------- */
.pulse-alert { animation: pulse-cyan 2s infinite; border-radius: 999px; }

/* ---------- Ticker ---------- */
.ticker-track { display: inline-flex; animation: ticker-scroll 40s linear infinite; }
</style>
"""


def inject_premium_css() -> None:
    """Inyecta el CSS premium en la página actual."""
    if st is None:
        return
    st.markdown(PREMIUM_CSS, unsafe_allow_html=True)


def loading_skeleton(height: str = "40px", count: int = 3) -> str:
    """Devuelve HTML para mostrar skeleton loaders."""
    rows = "".join(
        f'<div class="skeleton" style="height:{height}; margin-bottom:8px;"></div>'
        for _ in range(count)
    )
    return f'<div class="skeleton-wrap">{rows}</div>'


def fade_in_div(content_html: str, delay_ms: int = 0) -> str:
    """Envuelve contenido HTML en un contenedor con animación fade-in."""
    return (
        f'<div style="animation: fadeInUp 0.4s ease-out {delay_ms}ms both;">'
        f"{content_html}"
        "</div>"
    )
