"""
Nowcasting v2 — Agregador Bayesiano multi-fuente.

Integra:
  1. Encuestas nacionales ponderadas por rating dinámico y sesgo corregido (backtest).
  2. Microdatos CIS: prior demográfico agregado nacional.
  3. Macro: ajuste sobre el partido de gobierno según ciclo económico reciente.
  4. Prensa: delta corto plazo según sentimiento neto ponderado.

Salida:
  - Actualiza `estimaciones_voto_agregadas` con modelo='bayes_multifuente_v1' y run_id.
  - Rellena `estimacion_fuente_peso` para trazabilidad.
  - Calcula cobertura, consenso y confianza (KPIs calidad).

Uso:
    python -m models.estadisticos.nowcasting_v2
"""

from __future__ import annotations

import json
import logging
import math
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
VENTANA_DIAS_DEFAULT = 60
LAMBDA_DECAY_DEFAULT = 0.05
MIN_ENCUESTAS_PARTIDO = 2           # mínimo para estimar consenso_sd
PARTIDO_GOBIERNO_DEFAULT = "PSOE"   # fallback si no detectamos Gobierno
MODELO_NOMBRE = "bayes_multifuente_v1"


@dataclass
class FuenteContribucion:
    fuente_tipo: str
    fuente_id: int | None
    fuente_label: str
    peso_efectivo: float
    contribucion_pct: float
    fecha_dato: Any


@dataclass
class EstimacionPartido:
    partido: str
    estimacion_pct: float
    ic_95_inf: float
    ic_95_sup: float
    sigma_posterior: float
    n_encuestas: int
    n_fuentes_usadas: int
    tipos_fuente: dict[str, int]
    contribuciones: list[FuenteContribucion] = field(default_factory=list)


# ── Carga datos ───────────────────────────────────────────────────────────────
_SQL_ENCUESTAS = text("""
    SELECT
        enc.id AS encuesta_id,
        enc.fecha_publicacion::date AS fecha,
        COALESCE(enc.fecha_fin::date, enc.fecha_publicacion::date) AS fecha_campo,
        fe.nombre AS casa,
        COALESCE(enc.n_entrevistas, 1000) AS n,
        rae.categoria AS partido,
        rae.porcentaje::float AS pct
    FROM resultados_agregados_encuesta rae
    JOIN encuestas enc ON rae.encuesta_id = enc.id
    JOIN fuentes_encuesta fe ON enc.fuente_id = fe.id
    JOIN preguntas_encuesta pe ON rae.pregunta_id = pe.id
    WHERE pe.categoria_tematica = 'intencion_voto'
      AND enc.fecha_publicacion >= CURRENT_DATE - (:ventana * INTERVAL '1 day')
""")

_SQL_PESOS_CASA = text("""
    SELECT ce.nombre AS casa,
           cpv.rating,
           cpv.bias_corr_json,
           cpv.mae_ewma
    FROM casa_encuestadora ce
    LEFT JOIN casa_peso_vigente cpv ON cpv.casa_id = ce.id
""")

_SQL_MICRODATOS_INTENCION = text("""
    SELECT intencion_voto AS partido,
           SUM(COALESCE(peso_muestral,1))::float AS peso
    FROM microdatos_encuesta
    WHERE intencion_voto IS NOT NULL
    GROUP BY intencion_voto
""")

_SQL_MACRO_ULTIMO = text("""
    SELECT fecha, crecimiento_pib, ipc_general, euribor_12m, prima_riesgo_bono10
    FROM indicadores_macroeconomicos
    WHERE fecha >= CURRENT_DATE - INTERVAL '365 days'
    ORDER BY fecha DESC
""")

_SQL_SENTIMIENTO_PARTIDO = text("""
    SELECT entidad AS partido,
           AVG(sentimiento_medio)::float AS sent,
           SUM(n_noticias)::int AS n
    FROM sentimiento_prensa_diario
    WHERE fecha >= CURRENT_DATE - INTERVAL '14 days'
      AND tipo_entidad = 'partido'
    GROUP BY entidad
""")


# ── Nivel 1: encuestas ────────────────────────────────────────────────────────

def _peso_encuesta(fecha_campo, n, rating, fecha_ref, lambda_decay):
    if fecha_campo is None:
        dias = 0
    else:
        dias = max((pd.Timestamp(fecha_ref) - pd.Timestamp(fecha_campo)).days, 0)
    peso_temporal = math.exp(-lambda_decay * dias)
    peso_muestral = math.sqrt(max(int(n), 1))
    return peso_muestral * float(rating or 3.0) * peso_temporal


