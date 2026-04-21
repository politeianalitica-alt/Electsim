from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

import pandas as pd


@dataclass
class ValidationIssue:
    level: str
    code: str
    message: str
    observed: Any = None
    threshold: Any = None


@dataclass
class ValidationReport:
    metrics: dict[str, Any]
    issues: list[ValidationIssue] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not any(issue.level == "error" for issue in self.issues)

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [issue for issue in self.issues if issue.level == "warning"]

    def to_jsonable(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "metrics": self.metrics,
            "issues": [
                {
                    "level": issue.level,
                    "code": issue.code,
                    "message": issue.message,
                    "observed": issue.observed,
                    "threshold": issue.threshold,
                }
                for issue in self.issues
            ],
        }


def _as_series(df: pd.DataFrame, column: str) -> pd.Series:
    if column in df.columns:
        return df[column]
    return pd.Series([None] * len(df), index=df.index)


def validate_frame(
    df: pd.DataFrame,
    *,
    key_columns: tuple[str, ...] = (),
    unique_columns: tuple[str, ...] = (),
    numeric_columns: tuple[str, ...] = (),
    date_columns: tuple[str, ...] = (),
    previous_metrics: dict[str, Any] | None = None,
    volume_drop_warn_pct: float = 0.35,
    extra_validators: tuple[Callable[[pd.DataFrame], list[ValidationIssue]], ...] = (),
) -> ValidationReport:
    metrics: dict[str, Any] = {"row_count": int(len(df))}
    issues: list[ValidationIssue] = []

    for col in key_columns:
        series = _as_series(df, col)
        nulls = int(series.isna().sum() + (series.astype(str).str.strip() == "").sum())
        metrics[f"{col}_nulls"] = nulls
        if nulls > 0:
            issues.append(
                ValidationIssue(
                    level="error",
                    code=f"{col}_not_null",
                    message=f"La clave '{col}' contiene valores nulos o vacíos",
                    observed=nulls,
                    threshold=0,
                )
            )

    if unique_columns:
        duplicated = int(df.duplicated(list(unique_columns), keep=False).sum())
        metrics["duplicate_rows"] = duplicated
        if duplicated > 0:
            issues.append(
                ValidationIssue(
                    level="error",
                    code="duplicate_rows",
                    message=f"Se detectaron duplicados sobre {unique_columns}",
                    observed=duplicated,
                    threshold=0,
                )
            )

    for col in numeric_columns:
        coerced = pd.to_numeric(_as_series(df, col), errors="coerce")
        invalid = int(coerced.isna().sum() - _as_series(df, col).isna().sum())
        metrics[f"{col}_invalid_numeric"] = max(invalid, 0)
        if invalid > 0:
            issues.append(
                ValidationIssue(
                    level="error",
                    code=f"{col}_numeric",
                    message=f"La columna '{col}' contiene valores no numéricos",
                    observed=invalid,
                    threshold=0,
                )
            )

    for col in date_columns:
        parsed = pd.to_datetime(_as_series(df, col), errors="coerce")
        invalid = int(parsed.isna().sum() - _as_series(df, col).isna().sum())
        metrics[f"{col}_invalid_date"] = max(invalid, 0)
        if invalid > 0:
            issues.append(
                ValidationIssue(
                    level="error",
                    code=f"{col}_date",
                    message=f"La columna '{col}' contiene fechas inválidas",
                    observed=invalid,
                    threshold=0,
                )
            )

    previous = previous_metrics or {}
    previous_rows = int(previous.get("row_count") or 0)
    current_rows = int(metrics["row_count"])
    if previous_rows > 0:
        min_expected = int(previous_rows * (1.0 - volume_drop_warn_pct))
        metrics["previous_row_count"] = previous_rows
        if current_rows < min_expected:
            issues.append(
                ValidationIssue(
                    level="warning",
                    code="row_count_drop",
                    message="Caída brusca de volumen frente a la última ejecución exitosa",
                    observed=current_rows,
                    threshold=f">= {min_expected}",
                )
            )

    for validator in extra_validators:
        issues.extend(validator(df))

    return ValidationReport(metrics=metrics, issues=issues)


def validate_results_frame(
    df: pd.DataFrame,
    warn_pct: float,
    previous_metrics: dict[str, Any] | None = None,
) -> ValidationReport:
    def _extra(frame: pd.DataFrame) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        votos = pd.to_numeric(_as_series(frame, "votos"), errors="coerce").fillna(0)
        escanos = pd.to_numeric(_as_series(frame, "candidatos_electos"), errors="coerce").fillna(0)
        pct = pd.to_numeric(_as_series(frame, "porcentaje"), errors="coerce")
        if (votos < 0).any():
            issues.append(
                ValidationIssue("error", "votes_negative", "Hay registros con votos negativos")
            )
        if (escanos < 0).any():
            issues.append(
                ValidationIssue("error", "seats_negative", "Hay registros con escaños negativos")
            )
        fuera_pct = int(((pct.dropna() < 0) | (pct.dropna() > 100)).sum())
        if fuera_pct > 0:
            issues.append(
                ValidationIssue(
                    "error",
                    "pct_range",
                    "Hay porcentajes de voto fuera del rango [0, 100]",
                    observed=fuera_pct,
                    threshold=0,
                )
            )
        return issues

    return validate_frame(
        df,
        key_columns=("codigo_provincia", "codigo_partido", "fecha_eleccion"),
        unique_columns=("codigo_provincia", "codigo_partido", "fecha_eleccion"),
        numeric_columns=("votos", "candidatos_electos", "porcentaje"),
        date_columns=("fecha_eleccion",),
        previous_metrics=previous_metrics,
        volume_drop_warn_pct=warn_pct,
        extra_validators=(_extra,),
    )


def validate_poll_rows(
    df: pd.DataFrame,
    warn_pct: float,
    previous_metrics: dict[str, Any] | None = None,
) -> ValidationReport:
    def _extra(frame: pd.DataFrame) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        pct = pd.to_numeric(_as_series(frame, "porcentaje"), errors="coerce")
        fuera = int(((pct.dropna() < 0) | (pct.dropna() > 100)).sum())
        if fuera > 0:
            issues.append(
                ValidationIssue(
                    "error",
                    "poll_pct_range",
                    "Hay porcentajes de encuesta fuera del rango [0, 100]",
                    observed=fuera,
                    threshold=0,
                )
            )
        return issues

    return validate_frame(
        df,
        key_columns=("poll_key", "partido", "fecha_publicacion"),
        unique_columns=("poll_key", "partido"),
        numeric_columns=("porcentaje",),
        date_columns=("fecha_publicacion",),
        previous_metrics=previous_metrics,
        volume_drop_warn_pct=warn_pct,
        extra_validators=(_extra,),
    )


def validate_geography_rows(
    df: pd.DataFrame,
    warn_pct: float,
    previous_metrics: dict[str, Any] | None = None,
) -> ValidationReport:
    return validate_frame(
        df,
        key_columns=("level", "codigo_ine", "nombre"),
        unique_columns=("level", "codigo_ine"),
        previous_metrics=previous_metrics,
        volume_drop_warn_pct=warn_pct,
    )
