"""
Backtest de casas encuestadoras contra resultados electorales reales.

Para cada elección y cada casa, compara los últimos 30 días de encuestas previas
con el resultado final y calcula MAE, RMSE, sesgo global y sesgo por partido.
Posteriormente sintetiza un `rating` (1..5) y `bias_corr_json` por EWMA
recentando las últimas elecciones, y actualiza `casa_peso_vigente`.

Uso:
    python -m validation.backtest_casas
"""

from __future__ import annotations

import json
import logging
import math
import os
from collections import defaultdict
from datetime import timedelta
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
VENTANA_DIAS_PRE_ELECCION = 30
DIAS_ANTES_DEFAULT = 15          # etiqueta por cubos: 1-7, 8-15, 16-30
MAX_ELECCIONES_BT = 10           # últimas N elecciones
EWMA_HALFLIFE_ELECC = 3          # decaimiento por número de elecciones recientes
RATING_MAE_RANGE = (1.0, 5.0)    # MAE → rating: MAE<=1.0→5, MAE>=5.0→1


# ── SQL ────────────────────────────────────────────────────────────────────────
_SQL_ELECCIONES = text("""
    SELECT id, fecha, tipo::text AS tipo, descripcion
    FROM elecciones
    WHERE tipo = :tipo
    ORDER BY fecha DESC
    LIMIT :lim
""")

_SQL_RESULTADOS_REALES = text("""
    SELECT p.siglas AS partido,
           MAX(re.porcentaje)::float AS pct_real
    FROM resultados_electorales re
    JOIN partidos p ON p.id = re.partido_id
    WHERE re.eleccion_id = :eid
      AND re.provincia_id IS NULL
    GROUP BY p.siglas
""")

_SQL_ENCUESTAS_PRE = text("""
    SELECT
        enc.id AS encuesta_id,
        enc.fecha_publicacion::date AS fecha,
        enc.fecha_fin::date AS fecha_campo,
        fe.nombre AS casa,
        COALESCE(enc.n_entrevistas, 1000) AS n,
        rae.categoria AS partido,
        rae.porcentaje::float AS pct
    FROM resultados_agregados_encuesta rae
    JOIN encuestas enc ON rae.encuesta_id = enc.id
    JOIN fuentes_encuesta fe ON enc.fuente_id = fe.id
    JOIN preguntas_encuesta pe ON rae.pregunta_id = pe.id
    WHERE pe.categoria_tematica = 'intencion_voto'
      AND enc.fecha_publicacion BETWEEN :desde AND :hasta
""")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _bucket_dias_antes(dias: int) -> int:
    """Redondea a cubos típicos: 7, 15, 30."""
    if dias <= 7:
        return 7
    if dias <= 15:
        return 15
    return 30


def _mae_to_rating(mae: float) -> float:
    lo, hi = RATING_MAE_RANGE
    if mae <= lo:
        return 5.0
    if mae >= hi:
        return 1.0
    # Interpolación lineal decreciente.
    return float(5.0 - 4.0 * (mae - lo) / (hi - lo))


def _ensure_casa(engine: Engine, nombre: str) -> int | None:
    """Devuelve casa_id; inserta si no existe."""
    if not nombre:
        return None
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id FROM casa_encuestadora WHERE nombre = :n LIMIT 1"),
            {"n": nombre},
        ).fetchone()
        if row:
            return int(row[0])
        logger.info("Creando casa nueva: %s", nombre)
        res = conn.execute(
            text("""
                INSERT INTO casa_encuestadora (nombre, nombre_normalizado, activa)
                VALUES (:n, LOWER(REPLACE(:n, ' ', '')), TRUE)
                RETURNING id
            """),
            {"n": nombre},
        ).fetchone()
        if not res:
            return None
        conn.execute(
            text("""
                INSERT INTO casa_peso_vigente (casa_id, rating, metodo)
                VALUES (:cid, 3.0, 'bootstrap_neutral')
                ON CONFLICT (casa_id) DO NOTHING
            """),
            {"cid": int(res[0])},
        )
        return int(res[0])


# ── Core backtest ─────────────────────────────────────────────────────────────

