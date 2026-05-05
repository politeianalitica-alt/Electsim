"""
Table Extractor — Bloque 9.

Normaliza tablas extraídas por parsers a ExtractedTable con:
  - dataframe_json estandarizado
  - markdown table
  - CSV export opcional
  - confidence score
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_CSV_ROOT = Path("data/processed/documents/tables")


def normalize_table(
    document_id: str,
    raw_data: list[list[Any]],
    page_number: int | None = None,
    table_index: int = 0,
    title: str | None = None,
    method: str = "unknown",
    export_csv: bool = False,
) -> "ExtractedTable":
    """
    Normaliza una tabla cruda (lista de listas) a ExtractedTable.

    Args:
        document_id: ID del documento padre.
        raw_data: Filas de la tabla, primera fila = headers.
        page_number: Número de página donde aparece.
        table_index: Índice dentro del documento.
        title: Título de la tabla.
        method: Método de extracción.
        export_csv: Si True, guarda CSV en data/processed/documents/tables/.
    """
    from etl.sources.documents.schemas import ExtractedTable

    table_id = f"{document_id}:table:{table_index}"
    headers = []
    rows = []

    if raw_data:
        headers = [str(c) if c is not None else "" for c in raw_data[0]]
        rows = [[str(v) if v is not None else "" for v in row] for row in raw_data[1:]]

    df_json = {
        "columns": headers,
        "records": [dict(zip(headers, row)) for row in rows],
    }

    # Markdown table
    markdown = _records_to_markdown(headers, rows)

    # Confidence basada en completitud
    confidence = _compute_confidence(raw_data)

    # Exportar CSV
    csv_path = None
    if export_csv and rows:
        csv_path = _export_csv(table_id, headers, rows)

    return ExtractedTable(
        table_id=table_id,
        document_id=document_id,
        page_number=page_number,
        table_index=table_index,
        title=title,
        dataframe_json=df_json,
        markdown=markdown,
        csv_path=str(csv_path) if csv_path else None,
        confidence=confidence,
        extraction_method=method,
    )


def normalize_dataframe_table(
    document_id: str,
    df,
    page_number: int | None = None,
    table_index: int = 0,
    title: str | None = None,
    method: str = "pandas",
    export_csv: bool = False,
) -> "ExtractedTable":
    """Normaliza un DataFrame de pandas a ExtractedTable."""
    from etl.sources.documents.schemas import ExtractedTable
    try:
        table_id = f"{document_id}:table:{table_index}"
        columns = list(df.columns)
        records = df.head(500).to_dict(orient="records")
        markdown = _df_to_markdown_direct(df)
        confidence = 0.85 if len(records) > 0 else 0.3

        csv_path = None
        if export_csv and records:
            csv_path = _export_csv_from_df(table_id, df)

        return ExtractedTable(
            table_id=table_id,
            document_id=document_id,
            page_number=page_number,
            table_index=table_index,
            title=title,
            dataframe_json={"columns": columns, "records": records},
            markdown=markdown,
            csv_path=str(csv_path) if csv_path else None,
            confidence=confidence,
            extraction_method=method,
        )
    except Exception as exc:
        logger.debug("normalize_dataframe_table: %s", exc)
        from etl.sources.documents.schemas import ExtractedTable
        return ExtractedTable(
            table_id=f"{document_id}:table:{table_index}",
            document_id=document_id,
            table_index=table_index,
            extraction_method=method,
        )


def persist_tables(tables: list, engine: Any = None) -> int:
    """Persiste tablas extraídas en BD."""
    if not tables or engine is None:
        return 0

    saved = 0
    try:
        import json
        from sqlalchemy import text as sa_text
        for table in tables:
            try:
                with engine.begin() as conn:
                    conn.execute(sa_text("""
                        INSERT INTO extracted_tables (
                            table_id, document_id, page_number, table_index,
                            title, dataframe_json, markdown, csv_path,
                            confidence, extraction_method, metadata
                        ) VALUES (
                            :table_id, :document_id, :page_number, :table_index,
                            :title, :dataframe_json::jsonb, :markdown, :csv_path,
                            :confidence, :extraction_method, :metadata::jsonb
                        )
                        ON CONFLICT (table_id) DO NOTHING
                    """), {
                        "table_id": table.table_id,
                        "document_id": table.document_id,
                        "page_number": table.page_number,
                        "table_index": table.table_index,
                        "title": table.title,
                        "dataframe_json": json.dumps(table.dataframe_json),
                        "markdown": table.markdown,
                        "csv_path": table.csv_path,
                        "confidence": table.confidence,
                        "extraction_method": table.extraction_method,
                        "metadata": json.dumps(table.metadata),
                    })
                saved += 1
            except Exception as exc:
                logger.debug("persist_tables item: %s", exc)
    except Exception as exc:
        logger.debug("persist_tables: %s", exc)

    return saved


# ── Helpers internos ───────────────────────────────────────────────────────────

def _records_to_markdown(headers: list[str], rows: list[list[str]]) -> str:
    if not headers:
        return ""
    lines = ["| " + " | ".join(headers) + " |"]
    lines.append("|" + " --- |" * len(headers))
    for row in rows[:30]:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def _df_to_markdown_direct(df) -> str:
    try:
        headers = list(df.columns)
        lines = ["| " + " | ".join(str(h) for h in headers) + " |"]
        lines.append("|" + " --- |" * len(headers))
        for _, row in df.head(30).iterrows():
            lines.append("| " + " | ".join(str(v) for v in row) + " |")
        return "\n".join(lines)
    except Exception:
        return ""


def _compute_confidence(raw_data: list[list]) -> float:
    if not raw_data:
        return 0.0
    total_cells = sum(len(row) for row in raw_data)
    if total_cells == 0:
        return 0.0
    non_empty = sum(1 for row in raw_data for cell in row if cell is not None and str(cell).strip())
    return round(non_empty / total_cells, 4)


def _export_csv(table_id: str, headers: list[str], rows: list[list[str]]) -> Path | None:
    try:
        _CSV_ROOT.mkdir(parents=True, exist_ok=True)
        filename = f"{table_id.replace(':', '_')}.csv"
        path = _CSV_ROOT / filename
        import csv
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        return path
    except Exception as exc:
        logger.debug("_export_csv: %s", exc)
        return None


def _export_csv_from_df(table_id: str, df) -> Path | None:
    try:
        _CSV_ROOT.mkdir(parents=True, exist_ok=True)
        filename = f"{table_id.replace(':', '_')}.csv"
        path = _CSV_ROOT / filename
        df.to_csv(path, index=False, encoding="utf-8")
        return path
    except Exception as exc:
        logger.debug("_export_csv_from_df: %s", exc)
        return None
