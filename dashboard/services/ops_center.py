"""Centro operativo del producto: salud por fases, SLAs y acciones."""

from __future__ import annotations

import os
import re
import time
from pathlib import Path
from typing import Any

import pandas as pd
import requests
import yaml

from db.session import get_raw_conn
from etl.logger import get_logger

logger = get_logger(__name__)

_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

_ROOT = Path(__file__).resolve().parents[2]
_SLOS_PATH = _ROOT / "dashboard" / "config" / "operational_slos.yml"


def _qident(name: str) -> str:
    if not _IDENT_RE.match(str(name)):
        raise ValueError(f"Identificador no valido: {name}")
    return f'"{name}"'


def _load_slos() -> list[dict[str, Any]]:
    if not _SLOS_PATH.exists():
        return []
    with _SLOS_PATH.open("r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    datasets = cfg.get("datasets") or []
    if not isinstance(datasets, list):
        return []
    cleaned: list[dict[str, Any]] = []
    for ds in datasets:
        if not isinstance(ds, dict):
            continue
        if not ds.get("tabla") or not ds.get("nombre"):
            continue
        cleaned.append(
            {
                "fase": str(ds.get("fase", "otros")).lower(),
                "nombre": str(ds.get("nombre")),
                "tabla": str(ds.get("tabla")),
                "fecha_cols": [str(x) for x in (ds.get("fecha_cols") or [])],
                "sla_horas": float(ds.get("sla_horas", 24)),
            }
        )
    return cleaned


def _table_columns(conn: Any, table_name: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'AND table_name = %s
            """,
            (table_name,),
        )
        return {str(r[0]) for r in cur.fetchall()}


def _table_exists(conn: Any, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (table_name,))
        row = cur.fetchone()
    return bool(row and row[0])


def _status_for_age(age_horas: float | None, total_rows: int, sla_horas: float) -> str:
    if total_rows <= 0:
        return "critical"
    if age_horas is None:
        return "warning"
    if age_horas <= sla_horas:
        return "ok"
    if age_horas <= (sla_horas * 4):
        return "warning"
    return "critical"


def estado_datasets() -> pd.DataFrame:
    """Estado de salud dataset-a-dataset según SLAs declarados en YAML."""
    slos = _load_slos()
    if not slos:
        return pd.DataFrame()

    conn = get_raw_conn()
    out: list[dict[str, Any]] = []
    try:
        for ds in slos:
            tabla = ds["tabla"]
            fase = ds["fase"]
            nombre = ds["nombre"]
            sla = float(ds["sla_horas"])

            if not _table_exists(conn, tabla):
                out.append(
                    {
                        "fase": fase,
                        "dataset": nombre,
                        "tabla": tabla,
                        "estado": "critical",
                        "edad_horas": None,
                        "rows_24h": 0,
                        "rows_total": 0,
                        "sla_horas": sla,
                        "detalle": "tabla inexistente",
                    }
                )
                continue

            cols = _table_columns(conn, tabla)
            fecha_col = next((c for c in ds["fecha_cols"] if c in cols), None)
            tabla_q = _qident(tabla)

            if fecha_col is None:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM {tabla_q}")
                    total = int(cur.fetchone()[0] or 0)
                estado = _status_for_age(None, total, sla)
                out.append(
                    {
                        "fase": fase,
                        "dataset": nombre,
                        "tabla": tabla,
                        "estado": estado,
                        "edad_horas": None,
                        "rows_24h": None,
                        "rows_total": total,
                        "sla_horas": sla,
                        "detalle": "sin columna temporal",
                    }
                )
                continue

            col_q = _qident(fecha_col)
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        MAX({col_q}) AS max_ts,
                        COUNT(*) FILTER (WHERE {col_q} >= NOW() - INTERVAL '24 hours') AS rows_24h,
                        COUNT(*) AS rows_total
                    FROM {tabla_q}
                    """
                )
                max_ts, rows_24h, rows_total = cur.fetchone()

            age_h = None
            if max_ts is not None:
                with conn.cursor() as cur:
                    cur.execute("SELECT EXTRACT(EPOCH FROM (NOW() - %s::timestamptz)) / 3600.0", (max_ts,))
                    age_h = float(cur.fetchone()[0] or 0.0)

            estado = _status_for_age(age_h, int(rows_total or 0), sla)
            if estado == "ok":
                detalle = "en SLA"
            elif estado == "warning":
                detalle = "revisar recencia"
            else:
                detalle = "fuera de SLA"

            out.append(
                {
                    "fase": fase,
                    "dataset": nombre,
                    "tabla": tabla,
                    "estado": estado,
                    "edad_horas": round(age_h, 2) if age_h is not None else None,
                    "rows_24h": int(rows_24h or 0),
                    "rows_total": int(rows_total or 0),
                    "sla_horas": sla,
                    "detalle": detalle,
                }
            )
    except Exception as exc:
        logger.error("estado_datasets: %s", exc, exc_info=True)
    finally:
        conn.close()

    return pd.DataFrame(out)


def resumen_fases(df_estado: pd.DataFrame | None = None) -> pd.DataFrame:
    if df_estado is None:
        df_estado = estado_datasets()
    if df_estado is None or df_estado.empty:
        return pd.DataFrame()

    score_map = {"ok": 1.0, "warning": 0.5, "critical": 0.0}
    tmp = df_estado.copy()
    tmp["score"] = tmp["estado"].map(score_map).fillna(0.0)
    agg = (
        tmp.groupby("fase", as_index=False)
        .agg(
            score=("score", "mean"),
            datasets=("dataset", "count"),
            ok=("estado", lambda s: int((s == "ok").sum())),
            warning=("estado", lambda s: int((s == "warning").sum())),
            critical=("estado", lambda s: int((s == "critical").sum())),
        )
        .sort_values("fase")
    )
    agg["score_pct"] = (agg["score"] * 100).round(1)
    return agg


def health_api() -> dict[str, Any]:
    url = os.getenv("ELECTSIM_API_URL", "http://localhost:8000").rstrip("/") + "/health"
    t0 = time.perf_counter()
    try:
        r = requests.get(url, timeout=2.5)
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "ok": bool(r.status_code == 200),
            "status_code": int(r.status_code),
            "latency_ms": latency_ms,
            "url": url,
        }
    except Exception as exc:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "ok": False,
            "status_code": None,
            "latency_ms": latency_ms,
            "url": url,
            "error": str(exc),
        }


def acciones_recomendadas(df_estado: pd.DataFrame | None = None) -> list[str]:
    if df_estado is None:
        df_estado = estado_datasets()
    if df_estado is None or df_estado.empty:
        return ["No hay estado operativo disponible. Verifica conexión a base de datos."]

    crit = df_estado[df_estado["estado"] == "critical"]
    warn = df_estado[df_estado["estado"] == "warning"]
    acciones: list[str] = []

    for _, row in crit.head(6).iterrows():
        acciones.append(
            f"[CRITICO] {row['dataset']} ({row['tabla']}): {row['detalle']}."
        )
    for _, row in warn.head(6).iterrows():
        acciones.append(
            f"[AVISO] {row['dataset']} ({row['tabla']}): {row['detalle']}."
        )

    if not acciones:
        acciones.append("Estado general estable. No hay bloqueos operativos.")
    return acciones