def backtest_eleccion(engine: Engine, eleccion_id: int, fecha: Any) -> pd.DataFrame:
    """
    Devuelve DataFrame con columnas: casa, n_encuestas, mae, rmse, bias_medio,
    bias_por_partido (dict), dias_antes, sd_error, n_partidos.
    """
    fecha = pd.to_datetime(fecha).date()
    desde = fecha - timedelta(days=VENTANA_DIAS_PRE_ELECCION)
    hasta = fecha - timedelta(days=1)

    with engine.connect() as conn:
        reales = pd.read_sql(_SQL_RESULTADOS_REALES, conn, params={"eid": eleccion_id})
        enc = pd.read_sql(_SQL_ENCUESTAS_PRE, conn, params={"desde": desde, "hasta": hasta})

    if reales.empty or enc.empty:
        return pd.DataFrame()

    reales_map = dict(zip(reales["partido"], reales["pct_real"]))
    enc["pct_real"] = enc["partido"].map(reales_map)
    enc = enc.dropna(subset=["pct_real"])
    if enc.empty:
        return pd.DataFrame()

    enc["error"] = enc["pct"].astype(float) - enc["pct_real"].astype(float)
    enc["fecha_ref"] = pd.to_datetime(enc["fecha_campo"].fillna(enc["fecha"]))
    enc["dias_antes"] = (pd.Timestamp(fecha) - enc["fecha_ref"]).dt.days.clip(lower=1)

    filas: list[dict] = []
    for casa, dfc in enc.groupby("casa"):
        abs_err = dfc["error"].abs().astype(float)
        mae = float(abs_err.mean())
        rmse = float(np.sqrt((dfc["error"].astype(float) ** 2).mean()))
        bias_medio = float(dfc["error"].mean())
        sd_error = float(dfc["error"].std(ddof=0))
        bias_por_partido: dict[str, float] = {
            partido: float(g["error"].mean())
            for partido, g in dfc.groupby("partido")
        }
        dias_antes = _bucket_dias_antes(int(dfc["dias_antes"].median()))
        filas.append({
            "casa": casa,
            "n_encuestas": int(dfc["encuesta_id"].nunique()),
            "n_partidos": int(dfc["partido"].nunique()),
            "mae": mae,
            "rmse": rmse,
            "bias_medio": bias_medio,
            "sd_error": sd_error,
            "bias_por_partido": bias_por_partido,
            "dias_antes": dias_antes,
        })
    return pd.DataFrame(filas)


def upsert_accuracy(
    engine: Engine,
    eleccion_id: int,
    df: pd.DataFrame,
) -> int:
    if df.empty:
        return 0
    n_ok = 0
    with engine.begin() as conn:
        for _, row in df.iterrows():
            casa_id = _ensure_casa(engine, str(row["casa"]))
            if casa_id is None:
                continue
            conn.execute(
                text("""
                    INSERT INTO casa_accuracy_historica (
                        casa_id, eleccion_id, dias_antes, n_encuestas,
                        mae_global, rmse_global, bias_medio, bias_por_partido,
                        sd_error, n_partidos
                    ) VALUES (
                        :casa_id, :eid, :dias, :n,
                        :mae, :rmse, :bias, :bias_part,
                        :sd, :npart
                    )
                    ON CONFLICT (casa_id, eleccion_id, dias_antes) DO UPDATE SET
                        n_encuestas = EXCLUDED.n_encuestas,
                        mae_global = EXCLUDED.mae_global,
                        rmse_global = EXCLUDED.rmse_global,
                        bias_medio = EXCLUDED.bias_medio,
                        bias_por_partido = EXCLUDED.bias_por_partido,
                        sd_error = EXCLUDED.sd_error,
                        n_partidos = EXCLUDED.n_partidos
                """),
                {
                    "casa_id": casa_id,
                    "eid": eleccion_id,
                    "dias": int(row["dias_antes"]),
                    "n": int(row["n_encuestas"]),
                    "mae": float(row["mae"]),
                    "rmse": float(row["rmse"]),
                    "bias": float(row["bias_medio"]),
                    "bias_part": json.dumps(row["bias_por_partido"]),
                    "sd": float(row["sd_error"]) if not math.isnan(row["sd_error"]) else 0.0,
                    "npart": int(row["n_partidos"]),
                },
            )
            n_ok += 1
    return n_ok


