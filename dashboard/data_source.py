"""
Componente global de estado de datos para ElectSim.

Muestra de forma explícita y visible si una página usa datos reales de BD,
datos sintéticos calibrados, o un fallback local. Previene que el usuario
tome decisiones estratégicas basadas en datos inventados sin saberlo.

Uso:
    from dashboard.data_source import data_source_banner, DataSourceStatus

    status = DataSourceStatus.from_fuente(perfil.get("fuente_datos"), timestamp)
    data_source_banner(status)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

import streamlit as st

log = logging.getLogger(__name__)

FuenteTipo = Literal["real", "sintetico", "fallback", "parcial"]


@dataclass
class DataSourceStatus:
    tipo: FuenteTipo = "sintetico"
    fuente_label: str = "Datos sintéticos"
    timestamp: str | None = None
    oleada: str | None = None
    n_registros: int | None = None
    detalle: str = ""

    # ── Colores por tipo ───────────────────────────────────────────────────────
    _COLORS: dict[FuenteTipo, tuple[str, str]] = field(
        default_factory=lambda: {
            "real":      ("#10B981", "#D1FAE5"),   # verde: texto, fondo
            "parcial":   ("#F59E0B", "#FEF3C7"),   # ámbar
            "sintetico": ("#6366F1", "#EDE9FE"),   # índigo
            "fallback":  ("#EF4444", "#FEE2E2"),   # rojo
        },
        repr=False,
    )

    @classmethod
    def from_fuente(
        cls,
        fuente: str | None,
        timestamp: str | None = None,
        n_registros: int | None = None,
        oleada: str | None = None,
    ) -> "DataSourceStatus":
        fuente = (fuente or "").lower().strip()
        if fuente in {"microdatos_cis", "microdatos_propio", "bd_real"}:
            return cls(
                tipo="real",
                fuente_label="Microdatos CIS reales",
                timestamp=timestamp,
                oleada=oleada,
                n_registros=n_registros,
                detalle="Datos cargados desde la base de datos.",
            )
        if fuente in {"parcial", "bd_parcial"}:
            return cls(
                tipo="parcial",
                fuente_label="Datos parciales (BD + sintético)",
                timestamp=timestamp,
                oleada=oleada,
                n_registros=n_registros,
                detalle="Algunos campos provienen de datos sintéticos calibrados.",
            )
        if fuente == "fallback":
            return cls(
                tipo="fallback",
                fuente_label="Fallback local — BD no disponible",
                detalle="No se pudo conectar a la base de datos. Los datos mostrados son valores por defecto sin calibrar.",
            )
        # sintetico / vacío / desconocido
        return cls(
            tipo="sintetico",
            fuente_label="Datos sintéticos calibrados CIS",
            detalle="Los datos están calibrados con encuestas CIS publicadas, pero no provienen de microdatos reales.",
        )

    @property
    def color_text(self) -> str:
        return self._COLORS.get(self.tipo, ("#6366F1", "#EDE9FE"))[0]

    @property
    def color_bg(self) -> str:
        return self._COLORS.get(self.tipo, ("#6366F1", "#EDE9FE"))[1]

    @property
    def icono(self) -> str:
        return {"real": "✅", "parcial": "⚠️", "sintetico": "🔵", "fallback": "🔴"}.get(self.tipo, "🔵")


def data_source_banner(
    status: DataSourceStatus,
    collapsed: bool = False,
) -> None:
    """Renderiza un banner horizontal con el estado de la fuente de datos.

    Siempre visible — no colapsable por defecto para garantizar transparencia.
    """
    ts_str = ""
    if status.timestamp:
        ts_str = f" · Actualizado: {status.timestamp}"
    oleada_str = f" · Oleada: {status.oleada}" if status.oleada else ""
    n_str = f" · n={status.n_registros:,}" if status.n_registros else ""

    html = f"""
    <div style="
        background:{status.color_bg};
        border-left:4px solid {status.color_text};
        border-radius:6px;
        padding:8px 14px;
        margin-bottom:12px;
        font-size:0.82rem;
        color:#1F2937;
        display:flex;
        align-items:center;
        gap:8px;
    ">
        <span style="font-size:1rem">{status.icono}</span>
        <span>
            <strong>Fuente:</strong> {status.fuente_label}{oleada_str}{n_str}{ts_str}
            {f'<br><span style="opacity:0.75">{status.detalle}</span>' if status.detalle else ''}
        </span>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


def data_source_badge_inline(tipo: FuenteTipo, label: str | None = None) -> str:
    """Retorna HTML de badge pequeño para usar inline en markdown."""
    colors: dict[FuenteTipo, tuple[str, str]] = {
        "real":      ("#10B981", "#D1FAE5"),
        "parcial":   ("#F59E0B", "#FEF3C7"),
        "sintetico": ("#6366F1", "#EDE9FE"),
        "fallback":  ("#EF4444", "#FEE2E2"),
    }
    c_text, c_bg = colors.get(tipo, ("#6366F1", "#EDE9FE"))
    texto = label or tipo.upper()
    return (
        f'<span style="background:{c_bg};color:{c_text};'
        f'border:1px solid {c_text};border-radius:4px;'
        f'padding:1px 6px;font-size:0.72rem;font-weight:600">{texto}</span>'
    )


def fiabilidad_baja_badge(razon: str = "") -> None:
    """Muestra un badge de baja fiabilidad para clústeres con alto NS/NC."""
    msg = razon or "Este segmento tiene alta proporción de NS/NC. La distribución de voto es una estimación por posición ideológica, no por intención declarada."
    st.markdown(
        f"""<div style="background:#FEF3C7;border-left:3px solid #F59E0B;
        border-radius:4px;padding:6px 12px;font-size:0.80rem;color:#92400E;margin:4px 0">
        ⚠️ <strong>Fiabilidad baja:</strong> {msg}
        </div>""",
        unsafe_allow_html=True,
    )


def check_db_connection(engine) -> DataSourceStatus:
    """Comprueba si hay conexión a BD y devuelve el status correspondiente."""
    if engine is None:
        return DataSourceStatus.from_fuente("fallback")
    try:
        from sqlalchemy import text as _text
        with engine.connect() as conn:
            conn.execute(_text("SELECT 1"))
        return DataSourceStatus.from_fuente("real", timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"))
    except Exception as exc:
        log.warning("DB health check fallido: %s", exc)
        return DataSourceStatus.from_fuente("fallback")