def nivel_encuestas(
    engine: Engine,
    fecha_ref: datetime,
    ventana_dias: int,
    lambda_decay: float,
) -> tuple[pd.DataFrame, dict[str, list[FuenteContribucion]]]:
    with engine.connect() as conn:
        enc = pd.read_sql(_SQL_ENCUESTAS, conn, params={"ventana": ventana_dias})
        casas = pd.read_sql(_SQL_PESOS_CASA, conn)

    if enc.empty:
        return pd.DataFrame(), {}

    casas_map = {row["casa"]: row for _, row in casas.iterrows()}

    def _rating(casa):
        r = casas_map.get(casa)
        return float(r["rating"]) if r is not None and r["rating"] is not None else 3.0

    def _bias(casa, partido):
        r = casas_map.get(casa)
        if r is None or not r.get("bias_corr_json"):
            return 0.0
        try:
            d = r["bias_corr_json"] if isinstance(r["bias_corr_json"], dict) else json.loads(r["bias_corr_json"])
            return float(d.get(partido, 0.0))
        except Exception:
            return 0.0

    enc["rating"] = enc["casa"].map(_rating)
    enc["bias"] = [_bias(c, p) for c, p in zip(enc["casa"], enc["partido"])]
    enc["pct_corr"] = enc["pct"].astype(float) - enc["bias"].astype(float)
    enc["peso"] = [
        _peso_encuesta(fc, n, r, fecha_ref, lambda_decay)
        for fc, n, r in zip(enc["fecha_campo"], enc["n"], enc["rating"])
    ]

    # Agregación por partido.
    filas: list[dict] = []
    contribs: dict[str, list[FuenteContribucion]] = {}
    for partido, dfp in enc.groupby("partido"):
        w = dfp["peso"].values.astype(float)
        v = dfp["pct_corr"].values.astype(float)
        if w.sum() <= 0:
            continue
        wn = w / w.sum()
        mu = float(np.average(v, weights=wn))
        # Varianza entre encuestas + error muestral medio.
        var_enc = float(np.average((v - mu) ** 2, weights=wn))
        err_muestral_sq = float(
            np.average(
                np.clip(v / 100.0 * (1 - v / 100.0), 0, 0.25) / np.clip(dfp["n"].values, 1, None) * 10000,
                weights=wn,
            )
        )
        sigma = math.sqrt(max(var_enc + err_muestral_sq, 0.01))
        filas.append({
            "partido": partido,
            "mu_encuestas": mu,
            "sigma_encuestas": sigma,
            "n_encuestas": int(len(dfp)),
            "peso_total": float(w.sum()),
            "consenso_sd": float(math.sqrt(max(var_enc, 0.0))),
        })
        top = dfp.nlargest(5, "peso")
        contribs[partido] = [
            FuenteContribucion(
                fuente_tipo="ENCUESTA",
                fuente_id=int(r["encuesta_id"]),
                fuente_label=f"{r['casa']} — {r['fecha']}",
                peso_efectivo=float(r["peso"]),
                contribucion_pct=float(r["peso"] / w.sum() * 100.0),
                fecha_dato=r["fecha"],
            )
            for _, r in top.iterrows()
        ]
    return pd.DataFrame(filas), contribs


# ── Nivel 2: microdatos ───────────────────────────────────────────────────────

def nivel_microdatos(engine: Engine) -> pd.DataFrame:
    try:
        with engine.connect() as conn:
            df = pd.read_sql(_SQL_MICRODATOS_INTENCION, conn)
    except Exception as e:
        logger.debug("Microdatos no disponibles: %s", e)
        return pd.DataFrame()
    if df.empty:
        return df
    total = float(df["peso"].sum())
    if total <= 0:
        return pd.DataFrame()
    df["mu_micro"] = df["peso"] / total * 100.0
    # σ razonable: inverso a sqrt(peso relativo) con suelo.
    df["sigma_micro"] = np.clip(
        2.0 * np.sqrt(100.0 / np.maximum(df["peso"].astype(float), 1.0)), 1.5, 5.0
    )
    return df[["partido", "mu_micro", "sigma_micro"]]


# ── Nivel 3: macro ────────────────────────────────────────────────────────────

def nivel_macro(engine: Engine, partido_gobierno: str) -> pd.DataFrame:
    """
    Ajuste marginal al partido del Gobierno según ciclo económico reciente.
    Regla simplificada (no sustituye al modelo VAR): combina PIB+IPC+Euribor.
    Devuelve columnas partido, delta_macro (pp), sigma_macro.
    """
    try:
        with engine.connect() as conn:
            df = pd.read_sql(_SQL_MACRO_ULTIMO, conn)
    except Exception as e:
        logger.debug("Macro no disponible: %s", e)
        return pd.DataFrame()
    if df.empty:
        return pd.DataFrame()

    ultimo = df.iloc[0]
    pib = float(ultimo["crecimiento_pib"] or 0.0)
    ipc = float(ultimo["ipc_general"] or 0.0)
    euribor = float(ultimo["euribor_12m"] or 0.0)
    prima = float(ultimo["prima_riesgo_bono10"] or 0.0)

    # Score económico: ↑ favorece al Gobierno (+), ↓ penaliza.
    score = 0.6 * pib - 0.4 * ipc - 0.2 * (euribor - 2.0) - 0.01 * prima
    delta = float(np.clip(score, -2.0, 2.0))         # pp, máximo ±2
    sigma = 3.0                                      # incertidumbre alta (prior débil)
    return pd.DataFrame([
        {"partido": partido_gobierno, "delta_macro": delta, "sigma_macro": sigma},
    ])


