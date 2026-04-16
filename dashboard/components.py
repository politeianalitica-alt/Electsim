from __future__ import annotations

import streamlit as st

from dashboard.shared import (
    BG2,
    BORDER,
    CYAN,
    TEXT,
    TEXT2,
    MUTED,
    GREEN,
    AMBER,
    RED,
    BLUE,
)


def inject_base_css() -> None:
    st.markdown(
        f"""
        <style>
        @keyframes fadeInUp {{
            from {{ opacity:0; transform:translateY(18px); }}
            to   {{ opacity:1; transform:translateY(0); }}
        }}
        @keyframes dotPulse {{
            0%,100% {{ opacity:.4; transform:scale(1); }}
            50%      {{ opacity:1; transform:scale(1.3); }}
        }}
        .sec-hdr {{
            display:flex; align-items:center; gap:.7rem; margin:1.8rem 0 1rem;
        }}
        .sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
        .sec-hdr .lbl  {{ font-size:.65rem; font-weight:700; letter-spacing:.14em;
                         text-transform:uppercase; color:{MUTED}; }}
        .sec-hdr .line {{ flex:1; height:1px; background:{BORDER}; }}
        .data-card {{
            background:{BG2}; border:1px solid {BORDER}; border-radius:8px;
            padding:.65rem .9rem;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def section_header(label: str, color: str = CYAN) -> None:
    st.markdown(
        f"<div class='sec-hdr'>"
        f"<div class='bar' style='background:{color}'></div>"
        f"<span class='lbl'>{label}</span>"
        f"<div class='line'></div>"
        f"</div>",
        unsafe_allow_html=True,
    )


def alert_card(severity: str, title: str, description: str, meta: str = "") -> None:
    sev = str(severity or "INFO").upper()
    color = {"CRITICAL": RED, "WARNING": AMBER, "OK": GREEN}.get(sev, BLUE)
    st.markdown(
        f"""
        <div style="border-left:4px solid {color};padding:0.55rem 1rem;
                    margin:0.3rem 0;background:{BG2};border-radius:0 8px 8px 0;
                    border:1px solid {BORDER};border-left:4px solid {color}">
            <strong style="color:{TEXT}">[{sev}]</strong>
            <span style="color:{TEXT2}">{title}</span><br>
            <small style="color:{TEXT2}">{description}</small><br>
            <small style="color:{MUTED}">{meta}</small>
        </div>
        """,
        unsafe_allow_html=True,
    )
