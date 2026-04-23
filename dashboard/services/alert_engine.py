"""Motor de alertas automáticas para dashboard y pipelines."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from dashboard.db import get_conn

logger = logging.getLogger(__name__)

UMBRALES_MACRO: dict[str, dict[str, Any]] = {
    "ipc_general": {
        "WARNING": {"cambio_abs": 0.5, "direccion": "any"},
        "CRITICAL": {"cambio_abs": 1.0, "direccion": "any"},
        "label": "IPC General",
        "unidad": "%",
    },
    "tasa_paro": {
        "WARNING": {"cambio_abs": 0.3, "direccion": "any"},
        "CRITICAL": {"cambio_abs": 0.8, "direccion": "up"},
        "label": "Tasa de Paro",
        "unidad": "%",
    },
    "prima_riesgo_bono10": {
        "WARNING": {"cambio_abs": 30, "direccion": "up"},
        "CRITICAL": {"cambio_abs": 80, "direccion": "up"},
        "label": "Prima de Riesgo",
        "unidad": "pb",
    },
    "crecimiento_pib": {
        "WARNING": {"cambio_abs": 0.4, "direccion": "down"},
        "CRITICAL": {"cambio_abs": 0.8, "direccion": "down"},
        "label": "Crecimiento PIB",
        "unidad": "%",
    },
}

UMBRALES_ENCUESTA: dict[str, float] = {
    "variacion_pp_warning": 3.0,
    "variacion_pp_critical": 6.0,
}

UMBRALES_RIESGO: dict[str, float] = {
    "warning": 65.0,
    "critical": 80.0,
}

UMBRALES_PRENSA: dict[str, float] = {
    "ratio_warning": 1.8,
    "ratio_critical": 2.5,
    "sent_warning": -0.2,
    "sent_critical": -0.35,
    "min_menciones": 5.0,
}


@dataclass
class Alerta:
    tipo: str
    severidad: str
    titulo: str
    descripcion: str
    fuente: str
    valor_actual: float | None = None
    valor_anterior: float | None = None
    pagina_relevante: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


def _extra_cols_available(conn: Any) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'alertas_sistema'
            """
        )
        cols = {str(r[0]) for r in cur.fetchall()}
    return {"fuente", "valor_actual", "valor_anterior", "pagina_relevante"}.issubset(cols)


def _alerta_ya_existe(conn: Any, tipo: str, titulo: str, ventana_horas: int = 24) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)::int
            FROM alertas_sistema
            WHERE tipo = %s AND titulo = %s
              AND created_at > NOW() - (%s * INTERVAL '1 hour')
            """,
            (tipo, titulo, int(ventana_horas)),
        )
        row = cur.fetchone()
    return int(row[0] if row else 0) > 0


def _persistir_alertas(alertas: list[Alerta]) -> int:
    if not alertas:
        return 0

    conn = get_conn()
    inserted = 0
    has_extra = _extra_cols_available(conn)
    now = datetime.now(timezone.utc)
    try:
        for a in alertas:
            if _alerta_ya_existe(conn, a.tipo, a.titulo, ventana_horas=6):
                continue
            with conn.cursor() as cur:
                if has_extra:
                    cur.execute(
                        """
                        INSERT INTO alertas_sistema
                            (tipo, severidad, titulo, descripcion, fuente,
                             valor_actual, valor_anterior, pagina_relevante, leida, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, FALSE, %s)
                        """,
                        (
                            a.tipo,
                            a.severidad,
                            a.titulo,
                            a.descripcion,
                            a.fuente,
                            a.valor_actual,
                            a.valor_anterior,
                            a.pagina_relevante,
                            now,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO alertas_sistema
                            (tipo, severidad, titulo, descripcion, leida, created_at)
                        VALUES (%s, %s, %s, %s, FALSE, %s)
                        """,
                        (a.tipo, a.severidad, a.titulo, a.descripcion, now),
                    )
            inserted += 1
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        try:
            conn.close()
        except Exception:
            pass
    logger.info("AlertEngine: %d alertas nuevas insertadas", inserted)
    return inserted


