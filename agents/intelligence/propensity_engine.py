"""
Propensity Score Engine — modelo XGBoost por seccion censal.

Equivalente al voter propensity model de NationBuilder (145M registros en EEUU).
Aqui calculamos probabilidades de voto para ~70.000 secciones censales espanolas
cruzando datos INE (renta, edad, desempleo) con resultados historicos de infoelectoral.

Productos principales:
  - predict_all_sections()          : actualiza propensity_score para todas las secciones
  - get_swing_sections()            : las mas competitivas entre dos partidos
  - get_strategic_opportunities()   : zonas donde un partido esta cerca de ganar
  - predict_scenario()              : simulacion de escenario con variacion de features
"""
from __future__ import annotations

import logging
import pickle
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import psycopg
from psycopg.rows import dict_row

from config.settings import get_settings

log = logging.getLogger(__name__)

_settings = get_settings()

PARTIES = ["pp", "psoe", "vox", "sumar", "pnv", "junts", "otros"]

FEATURES = [
    "renta_media", "edad_media", "pct_universitarios",
    "pct_extranjeros", "tasa_desempleo", "densidad_pop",
    "indice_urbanizacion", "pct_pensionistas", "pct_jovenes_18_35",
    "valor_catastral_medio", "pct_vivienda_alquiler",
    "pct_sector_primario", "pct_sector_servicios", "pct_sector_industria",
]

MODEL_PATH = Path("models/propensity_xgb.pkl")


def _conn_str() -> str:
    raw = _settings.database_url_raw
    return re.sub(r"postgresql\+\w+://", "postgresql://", raw)


