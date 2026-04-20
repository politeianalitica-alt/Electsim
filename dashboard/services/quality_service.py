"""
Quality Service — Validación de calidad de datos de fuentes ETL.

Inspirado en great_expectations (https://github.com/great-expectations/great_expectations),
implementa expectations ligeras sobre DataFrames para detectar roturas
de scrapers antes de que lleguen al frontend.

Uso:
    from dashboard.services.quality_service import validate_boe, validate_agenda, QualityReport
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Callable, Optional

import pandas as pd


# ── Resultado de validación ───────────────────────────────────────────────────

@dataclass
class Expectation:
    name: str
    status: str        # "pass" | "warn" | "fail"
    detail: str = ""
    value: object = None
    threshold: object = None


@dataclass
class QualityReport:
    source: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    expectations: list[Expectation] = field(default_factory=list)

    @property
    def passed(self) -> int:
        return sum(1 for e in self.expectations if e.status == "pass")

    @property
    def warned(self) -> int:
        return sum(1 for e in self.expectations if e.status == "warn")

    @property
    def failed(self) -> int:
        return sum(1 for e in self.expectations if e.status == "fail")

    @property
    def overall(self) -> str:
        if self.failed > 0:
            return "fail"
        if self.warned > 0:
            return "warn"
        return "pass"

    @property
    def score(self) -> float:
        """Score de calidad 0-100."""
        total = len(self.expectations)
        if not total:
            return 100.0
        return round((self.passed + self.warned * 0.5) / total * 100, 1)

    def summary(self) -> str:
        return (
            f"[{self.overall.upper()}] {self.source}: "
            f"{self.passed}✓ {self.warned}⚠ {self.failed}✗ — score {self.score}/100"
        )


# ── Expectations primitivas ───────────────────────────────────────────────────

def _expect_not_empty(df: pd.DataFrame, name: str = "not_empty") -> Expectation:
    ok = not df.empty
    return Expectation(
        name=name,
        status="pass" if ok else "fail",
        detail="DataFrame no está vacío" if ok else "DataFrame vacío — fuente sin datos",
        value=len(df),
    )


def _expect_min_rows(df: pd.DataFrame, min_rows: int = 1, name: str = "min_rows") -> Expectation:
    n = len(df)
    if n >= min_rows:
        status = "pass"
        detail = f"{n} filas (mínimo esperado: {min_rows})"
    elif n >= max(1, min_rows // 2):
        status = "warn"
        detail = f"Solo {n} filas (mínimo esperado: {min_rows}) — posible scraper degradado"
    else:
        status = "fail"
        detail = f"Solo {n} filas (mínimo esperado: {min_rows}) — scraper roto"
    return Expectation(name=name, status=status, detail=detail, value=n, threshold=min_rows)


def _expect_no_nulls(df: pd.DataFrame, col: str, max_null_pct: float = 0.1) -> Expectation:
    if col not in df.columns:
        return Expectation(
            name=f"no_nulls_{col}", status="fail",
            detail=f"Columna '{col}' no existe", value=None,
        )
    null_pct = df[col].isna().mean()
    if null_pct <= max_null_pct:
        status = "pass"
    elif null_pct <= max_null_pct * 3:
        status = "warn"
    else:
        status = "fail"
    return Expectation(
        name=f"no_nulls_{col}",
        status=status,
        detail=f"'{col}': {null_pct:.1%} nulos (máx {max_null_pct:.0%})",
        value=round(null_pct, 3),
        threshold=max_null_pct,
    )


def _expect_recent_data(
    df: pd.DataFrame, date_col: str, max_lag_days: int = 2, warn_lag_days: int = 1
) -> Expectation:
    if date_col not in df.columns:
        return Expectation(
            name=f"recent_{date_col}", status="warn",
            detail=f"Columna de fecha '{date_col}' no encontrada",
        )
    try:
        dates = pd.to_datetime(df[date_col], errors="coerce").dropna()
        if dates.empty:
            return Expectation(name=f"recent_{date_col}", status="fail",
                               detail="No se pueden parsear fechas")
        max_date = dates.max().date() if hasattr(dates.max(), "date") else dates.max()
        today = date.today()
        lag = (today - max_date).days
        if lag <= warn_lag_days:
            status = "pass"
        elif lag <= max_lag_days:
            status = "warn"
        else:
            status = "fail"
        return Expectation(
            name=f"recent_{date_col}",
            status=status,
            detail=f"Dato más reciente: {max_date} ({lag}d de lag, máx {max_lag_days}d)",
            value=lag,
            threshold=max_lag_days,
        )
    except Exception as exc:
        return Expectation(name=f"recent_{date_col}", status="warn",
                           detail=f"Error parseando fecha: {exc}")


def _expect_unique(df: pd.DataFrame, col: str, max_dup_pct: float = 0.05) -> Expectation:
    if col not in df.columns:
        return Expectation(name=f"unique_{col}", status="warn",
                           detail=f"Columna '{col}' no existe")
    dup_pct = 1 - df[col].nunique() / max(len(df), 1)
    status = "pass" if dup_pct <= max_dup_pct else ("warn" if dup_pct <= 0.2 else "fail")
    return Expectation(
        name=f"unique_{col}",
        status=status,
        detail=f"'{col}': {dup_pct:.1%} duplicados (máx {max_dup_pct:.0%})",
        value=round(dup_pct, 3),
        threshold=max_dup_pct,
    )


def _expect_values_in_set(df: pd.DataFrame, col: str, valid_values: set) -> Expectation:
    if col not in df.columns:
        return Expectation(name=f"values_in_set_{col}", status="warn",
                           detail=f"Columna '{col}' no existe")
    invalid = ~df[col].isin(valid_values)
    invalid_pct = invalid.mean()
    bad_samples = df.loc[invalid, col].dropna().unique()[:5].tolist()
    status = "pass" if invalid_pct == 0 else ("warn" if invalid_pct < 0.1 else "fail")
    return Expectation(
        name=f"values_in_set_{col}",
        status=status,
        detail=f"'{col}': {invalid_pct:.1%} valores fuera del set. Ej: {bad_samples}",
        value=round(invalid_pct, 3),
    )


def _expect_str_min_length(df: pd.DataFrame, col: str, min_len: int = 5) -> Expectation:
    if col not in df.columns:
        return Expectation(name=f"str_len_{col}", status="warn",
                           detail=f"Columna '{col}' no existe")
    short = (df[col].str.len().fillna(0) < min_len)
    short_pct = short.mean()
    status = "pass" if short_pct < 0.05 else ("warn" if short_pct < 0.2 else "fail")
    return Expectation(
        name=f"str_len_{col}",
        status=status,
        detail=f"'{col}': {short_pct:.1%} textos < {min_len} chars",
        value=round(short_pct, 3),
        threshold=min_len,
    )


# ── Suites de validación por fuente ──────────────────────────────────────────

def validate_boe(df: pd.DataFrame) -> QualityReport:
    """Valida un DataFrame de publicaciones BOE."""
    report = QualityReport(source="boe_publication")
    report.expectations += [
        _expect_not_empty(df),
        _expect_min_rows(df, min_rows=5),
        _expect_no_nulls(df, "titulo"),
        _expect_recent_data(df, "fecha", max_lag_days=3, warn_lag_days=1),
        _expect_unique(df, "titulo", max_dup_pct=0.05),
        _expect_str_min_length(df, "titulo", min_len=10),
        _expect_values_in_set(df,
                               "relevancia" if "relevancia" in df.columns else "relevancia_politica",
                               {"Alta", "Media", "Baja"}),
    ]
    return report


def validate_agenda(df: pd.DataFrame) -> QualityReport:
    """Valida un DataFrame de eventos de agenda."""
    report = QualityReport(source="agenda_item")
    report.expectations += [
        _expect_not_empty(df),
        _expect_min_rows(df, min_rows=2),
        _expect_no_nulls(df, "title" if "title" in df.columns else "titulo"),
        _expect_recent_data(df, "event_date" if "event_date" in df.columns else "fecha",
                            max_lag_days=7, warn_lag_days=2),
        _expect_values_in_set(df,
                               "event_type" if "event_type" in df.columns else "tipo",
                               {"GOV_COUNCIL", "PLENARY_SESSION", "COMMISSION_SESSION",
                                "PRESS_CONFERENCE", "BILATERAL_MEETING", "INTERNATIONAL_SUMMIT",
                                "PARTY_RALLY", "INSTITUTIONAL", "SOCIAL_EVENT", "OTHER"}),
    ]
    return report


def validate_parliamentary_votes(df: pd.DataFrame) -> QualityReport:
    """Valida un DataFrame de votaciones parlamentarias."""
    report = QualityReport(source="parliamentary_vote")
    report.expectations += [
        _expect_not_empty(df),
        _expect_no_nulls(df, "titulo" if "titulo" in df.columns else "title"),
        _expect_recent_data(df, "fecha" if "fecha" in df.columns else "session_date",
                            max_lag_days=14, warn_lag_days=7),
        _expect_values_in_set(df,
                               "resultado" if "resultado" in df.columns else "result",
                               {"APROBADA", "RECHAZADA", "RETIRADA", None}),
        _expect_unique(df, "titulo" if "titulo" in df.columns else "title"),
    ]
    return report


def validate_noticias(df: pd.DataFrame) -> QualityReport:
    """Valida un DataFrame de noticias de prensa."""
    report = QualityReport(source="noticias_prensa")
    report.expectations += [
        _expect_not_empty(df),
        _expect_min_rows(df, min_rows=10),
        _expect_no_nulls(df, "titulo"),
        _expect_recent_data(df, "fecha", max_lag_days=2, warn_lag_days=1),
        _expect_str_min_length(df, "titulo", min_len=15),
        _expect_unique(df, "titulo"),
    ]
    return report


def validate_actividad_congreso(df: pd.DataFrame) -> QualityReport:
    """Valida actividad parlamentaria del Congreso."""
    report = QualityReport(source="actividad_congreso")
    report.expectations += [
        _expect_not_empty(df),
        _expect_min_rows(df, min_rows=20),
        _expect_no_nulls(df, "titulo"),
        _expect_no_nulls(df, "partido_siglas", max_null_pct=0.2),
        _expect_recent_data(df, "fecha", max_lag_days=30, warn_lag_days=14),
    ]
    return report


# ── Informe consolidado ───────────────────────────────────────────────────────

def run_all_validations(**dataframes: pd.DataFrame) -> list[QualityReport]:
    """
    Ejecuta todas las validaciones sobre los DataFrames proporcionados.

    Uso:
        reports = run_all_validations(
            boe=df_boe,
            agenda=df_agenda,
            votes=df_votes,
        )
    """
    validators: dict[str, Callable] = {
        "boe":       validate_boe,
        "agenda":    validate_agenda,
        "votes":     validate_parliamentary_votes,
        "noticias":  validate_noticias,
        "congreso":  validate_actividad_congreso,
    }
    reports = []
    for name, df in dataframes.items():
        fn = validators.get(name)
        if fn is not None and df is not None:
            reports.append(fn(df))
    return reports


def reports_to_df(reports: list[QualityReport]) -> pd.DataFrame:
    """Convierte lista de QualityReport a DataFrame para mostrar en dashboard."""
    rows = []
    for r in reports:
        rows.append({
            "fuente":    r.source,
            "estado":    r.overall.upper(),
            "score":     r.score,
            "passed":    r.passed,
            "warned":    r.warned,
            "failed":    r.failed,
            "timestamp": r.timestamp[:16],
            "detalle":   "; ".join(e.detail for e in r.expectations if e.status != "pass")[:200],
        })
    return pd.DataFrame(rows)
