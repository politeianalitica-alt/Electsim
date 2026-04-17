from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import streamlit as st

from dashboard.db import cargar_agenda_rango, get_engine

COLORES_PARTIDO = {
    "PSOE": "#E31C1C",
    "PP": "#1A56DB",
    "VOX": "#5E9E23",
    "SUMAR": "#6B21D6",
    "JUNTS": "#0056A2",
    "ERC": "#FDB833",
    "EH BILDU": "#00A651",
    "PNV": "#007A3D",
    "CONGRESO": "#6B7280",
    "GOBIERNO": "#9CA3AF",
}
ICONOS_ACTO = {
    "rueda_prensa": "◎",
    "comparecencia": "◈",
    "visita": "⬡",
    "cumbre": "⬢",
    "acto_partido": "▣",
    "reunion": "●",
    "pleno": "◉",
    "viaje_oficial": "▲",
    "acto_publico": "◐",
    "otro": "◇",
}


_SCHEMA_AGENDA_LIDERES = """
CREATE TABLE IF NOT EXISTS agenda_lideres (
    id              BIGSERIAL PRIMARY KEY,
    lider_id        TEXT        NOT NULL,
    partido         TEXT        NOT NULL,
    nombre_lider    TEXT        NOT NULL,
    cargo           TEXT        NOT NULL,
    titulo_evento   TEXT        NOT NULL,
    descripcion     TEXT,
    lugar           TEXT,
    fecha_evento    DATE        NOT NULL,
    hora_inicio     TIME,
    hora_fin        TIME,
    tipo_evento     TEXT,
    es_publico      BOOLEAN     DEFAULT TRUE,
    url_fuente      TEXT,
    fuente_id       TEXT        NOT NULL,
    fecha_ingesta   TIMESTAMPTZ DEFAULT NOW(),
    raw_html        TEXT,
    UNIQUE (lider_id, fecha_evento, titulo_evento)
);
CREATE INDEX IF NOT EXISTS idx_agenda_fecha       ON agenda_lideres (fecha_evento);
CREATE INDEX IF NOT EXISTS idx_agenda_lider       ON agenda_lideres (lider_id);
CREATE INDEX IF NOT EXISTS idx_agenda_partido     ON agenda_lideres (partido);
"""


def _asegurar_esquema() -> None:
    """Crea la tabla agenda_lideres y sus índices si no existen (Neon idempotente)."""
    from sqlalchemy import text
    try:
        engine = get_engine()
        with engine.begin() as tx:
            for stmt in filter(None, (s.strip() for s in _SCHEMA_AGENDA_LIDERES.split(";"))):
                tx.execute(text(stmt))
    except Exception:
        # No bloquear la UI si el usuario de BD no tiene DDL; el upsert dirá lo suyo.
        pass


@st.cache_data(ttl=60 * 60 * 2, show_spinner=False)
def _actualizar_agendas_cacheado() -> dict[str, int]:
    """Ejecuta el scraping de agendas de líderes y persiste en Neon.
    Cacheado 2h para no martillear Moncloa/partidos en cada recarga."""
    _asegurar_esquema()
    from etl.sources.agendas_lideres import run_agendas
    try:
        return run_agendas(conn=get_engine(), solo_hoy=False)
    except Exception as exc:  # degradación defensiva
        return {"__error__": str(exc)}  # type: ignore[return-value]


def _boton_actualizar() -> None:
    """Fila con botón manual + resumen del último scrape."""
    col_btn, col_info = st.columns([1, 3])
    with col_btn:
        if st.button("↻  Actualizar desde fuentes públicas", use_container_width=True):
            _actualizar_agendas_cacheado.clear()
            with st.spinner("Descargando agendas (Moncloa, partidos, Congreso)..."):
                resultado = _actualizar_agendas_cacheado()
            st.cache_data.clear()  # invalida cache_agenda_rango
            if "__error__" in resultado:
                st.error(f"Error al actualizar: {resultado['__error__']}")
            else:
                total = sum(resultado.values())
                st.success(f"{total} eventos actualizados en {len(resultado)} fuentes.")
            st.rerun()
    with col_info:
        st.caption(
            "Fuentes públicas: Moncloa (Presidente · Consejo de Ministros), "
            "PP · VOX · SUMAR · ERC · Junts · EH Bildu · PNV (RSS/web oficial), "
            "API del Congreso."
        )


def render_agenda_vista(conn) -> None:
    st.header("Agenda de Líderes")

    _boton_actualizar()

    col_fecha, col_rango, col_partido = st.columns(3)
    with col_fecha:
        fecha_sel = st.date_input("Fecha inicio", value=date.today())
    with col_rango:
        dias = st.selectbox(
            "Mostrar",
            options=[1, 3, 7, 14],
            index=0,
            format_func=lambda d: "Hoy" if d == 1 else f"{d} días",
        )
    fecha_fin = fecha_sel + timedelta(days=int(dias) - 1)

    df = cargar_agenda_rango(conn, str(fecha_sel), str(fecha_fin))

    # Auto-fetch silencioso la primera vez que se entra sin datos.
    if df.empty and not st.session_state.get("_agenda_autofetch_done"):
        st.session_state["_agenda_autofetch_done"] = True
        with st.spinner("Primera carga: descargando agendas públicas..."):
            resultado = _actualizar_agendas_cacheado()
        if "__error__" not in resultado and sum(resultado.values()) > 0:
            st.cache_data.clear()
            df = cargar_agenda_rango(conn, str(fecha_sel), str(fecha_fin))

    with col_partido:
        filtro_partido = "Todos"
        if not df.empty and "partido" in df.columns:
            partidos = ["Todos"] + sorted(df["partido"].dropna().astype(str).unique().tolist())
            filtro_partido = st.selectbox("Partido", partidos)

    if not df.empty and filtro_partido != "Todos":
        df = df[df["partido"].astype(str) == filtro_partido]

    if df.empty:
        st.info(
            "No hay actos agendados para el período seleccionado. "
            "Pulsa **Actualizar desde fuentes públicas** para forzar una descarga."
        )
        return

    for fecha, df_dia in df.groupby("fecha"):
        try:
            fecha_lbl = pd.Timestamp(fecha).strftime("%A, %d de %B de %Y").capitalize()
        except Exception:
            fecha_lbl = str(fecha)
        st.subheader(f"▣  {fecha_lbl}")

        for partido, df_part in df_dia.groupby("partido"):
            color = COLORES_PARTIDO.get(str(partido), "#888")
            with st.container():
                st.markdown(
                    f"<div style='border-left:4px solid {color};"
                    f"padding-left:12px;margin-bottom:8px'>"
                    f"<strong style='color:{color}'>{partido}</strong></div>",
                    unsafe_allow_html=True,
                )
                for _, acto in df_part.iterrows():
                    hora_str = str(acto.get("hora"))[:5] if pd.notna(acto.get("hora")) else "—"
                    icono = ICONOS_ACTO.get(str(acto.get("tipo_acto", "otro")), "◇")
                    lider_val = acto.get("lider")
                    lider_str = f"**{lider_val}** · " if pd.notna(lider_val) and str(lider_val).strip() else ""
                    lugar_val = acto.get("lugar")
                    lugar_str = f" — {lugar_val}" if pd.notna(lugar_val) and str(lugar_val).strip() else ""
                    st.markdown(
                        f"&nbsp;&nbsp;`{hora_str}` {icono} {lider_str}"
                        f"{acto.get('descripcion', 'Sin descripción')}{lugar_str}",
                        unsafe_allow_html=True,
                    )
        st.divider()