class PropensityEngine:
    """Motor de propension electoral basado en XGBoost."""

    def __init__(self) -> None:
        self._dsn = _conn_str()
        self._models: dict = {}

    # ------------------------------------------------------------------
    # Entrenamiento
    # ------------------------------------------------------------------

    def train(self) -> dict:
        """
        Entrena un modelo XGBoost binario por partido usando datos historicos.
        Requiere que propensity_score tenga filas con ultimo_resultado poblado
        (fuente: infoelectoral via interior_resultados.py).
        """
        try:
            from xgboost import XGBClassifier
            from sklearn.calibration import CalibratedClassifierCV
            from sklearn.model_selection import cross_val_score
        except ImportError:
            log.warning("xgboost/scikit-learn no instalados — train omitido")
            return {}

        df = self._load_training_data()
        if df.empty:
            log.warning("Sin datos de entrenamiento para propensity")
            return {}

        X = df[FEATURES].fillna(df[FEATURES].median())
        metrics: dict = {}

        for party in PARTIES:
            col = f"pct_{party}"
            if col not in df.columns:
                continue
            y_reg = df[col].clip(0, 1)
            y_bin = (y_reg > y_reg.median()).astype(int)

            if y_bin.sum() < 10:
                continue

            model = XGBClassifier(
                n_estimators=300, max_depth=6, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                eval_metric="logloss", n_jobs=-1, random_state=42,
            )
            scores = cross_val_score(model, X, y_bin, cv=5, scoring="roc_auc")
            model.fit(X, y_bin)
            calibrated = CalibratedClassifierCV(model, cv="prefit", method="isotonic")
            calibrated.fit(X, y_bin)
            self._models[party] = calibrated
            metrics[party] = {
                "auc_mean": round(float(scores.mean()), 3),
                "auc_std":  round(float(scores.std()), 3),
                "n":        int(len(df)),
            }
            log.info("Propensity %s: AUC %.3f +/- %.3f",
                     party.upper(), scores.mean(), scores.std())

        self._save_models()
        return metrics

    # ------------------------------------------------------------------
    # Inferencia
    # ------------------------------------------------------------------

    def predict_all_sections(self) -> int:
        """Calcula scores para todas las secciones y los guarda en BD."""
        if not self._models:
            self._load_models()
        if not self._models:
            log.warning("Sin modelos entrenados para propensity")
            return 0

        df = self._load_features_all()
        if df.empty:
            return 0

        X = df[FEATURES].fillna(df[FEATURES].median())
        records = []

        for idx, row in df.iterrows():
            x = X.loc[[idx]].values
            scores: dict[str, float] = {}
            for party, model in self._models.items():
                scores[party] = float(model.predict_proba(x)[0][1])

            total = sum(scores.values()) or 1.0
            scores = {k: v / total for k, v in scores.items()}

            records.append({
                "seccion_censal":      row.get("seccion_censal"),
                "municipio_cod":       row.get("municipio_cod"),
                "provincia_cod":       row.get("provincia_cod"),
                "ccaa":                row.get("ccaa"),
                "score_pp":            scores.get("pp", 0),
                "score_psoe":          scores.get("psoe", 0),
                "score_vox":           scores.get("vox", 0),
                "score_sumar":         scores.get("sumar", 0),
                "score_pnv":           scores.get("pnv", 0),
                "score_junts":         scores.get("junts", 0),
                "score_otros":         scores.get("otros", 0),
                "modelo_version":      "xgb_v1",
            })

        self._upsert_scores(records)
        log.info("Propensity scores: %d secciones actualizadas", len(records))
        return len(records)

    def predict_scenario(
        self,
        ccaa: Optional[str] = None,
        feature_overrides: Optional[dict] = None,
    ) -> pd.DataFrame:
        """Simula escenario con variaciones en features (que-pasa-si)."""
        if not self._models:
            self._load_models()

        df = self._load_features_all(ccaa=ccaa)
        if df.empty:
            return pd.DataFrame()

        X = df[FEATURES].fillna(df[FEATURES].median())
        if feature_overrides:
            for feat, delta in feature_overrides.items():
                if feat in X.columns:
                    X[feat] = X[feat] + delta

        result_parts = []
        for party, model in self._models.items():
            proba = model.predict_proba(X)[:, 1]
            result_parts.append(pd.Series(proba, index=df.index, name=f"score_{party}"))

        if not result_parts:
            return pd.DataFrame()

        scores_df = pd.concat(result_parts, axis=1)
        row_sum = scores_df.sum(axis=1).replace(0, 1)
        scores_df = scores_df.div(row_sum, axis=0)

        meta = df[["seccion_censal", "municipio_cod", "provincia_cod", "ccaa"]].copy()
        return pd.concat([meta, scores_df], axis=1)

    # ------------------------------------------------------------------
    # Analisis estrategico (producto principal para campanas)
    # ------------------------------------------------------------------

    def get_swing_sections(
        self, partido_a: str, partido_b: str, n: int = 100
    ) -> pd.DataFrame:
        """Secciones mas competitivas entre dos partidos (swing districts)."""
        col_a = f"score_{partido_a}"
        col_b = f"score_{partido_b}"
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            rows = conn.execute(
                f"""
                SELECT seccion_censal, municipio_cod, provincia_cod, ccaa,
                       {col_a} AS score_a, {col_b} AS score_b,
                       ABS({col_a} - {col_b}) AS diferencia,
                       ({col_a} + {col_b}) / 2.0 AS competitividad,
                       renta_media, edad_media, densidad_pop
                FROM propensity_score
                WHERE {col_a} IS NOT NULL AND {col_b} IS NOT NULL
                ORDER BY ABS({col_a} - {col_b}) ASC,
                         ({col_a} + {col_b}) / 2.0 DESC
                LIMIT %s
                """,
                (n,),
            ).fetchall()
        return pd.DataFrame(rows)

    def get_strategic_opportunities(
        self, partido: str, umbral: float = 0.05
    ) -> pd.DataFrame:
        """
        Secciones donde el partido esta a menos de 'umbral' de ganar.
        Son las zonas con mayor ROI de campana — equivalente al
        producto estrella de NationBuilder para consultores electorales.
        """
        col = f"score_{partido}"
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            rows = conn.execute(
                f"""
                WITH ranked AS (
                    SELECT *,
                        GREATEST(score_pp, score_psoe, score_vox,
                                 score_sumar, score_pnv, score_junts) AS max_rival
                    FROM propensity_score
                    WHERE {col} IS NOT NULL
                )
                SELECT seccion_censal, municipio_cod, provincia_cod, ccaa,
                       {col} AS score_propio, max_rival,
                       (max_rival - {col}) AS gap_para_ganar,
                       renta_media, edad_media, pct_universitarios,
                       tasa_desempleo, densidad_pop
                FROM ranked
                WHERE (max_rival - {col}) BETWEEN 0 AND %s
                   OR ({col} > 0.3 AND (max_rival - {col}) < %s)
                ORDER BY gap_para_ganar ASC
                LIMIT 500
                """,
                (umbral, umbral),
            ).fetchall()
        return pd.DataFrame(rows)

    # ------------------------------------------------------------------
    # Carga de datos
    # ------------------------------------------------------------------

    def _load_training_data(self) -> pd.DataFrame:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            rows = conn.execute(
                """
                SELECT seccion_censal, municipio_cod, provincia_cod, ccaa,
                       renta_media, edad_media, pct_universitarios,
                       pct_extranjeros, tasa_desempleo, densidad_pop,
                       indice_urbanizacion,
                       COALESCE(pct_pensionistas, 18.5)    AS pct_pensionistas,
                       COALESCE(pct_jovenes_18_35, 22.0)   AS pct_jovenes_18_35,
                       COALESCE(valor_catastral_medio, 100000) AS valor_catastral_medio,
                       COALESCE(pct_vivienda_alquiler, 0.25)  AS pct_vivienda_alquiler,
                       COALESCE(pct_sector_primario, 0.05)    AS pct_sector_primario,
                       COALESCE(pct_sector_servicios, 0.65)   AS pct_sector_servicios,
                       COALESCE(pct_sector_industria, 0.20)   AS pct_sector_industria,
                       CAST(ultimo_resultado->>'pp'    AS FLOAT) AS pct_pp,
                       CAST(ultimo_resultado->>'psoe'  AS FLOAT) AS pct_psoe,
                       CAST(ultimo_resultado->>'vox'   AS FLOAT) AS pct_vox,
                       CAST(ultimo_resultado->>'sumar' AS FLOAT) AS pct_sumar,
                       CAST(ultimo_resultado->>'pnv'   AS FLOAT) AS pct_pnv,
                       CAST(ultimo_resultado->>'junts' AS FLOAT) AS pct_junts,
                       CAST(ultimo_resultado->>'otros' AS FLOAT) AS pct_otros
                FROM propensity_score
                WHERE renta_media IS NOT NULL
                """
            ).fetchall()
        return pd.DataFrame(rows)

    def _load_features_all(self, ccaa: Optional[str] = None) -> pd.DataFrame:
        sql = """
            SELECT seccion_censal, municipio_cod, provincia_cod, ccaa,
                   renta_media, edad_media, pct_universitarios,
                   pct_extranjeros, tasa_desempleo, densidad_pop,
                   indice_urbanizacion,
                   COALESCE(pct_pensionistas, 18.5)    AS pct_pensionistas,
                   COALESCE(pct_jovenes_18_35, 22.0)   AS pct_jovenes_18_35,
                   COALESCE(valor_catastral_medio, 100000) AS valor_catastral_medio,
                   COALESCE(pct_vivienda_alquiler, 0.25)  AS pct_vivienda_alquiler,
                   COALESCE(pct_sector_primario, 0.05)    AS pct_sector_primario,
                   COALESCE(pct_sector_servicios, 0.65)   AS pct_sector_servicios,
                   COALESCE(pct_sector_industria, 0.20)   AS pct_sector_industria
            FROM propensity_score
        """
        params: list = []
        if ccaa:
            sql += " WHERE ccaa = %s"
            params.append(ccaa)

        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            rows = conn.execute(sql, params).fetchall()
        return pd.DataFrame(rows)

    def _upsert_scores(self, records: list[dict]) -> None:
        if not records:
            return
        with psycopg.connect(self._dsn) as conn:
            for r in records:
                conn.execute(
                    """
                    INSERT INTO propensity_score
                        (seccion_censal, municipio_cod, provincia_cod, ccaa,
                         score_pp, score_psoe, score_vox, score_sumar,
                         score_pnv, score_junts, score_otros, modelo_version)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (seccion_censal) DO UPDATE SET
                        score_pp       = EXCLUDED.score_pp,
                        score_psoe     = EXCLUDED.score_psoe,
                        score_vox      = EXCLUDED.score_vox,
                        score_sumar    = EXCLUDED.score_sumar,
                        score_pnv      = EXCLUDED.score_pnv,
                        score_junts    = EXCLUDED.score_junts,
                        score_otros    = EXCLUDED.score_otros,
                        modelo_version = EXCLUDED.modelo_version,
                        calculado_en   = NOW()
                    """,
                    (
                        r["seccion_censal"], r.get("municipio_cod"),
                        r.get("provincia_cod"), r.get("ccaa"),
                        r["score_pp"], r["score_psoe"], r["score_vox"],
                        r["score_sumar"], r["score_pnv"], r["score_junts"],
                        r["score_otros"], r["modelo_version"],
                    ),
                )

    # ------------------------------------------------------------------
    # Persistencia de modelos
    # ------------------------------------------------------------------

    def _save_models(self) -> None:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self._models, f)

    def _load_models(self) -> None:
        if MODEL_PATH.exists():
            with open(MODEL_PATH, "rb") as f:
                self._models = pickle.load(f)
            log.info("Modelos propensity cargados: %s", list(self._models.keys()))