def _f(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return float(default)
        out = float(value)
        return out if math.isfinite(out) else float(default)
    except Exception:
        return float(default)


def detectar_alertas_macro(df_macro: pd.DataFrame) -> list[Alerta]:
    alertas: list[Alerta] = []
    if df_macro.empty:
        return alertas
    for col, cfg in UMBRALES_MACRO.items():
        serie = df_macro[df_macro["indicador"].astype(str).str.lower() == col].copy()
        if len(serie) < 2:
            continue
        serie = serie.sort_values("fecha")
        val_nuevo = float(serie.iloc[-1]["valor"])
        val_ant = float(serie.iloc[-2]["valor"])
        cambio = abs(val_nuevo - val_ant)
        direccion = "up" if val_nuevo > val_ant else "down"
        for sev in ("CRITICAL", "WARNING"):
            umbral_cfg = cfg.get(sev, {})
            umbral = float(umbral_cfg.get("cambio_abs", 9999))
            dir_req = str(umbral_cfg.get("direccion", "any"))
            if cambio >= umbral and (dir_req == "any" or dir_req == direccion):
                signo = "↑" if direccion == "up" else "↓"
                alertas.append(
                    Alerta(
                        tipo="macro",
                        severidad=sev,
                        titulo=f"{cfg['label']} {signo} {cambio:.2f}{cfg['unidad']}",
                        descripcion=(
                            f"{cfg['label']} pasó de {val_ant:.2f}{cfg['unidad']} "
                            f"a {val_nuevo:.2f}{cfg['unidad']} (Δ {cambio:.2f}{cfg['unidad']})."
                        ),
                        fuente="indicadores_macroeconomicos",
                        valor_actual=val_nuevo,
                        valor_anterior=val_ant,
                        pagina_relevante="12_Macroeconomia",
                    )
                )
                break
    return alertas


def detectar_alertas_encuesta(df_encuestas: pd.DataFrame) -> list[Alerta]:
    alertas: list[Alerta] = []
    if df_encuestas.empty or "partido" not in df_encuestas.columns:
        return alertas
    umbral_w = UMBRALES_ENCUESTA["variacion_pp_warning"]
    umbral_c = UMBRALES_ENCUESTA["variacion_pp_critical"]
    for partido, grupo in df_encuestas.groupby("partido"):
        grupo = grupo.sort_values("fecha")
        if len(grupo) < 2:
            continue
        media_30d = float(grupo.tail(6)["intencion_voto"].mean())
        ultimo = float(grupo.iloc[-1]["intencion_voto"])
        variacion = abs(ultimo - media_30d)
        sev = "CRITICAL" if variacion >= umbral_c else "WARNING" if variacion >= umbral_w else None
        if sev:
            signo = "↑" if ultimo > media_30d else "↓"
            alertas.append(
                Alerta(
                    tipo="encuesta",
                    severidad=sev,
                    titulo=f"{partido}: {signo}{variacion:.1f}pp en intención de voto",
                    descripcion=(
                        f"{partido} registra {ultimo:.1f}% frente a media reciente "
                        f"de {media_30d:.1f}% (variación {signo}{variacion:.1f}pp)."
                    ),
                    fuente="estimaciones_voto_agregadas",
                    valor_actual=ultimo,
                    valor_anterior=media_30d,
                    pagina_relevante="2_Nowcasting",
                )
            )
    return alertas


def detectar_alertas_riesgo(indice_riesgo: float, fuente: str = "6_Riesgo") -> list[Alerta]:
    alertas: list[Alerta] = []
    if indice_riesgo >= UMBRALES_RIESGO["critical"]:
        alertas.append(
            Alerta(
                tipo="riesgo",
                severidad="CRITICAL",
                titulo=f"Índice de Riesgo Político CRÍTICO: {indice_riesgo:.0f}/100",
                descripcion=(
                    f"El índice de riesgo político alcanzó {indice_riesgo:.0f}/100, "
                    "por encima del umbral crítico (80)."
                ),
                fuente=fuente,
                valor_actual=indice_riesgo,
                pagina_relevante="6_Riesgo",
            )
        )
    elif indice_riesgo >= UMBRALES_RIESGO["warning"]:
        alertas.append(
            Alerta(
                tipo="riesgo",
                severidad="WARNING",
                titulo=f"Índice de Riesgo Político elevado: {indice_riesgo:.0f}/100",
                descripcion=(
                    f"El índice de riesgo político está en {indice_riesgo:.0f}/100, "
                    "por encima del umbral de alerta (65)."
                ),
                fuente=fuente,
                valor_actual=indice_riesgo,
                pagina_relevante="6_Riesgo",
            )
        )
    return alertas


def detectar_alertas_prensa(df_prensa: pd.DataFrame) -> list[Alerta]:
    """
    Detecta presión mediática por partido:
    combina caída de sentimiento reciente con aceleración de cobertura.
    """
    alertas: list[Alerta] = []
    if df_prensa.empty:
        return alertas
    if "partido" not in df_prensa.columns:
        return alertas

    for _, row in df_prensa.iterrows():
        partido = str(row.get("partido") or "").strip()
        if not partido:
            continue
        n_24h = _f(row.get("n_24h"), _f(row.get("n_reciente")))
        ratio = _f(row.get("ratio_menciones"))
        sent_24h = _f(row.get("sent_24h"), _f(row.get("sent_reciente")))
        sent_prev = _f(row.get("sent_prev"), _f(row.get("sent_previo")))
        consenso = _f(row.get("consenso_score"), _f(row.get("consenso_fuentes"), 1.0))
        fuentes = int(_f(row.get("fuentes_recientes")))
        if n_24h < UMBRALES_PRENSA["min_menciones"]:
            continue

        sev: str | None = None
        if (
            ratio >= UMBRALES_PRENSA["ratio_critical"]
            and sent_24h <= UMBRALES_PRENSA["sent_critical"]
            and consenso >= 0.35
        ):
            sev = "CRITICAL"
        elif ratio >= UMBRALES_PRENSA["ratio_warning"] and sent_24h <= UMBRALES_PRENSA["sent_warning"]:
            sev = "WARNING"
        if sev is None:
            continue

        trend = "empeora" if sent_24h < sent_prev else "estable"
        alertas.append(
            Alerta(
                tipo="prensa",
                severidad=sev,
                titulo=f"{partido}: presión mediática negativa ({ratio:.2f}x)",
                descripcion=(
                    f"{partido} concentra {n_24h:.0f} menciones en 24h con sentimiento "
                    f"{sent_24h:+.2f} ({trend} vs {sent_prev:+.2f}) en {fuentes} fuentes."
                ),
                fuente="noticias_prensa",
                valor_actual=sent_24h,
                valor_anterior=sent_prev,
                pagina_relevante="10_Prensa_Agenda",
                metadata={
                    "partido": partido,
                    "n_24h": n_24h,
                    "ratio_menciones": ratio,
                    "consenso": consenso,
                    "fuentes_recientes": fuentes,
                    "accion_sugerida": "Ajustar mensaje y activar réplica en medios en <4h.",
                },
            )
        )
    return alertas


def detectar_alertas_fuentes(df_source_health: pd.DataFrame) -> list[Alerta]:
    """Convierte estados de salud de fuentes en alertas operativas."""
    alertas: list[Alerta] = []
    if df_source_health.empty:
        return alertas
    if not {"source_id", "status"}.issubset(df_source_health.columns):
        return alertas

    for _, row in df_source_health.iterrows():
        source_id = str(row.get("source_id") or "").strip()
        status = str(row.get("status") or "").lower().strip()
        if not source_id or status not in {"failing", "degraded"}:
            continue
        errors = _f(row.get("errors_count"))
        lag_s = _f(row.get("freshness_lag_s"))
        sev = "CRITICAL" if status == "failing" else "WARNING"
        alertas.append(
            Alerta(
                tipo="ingesta_prensa",
                severidad=sev,
                titulo=f"Fuente {source_id} en estado {status}",
                descripcion=(
                    f"Ingesta {status}: errors={errors:.0f}, freshness_lag={lag_s/3600:.1f}h."
                ),
                fuente="source_health",
                valor_actual=lag_s,
                valor_anterior=errors,
                pagina_relevante="10_Prensa_Agenda",
                metadata={"source_id": source_id, "status": status},
            )
        )
    return alertas


def ejecutar_motor_alertas(
    df_macro: pd.DataFrame | None = None,
    df_encuestas: pd.DataFrame | None = None,
    indice_riesgo: float | None = None,
    df_prensa: pd.DataFrame | None = None,
    df_source_health: pd.DataFrame | None = None,
) -> int:
    todas: list[Alerta] = []
    if df_macro is not None and not df_macro.empty:
        todas += detectar_alertas_macro(df_macro)
    if df_encuestas is not None and not df_encuestas.empty:
        todas += detectar_alertas_encuesta(df_encuestas)
    if indice_riesgo is not None:
        todas += detectar_alertas_riesgo(indice_riesgo)
    if df_prensa is not None and not df_prensa.empty:
        todas += detectar_alertas_prensa(df_prensa)
    if df_source_health is not None and not df_source_health.empty:
        todas += detectar_alertas_fuentes(df_source_health)
    return _persistir_alertas(todas)
