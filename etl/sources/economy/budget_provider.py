"""
Budget Provider — Bloque 5.

Provider para presupuestos públicos (PGE, CCAA).
Carga datos desde CSV/Excel local (no scraping complejo).

Uso:
    python -m etl.sources.economy.budget_provider --file data/raw/budget/pge_2025.csv
"""
from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Any

from .schemas import BudgetItem

logger = logging.getLogger(__name__)

# Columnas esperadas en CSV/Excel (con aliases)
_COL_MAP: dict[str, list[str]] = {
    "ministry": ["ministerio", "ministry", "departamento", "department"],
    "programme_code": ["codigo_programa", "programa", "programme_code", "cod_prog"],
    "programme_name": ["nombre_programa", "programme_name", "descripcion_programa"],
    "chapter": ["capitulo", "chapter", "cap"],
    "initial_credit": ["credito_inicial", "initial_credit", "dotacion_inicial", "presupuesto"],
    "final_credit": ["credito_definitivo", "final_credit", "credito_definitivo"],
    "executed_amount": ["obligaciones_reconocidas", "executed_amount", "ejecucion", "pagos"],
    "geography": ["ccaa", "comunidad", "provincia", "geography", "territorio"],
    "sector": ["sector", "politica", "policy_area"],
}


def load_budget_from_csv(
    path: str | Path,
    budget_year: int,
    administration: str = "AGE",
    source: str = "pge",
    encoding: str = "utf-8",
    sep: str = ",",
) -> list[BudgetItem]:
    """
    Carga partidas presupuestarias desde un CSV/Excel.

    El CSV debe tener al menos columnas de ministerio y créditos.
    Las columnas se detectan automáticamente usando _COL_MAP.

    Args:
        path: Ruta al fichero CSV o Excel.
        budget_year: Año presupuestario.
        administration: Código de administración (AGE, CCAA, etc.).
        source: Etiqueta de fuente.
        encoding: Codificación del CSV.
        sep: Separador del CSV.

    Returns:
        Lista de BudgetItem.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Fichero presupuestario no encontrado: {path}")

    try:
        import pandas as pd
        if path.suffix.lower() in (".xlsx", ".xls"):
            df = pd.read_excel(path)
        else:
            df = pd.read_csv(path, encoding=encoding, sep=sep, low_memory=False)
    except Exception as exc:
        raise ValueError(f"Error leyendo {path}: {exc}") from exc

    # Normalizar columnas
    col_normalized = _normalize_columns(df.columns.tolist())
    df.columns = [col_normalized.get(c, c) for c in df.columns]

    items: list[BudgetItem] = []
    for _, row in df.iterrows():
        try:
            item = BudgetItem(
                source=source,
                budget_year=budget_year,
                administration=administration,
                ministry=_safe_str(row, "ministry"),
                programme_code=_safe_str(row, "programme_code"),
                programme_name=_safe_str(row, "programme_name"),
                chapter=_safe_str(row, "chapter"),
                geography=_safe_str(row, "geography"),
                sector=_safe_str(row, "sector"),
                initial_credit=_safe_float(row, "initial_credit"),
                final_credit=_safe_float(row, "final_credit"),
                executed_amount=_safe_float(row, "executed_amount"),
                raw_payload=row.to_dict(),
            )
            items.append(item)
        except Exception as exc:
            logger.debug("Budget row parse error: %s", exc)

    logger.info("Budget: %d partidas cargadas desde %s", len(items), path.name)
    return items


def load_budget_from_openspending(
    dataset_url: str,
    budget_year: int,
    limit: int = 1000,
) -> list[BudgetItem]:
    """
    Carga presupuestos desde OpenSpending (futuro).

    Args:
        dataset_url: URL del dataset en OpenSpending.
        budget_year: Año presupuestario.
        limit: Máximo de registros.

    Returns:
        Lista de BudgetItem.
    """
    # Placeholder — OpenSpending integration para fases futuras
    logger.info(
        "OpenSpending integration pendiente para versión futura. "
        "Usa load_budget_from_csv() con datos descargados."
    )
    return []


def _normalize_columns(cols: list[str]) -> dict[str, str]:
    """Mapea columnas del CSV a nombres estándar."""
    mapping: dict[str, str] = {}
    cols_lower = [c.lower().strip() for c in cols]
    for std_name, aliases in _COL_MAP.items():
        for i, col in enumerate(cols_lower):
            if col in aliases:
                mapping[cols[i]] = std_name
                break
    return mapping


def _safe_str(row: "pd.Series", col: str) -> str | None:
    val = row.get(col)
    if val is None or (hasattr(val, "__class__") and val.__class__.__name__ == "float"
                       and val != val):  # NaN check
        return None
    return str(val).strip() or None


def _safe_float(row: "pd.Series", col: str) -> float | None:
    val = row.get(col)
    if val is None:
        return None
    try:
        # Eliminar separadores de miles (. y ,)
        if isinstance(val, str):
            val = val.replace(".", "").replace(",", ".")
        return float(val)
    except (ValueError, TypeError):
        return None