def recalcular_pesos_vigentes(engine: Engine) -> int:
    """
    Para cada casa, calcula EWMA de MAE y bias_por_partido sobre últimas elecciones,
    deriva rating y upsertea en casa_peso_vigente.
    """
    df = pd.read_sql(
        text("""
            SELECT cah.casa_id,
                   ce.nombre AS casa,
                   e.fecha,
                   cah.mae_global,
                   cah.bias_por_partido,
                   cah.n_encuestas
            FROM casa_accuracy_historica cah
            JOIN casa_encuestadora ce ON ce.id = cah.casa_id
            JOIN elecciones e ON e.id = cah.eleccion_id
            WHERE cah.dias_antes <= 15
            ORDER BY cah.casa_id, e.fecha DESC
        """),
        engine,
    )
    if df.empty:
        logger.info("No hay accuracy histórica; salto recálculo de pesos.")
        return 0

    n_ok = 0
    with engine.begin() as conn:
        for casa_id, dfc in df.groupby("casa_id"):
            dfc = dfc.sort_values("fecha", ascending=False).head(MAX_ELECCIONES_BT)
            # Peso EWMA por número de elecciones (la más reciente tiene peso 1).
            ranks = np.arange(len(dfc))
            w = np.power(0.5, ranks / max(EWMA_HALFLIFE_ELECC, 1))
            mae_ewma = float(np.average(dfc["mae_global"].astype(float).values, weights=w))
            rating = round(_mae_to_rating(mae_ewma), 2)

            # EWMA de bias_por_partido.
            bias_acc: dict[str, list[tuple[float, float]]] = defaultdict(list)
            for (_, r), wi in zip(dfc.iterrows(), w):
                bpp = r["bias_por_partido"] or {}
                if isinstance(bpp, str):
                    try:
                        bpp = json.loads(bpp)
                    except Exception:
                        bpp = {}
                for partido, b in bpp.items():
                    bias_acc[str(partido)].append((float(b), float(wi)))
            bias_corr = {
                p: round(float(np.average([v for v, _ in xs], weights=[w for _, w in xs])), 3)
                for p, xs in bias_acc.items() if xs
            }

            conn.execute(
                text("""
                    INSERT INTO casa_peso_vigente (
                        casa_id, rating, mae_ewma, bias_corr_json,
                        n_elecciones_bt, metodo, last_updated
                    ) VALUES (
                        :cid, :rating, :mae, :bias, :nel, 'backtest_v1', NOW()
                    )
                    ON CONFLICT (casa_id) DO UPDATE SET
                        rating = EXCLUDED.rating,
                        mae_ewma = EXCLUDED.mae_ewma,
                        bias_corr_json = EXCLUDED.bias_corr_json,
                        n_elecciones_bt = EXCLUDED.n_elecciones_bt,
                        metodo = EXCLUDED.metodo,
                        last_updated = EXCLUDED.last_updated
                """),
                {
                    "cid": int(casa_id),
                    "rating": float(rating),
                    "mae": float(mae_ewma),
                    "bias": json.dumps(bias_corr),
                    "nel": int(len(dfc)),
                },
            )
            n_ok += 1
    return n_ok


def ejecutar_backtest_completo(engine: Engine, tipo: str = "generales") -> dict[str, Any]:
    """Orquesta backtest de todas las elecciones del tipo dado + recálculo pesos."""
    with engine.connect() as conn:
        elecciones = pd.read_sql(_SQL_ELECCIONES, conn, params={"tipo": tipo, "lim": MAX_ELECCIONES_BT})
    resumen = {"tipo": tipo, "n_elecciones": 0, "n_casas_actualizadas": 0, "detalles": []}
    for _, el in elecciones.iterrows():
        df = backtest_eleccion(engine, int(el["id"]), el["fecha"])
        n_rows = upsert_accuracy(engine, int(el["id"]), df)
        if n_rows > 0:
            resumen["n_elecciones"] += 1
            resumen["detalles"].append({
                "eleccion_id": int(el["id"]),
                "fecha": str(el["fecha"]),
                "n_casas": n_rows,
            })
    resumen["n_casas_actualizadas"] = recalcular_pesos_vigentes(engine)
    return resumen


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    engine = create_engine(os.environ["DATABASE_URL"])
    resumen = ejecutar_backtest_completo(engine)
    print(json.dumps(resumen, indent=2, ensure_ascii=False, default=str))