# ── Nivel 4: prensa ───────────────────────────────────────────────────────────

def nivel_prensa(engine: Engine) -> pd.DataFrame:
    try:
        with engine.connect() as conn:
            df = pd.read_sql(_SQL_SENTIMIENTO_PARTIDO, conn)
    except Exception as e:
        logger.debug("Sentimiento prensa no disponible: %s", e)
        return pd.DataFrame()
    if df.empty:
        return df
    # Cap a pequeño delta: el sentimiento mueve ±0.8 pp como mucho.
    df["delta_prensa"] = np.clip(df["sent"].astype(float) * 1.5, -0.8, 0.8)
    df["sigma_prensa"] = 2.5
    return df[["partido", "delta_prensa", "sigma_prensa"]]


# ── Fusión bayesiana ──────────────────────────────────────────────────────────

def fusionar(
    df_enc: pd.DataFrame,
    df_micro: pd.DataFrame,
    df_macro: pd.DataFrame,
    df_prensa: pd.DataFrame,
) -> list[EstimacionPartido]:
    if df_enc.empty:
        return []

    micro_map = df_micro.set_index("partido").to_dict("index") if not df_micro.empty else {}
    macro_map = df_macro.set_index("partido").to_dict("index") if not df_macro.empty else {}
    prensa_map = df_prensa.set_index("partido").to_dict("index") if not df_prensa.empty else {}

    estimaciones: list[EstimacionPartido] = []
    for _, row in df_enc.iterrows():
        partido = str(row["partido"])
        terms: list[tuple[float, float, str]] = []  # (mu, sigma, tipo)
        terms.append((float(row["mu_encuestas"]), float(row["sigma_encuestas"]), "ENCUESTA"))
        if partido in micro_map:
            m = micro_map[partido]
            terms.append((float(m["mu_micro"]), float(m["sigma_micro"]), "MICRODATO"))
        if partido in macro_map:
            m = macro_map[partido]
            mu_prior = float(row["mu_encuestas"]) + float(m["delta_macro"])
            terms.append((mu_prior, float(m["sigma_macro"]), "MACRO"))
        if partido in prensa_map:
            m = prensa_map[partido]
            mu_prior = float(row["mu_encuestas"]) + float(m["delta_prensa"])
            terms.append((mu_prior, float(m["sigma_prensa"]), "PRENSA"))

        # Fusión gaussiana (precisión ponderada).
        prec_sum = 0.0
        num = 0.0
        tipos: dict[str, int] = {}
        for mu, sigma, tipo in terms:
            prec = 1.0 / max(sigma * sigma, 1e-4)
            prec_sum += prec
            num += mu * prec
            tipos[tipo] = tipos.get(tipo, 0) + 1
        mu_post = num / prec_sum
        sigma_post = math.sqrt(1.0 / prec_sum)
        estimaciones.append(EstimacionPartido(
            partido=partido,
            estimacion_pct=round(max(0.0, min(100.0, mu_post)), 2),
            ic_95_inf=round(max(0.0, mu_post - 1.96 * sigma_post), 2),
            ic_95_sup=round(min(100.0, mu_post + 1.96 * sigma_post), 2),
            sigma_posterior=round(sigma_post, 3),
            n_encuestas=int(row["n_encuestas"]),
            n_fuentes_usadas=len(terms),
            tipos_fuente=tipos,
        ))
    return estimaciones


# ── Persistencia ──────────────────────────────────────────────────────────────

def _partido_id(engine: Engine, siglas: str) -> int | None:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM partidos WHERE siglas = :s LIMIT 1"),
            {"s": siglas},
        ).fetchone()
    return int(row[0]) if row else None


def guardar_estimaciones(
    engine: Engine,
    estimaciones: list[EstimacionPartido],
    df_enc: pd.DataFrame,
    ventana_dias: int,
    run_id: uuid.UUID,
    contribs_por_partido: dict[str, list[FuenteContribucion]],
) -> dict[str, Any]:
    fecha_est = datetime.now().date()
    insert_sql = text("""
        INSERT INTO estimaciones_voto_agregadas (
            fecha_estimacion, partido_id, estimacion_pct, ic_95_inf, ic_95_sup,
            n_encuestas, modelo, ventana_dias, run_id,
            cobertura_pct, consenso_sd, confianza_modelo, n_fuentes_usadas, tipos_fuente_json
        ) VALUES (
            :fecha, :pid, :est, :lo, :hi,
            :n, :modelo, :ventana, :runid,
            :cobertura, :consenso, :confianza, :nfuentes, :tipos_json
        )
        RETURNING id
    """)
    fuente_sql = text("""
        INSERT INTO estimacion_fuente_peso (
            estimacion_id, run_id, fuente_tipo, fuente_id, fuente_label,
            peso_efectivo, contribucion_pct, fecha_dato
        ) VALUES (
            :eid, :runid, :ftipo, :fid, :flabel,
            :peso, :contrib, :fecha
        )
    """)

    enc_map = df_enc.set_index("partido").to_dict("index") if not df_enc.empty else {}
    cobertura_total = _calcular_cobertura(engine)
    n_inserts = 0
    with engine.begin() as conn:
        for est in estimaciones:
            pid = _partido_id(engine, est.partido)
            if pid is None:
                continue
            consenso = float(enc_map.get(est.partido, {}).get("consenso_sd", 0.0) or 0.0)
            confianza = float(np.clip(1.0 - est.sigma_posterior / 5.0, 0.0, 1.0))
            res = conn.execute(insert_sql, {
                "fecha": fecha_est,
                "pid": pid,
                "est": est.estimacion_pct,
                "lo": est.ic_95_inf,
                "hi": est.ic_95_sup,
                "n": est.n_encuestas,
                "modelo": MODELO_NOMBRE,
                "ventana": ventana_dias,
                "runid": str(run_id),
                "cobertura": cobertura_total,
                "consenso": consenso,
                "confianza": confianza,
                "nfuentes": est.n_fuentes_usadas,
                "tipos_json": json.dumps(est.tipos_fuente),
            }).fetchone()
            eid = int(res[0])
            n_inserts += 1
            for c in contribs_por_partido.get(est.partido, []):
                conn.execute(fuente_sql, {
                    "eid": eid,
                    "runid": str(run_id),
                    "ftipo": c.fuente_tipo,
                    "fid": c.fuente_id,
                    "flabel": c.fuente_label,
                    "peso": c.peso_efectivo,
                    "contrib": c.contribucion_pct,
                    "fecha": pd.to_datetime(c.fecha_dato).date() if c.fecha_dato is not None else None,
                })
    return {
        "run_id": str(run_id),
        "n_partidos": n_inserts,
        "fecha": str(fecha_est),
        "modelo": MODELO_NOMBRE,
    }


def _calcular_cobertura(engine: Engine) -> float:
    """% de casas activas con al menos una encuesta en los últimos 7 días."""
    try:
        df = pd.read_sql(
            text("SELECT n_encuestas_7d, activa FROM v_casas_cobertura_reciente"),
            engine,
        )
    except Exception:
        return 0.0
    if df.empty:
        return 0.0
    activas = df[df["activa"]]
    if activas.empty:
        return 0.0
    con_dato = (activas["n_encuestas_7d"].astype(int) > 0).sum()
    return round(float(con_dato) / float(len(activas)) * 100.0, 2)


# ── Orquestador ───────────────────────────────────────────────────────────────

def ejecutar(
    engine: Engine,
    ventana_dias: int = VENTANA_DIAS_DEFAULT,
    lambda_decay: float = LAMBDA_DECAY_DEFAULT,
    partido_gobierno: str = PARTIDO_GOBIERNO_DEFAULT,
) -> dict[str, Any]:
    fecha_ref = datetime.now()
    run_id = uuid.uuid4()
    logger.info("run_id=%s ventana=%d", run_id, ventana_dias)

    df_enc, contribs_enc = nivel_encuestas(engine, fecha_ref, ventana_dias, lambda_decay)
    if df_enc.empty:
        logger.warning("Sin encuestas suficientes — no se guarda estimación")
        return {"ok": False, "error": "sin_encuestas"}

    df_micro = nivel_microdatos(engine)
    df_macro = nivel_macro(engine, partido_gobierno)
    df_prensa = nivel_prensa(engine)

    estimaciones = fusionar(df_enc, df_micro, df_macro, df_prensa)

    resumen = guardar_estimaciones(
        engine, estimaciones, df_enc, ventana_dias, run_id, contribs_enc,
    )
    resumen["ok"] = True
    resumen["niveles"] = {
        "encuestas": int(len(df_enc)),
        "microdatos": int(len(df_micro)),
        "macro": int(len(df_macro)),
        "prensa": int(len(df_prensa)),
    }
    return resumen


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    engine = create_engine(os.environ["DATABASE_URL"])
    res = ejecutar(engine)
    print(json.dumps(res, indent=2, ensure_ascii=False, default=str))
