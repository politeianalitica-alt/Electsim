"""
Dataset Profiler — Bloque 10.

Genera un perfil estadístico de un recurso de dataset.
Máximo 5.000 filas para evitar consumo excesivo de memoria.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from etl.sources.opendata.schemas import DatasetProfile, OpenDatasetResource

logger = logging.getLogger(__name__)

MAX_ROWS = 5_000

# Patrones para detectar columnas geográficas
_GEO_PATTERNS = re.compile(
    r"(lat(itud)?|lon(gitud)?|lng|geo|coordenada|municipio|provincia|ccaa|"
    r"comunidad|comarca|pais|country|region|nuts|ine_cod|cod_mun|cp|postal)",
    re.IGNORECASE,
)

# Patrones para detectar columnas de fecha/tiempo
_DATE_PATTERNS = re.compile(
    r"(fecha|date|ano|year|periodo|mes|month|trimestre|quarter|"
    r"ejercicio|timestamp|created|updated|publicado|inicio|fin)",
    re.IGNORECASE,
)

# Palabras clave por sector/topic
_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "electoral": ["elecciones", "votos", "partido", "circunscripcion", "escanos", "senado", "congreso"],
    "economia": ["pib", "iva", "irpf", "paro", "empleo", "sueldo", "salario", "euros", "presupuesto"],
    "medio_ambiente": ["co2", "emisiones", "temperatura", "precipitacion", "contaminacion", "biodiversidad"],
    "sanidad": ["hospitales", "camas", "medicos", "mortalidad", "natalidad", "enfermedades", "vacunas"],
    "educacion": ["alumnos", "matriculados", "escuelas", "universidades", "titulados", "abandono"],
    "transporte": ["viajes", "pasajeros", "tráfico", "accidentes", "carreteras", "tren", "metro", "aeropuerto"],
    "contratacion": ["licitacion", "adjudicacion", "contrato", "importe", "proveedor", "cpv", "suministro"],
    "legislacion": ["ley", "decreto", "orden", "boe", "disposicion", "reglamento", "normativa"],
}


def profile_csv_resource(
    url: str,
    nrows: int = MAX_ROWS,
    timeout: int = 30,
) -> DatasetProfile | None:
    """
    Perfila un recurso CSV.

    Args:
        url: URL del CSV.
        nrows: Máximo de filas a analizar.
        timeout: Timeout de descarga.

    Returns:
        DatasetProfile o None si falla.
    """
    try:
        from etl.sources.opendata.resource_downloader import stream_csv_resource
        df = stream_csv_resource(url, nrows=nrows, timeout=timeout)
        if df is None or df.empty:
            return None
        return _profile_dataframe(df, url)
    except Exception as exc:
        logger.debug("profile_csv_resource(%s): %s", url, exc)
        return None


def profile_json_resource(
    url: str,
    nrows: int = MAX_ROWS,
    timeout: int = 30,
) -> DatasetProfile | None:
    """
    Perfila un recurso JSON.

    Args:
        url: URL del JSON.
        nrows: Máximo de registros a analizar.
        timeout: Timeout de descarga.

    Returns:
        DatasetProfile o None si falla.
    """
    try:
        import pandas as pd
        from etl.sources.opendata.resource_downloader import load_json_resource
        data = load_json_resource(url, timeout=timeout)
        if data is None:
            return None

        if isinstance(data, list):
            df = pd.DataFrame(data[:nrows])
        elif isinstance(data, dict):
            for key in ("data", "results", "items", "features", "records"):
                if isinstance(data.get(key), list):
                    df = pd.DataFrame(data[key][:nrows])
                    break
            else:
                df = pd.DataFrame([data])
        else:
            return None

        if df.empty:
            return None
        return _profile_dataframe(df, url)
    except Exception as exc:
        logger.debug("profile_json_resource(%s): %s", url, exc)
        return None


def profile_resource(
    resource: OpenDatasetResource,
    nrows: int = MAX_ROWS,
    timeout: int = 30,
) -> DatasetProfile | None:
    """
    Perfila un OpenDatasetResource según su formato.

    Returns:
        DatasetProfile o None si el formato no es soportado.
    """
    url = resource.download_url or resource.url
    if not url:
        return None

    fmt = (resource.format or "").upper()

    if fmt in ("CSV", "TSV"):
        return profile_csv_resource(url, nrows=nrows, timeout=timeout)
    if fmt in ("JSON", "GEOJSON"):
        return profile_json_resource(url, nrows=nrows, timeout=timeout)
    if fmt in ("XLSX", "XLS"):
        try:
            from etl.sources.opendata.resource_downloader import stream_excel_resource
            df = stream_excel_resource(url, nrows=nrows, timeout=timeout)
            if df is not None and not df.empty:
                return _profile_dataframe(df, url)
        except Exception as exc:
            logger.debug("profile_resource XLSX(%s): %s", url, exc)
    return None


def _profile_dataframe(df: "pd.DataFrame", source_url: str) -> DatasetProfile:
    """Genera un DatasetProfile desde un DataFrame."""
    import pandas as pd

    row_count = len(df)
    col_count = len(df.columns)

    # Ratio de nulos
    null_ratio = float(df.isnull().values.mean()) if row_count > 0 else 0.0

    # Columnas detectadas
    geo_cols = detect_geographic_columns(df)
    date_cols = detect_date_columns(df)
    topic_cols = detect_topic_columns(df)

    # Geografías detectadas
    detected_geos = _infer_geographies(df, geo_cols)

    # Rango de fechas detectado
    detected_dates: list[str] = []
    if date_cols:
        detected_dates = _infer_date_range(df, date_cols)

    # Topics
    detected_topics = _infer_topics(df)

    # Sectores
    detected_sectors = _infer_sectors_from_topics(detected_topics)

    # Muestra
    sample_rows: list[dict] = []
    if row_count > 0:
        sample = df.head(3)
        for _, row in sample.iterrows():
            sample_rows.append({
                k: (str(v) if v is not None and str(v) != "nan" else None)
                for k, v in row.items()
            })

    # null_ratio como dict por columna (formato que espera el schema)
    null_by_col: dict[str, float] = {}
    if row_count > 0:
        for col in df.columns:
            null_by_col[str(col)] = round(float(df[col].isnull().mean()), 4)

    return DatasetProfile(
        dataset_id="__profiled__",  # sustituir en callers que tengan el ID
        rows_count=row_count,
        columns_count=col_count,
        null_ratio=null_by_col,
        detected_geographies=detected_geos,
        detected_dates=detected_dates,
        detected_topics=detected_topics,
        detected_sectors=detected_sectors,
        sample_rows=sample_rows,
    )


def detect_geographic_columns(df: "pd.DataFrame") -> list[str]:
    """Detecta columnas que representan información geográfica."""
    geo_cols = []
    for col in df.columns:
        if _GEO_PATTERNS.search(str(col)):
            geo_cols.append(col)
    return geo_cols


def detect_date_columns(df: "pd.DataFrame") -> list[str]:
    """Detecta columnas que representan fechas o periodos."""
    import pandas as pd

    date_cols = []
    for col in df.columns:
        col_str = str(col)
        if _DATE_PATTERNS.search(col_str):
            date_cols.append(col)
            continue
        # Intentar parsear valores como fechas
        try:
            sample = df[col].dropna().head(10)
            if len(sample) > 0 and sample.dtype == object:
                parsed = pd.to_datetime(sample, errors="coerce", infer_datetime_format=True)
                if parsed.notna().sum() >= len(sample) * 0.7:
                    date_cols.append(col)
        except Exception:
            pass

    return list(dict.fromkeys(date_cols))  # eliminar duplicados manteniendo orden


def detect_topic_columns(df: "pd.DataFrame") -> list[str]:
    """Detecta columnas de texto que podrían contener temas/categorías."""
    topic_cols = []
    for col in df.columns:
        try:
            if df[col].dtype == object:
                unique_ratio = df[col].nunique() / max(len(df), 1)
                # Columna categórica: pocos valores únicos o nombre temático
                if unique_ratio < 0.2 or any(
                    kw in str(col).lower()
                    for kw in ("tema", "categoria", "tipo", "sector", "ambito", "area", "tag")
                ):
                    topic_cols.append(col)
        except Exception:
            pass
    return topic_cols


def _infer_geographies(df: "pd.DataFrame", geo_cols: list[str]) -> list[str]:
    """Infiere geografías a partir de columnas detectadas."""
    geos = set()
    for col in geo_cols:
        col_lower = col.lower()
        if "municipio" in col_lower or "cod_mun" in col_lower:
            geos.add("municipalities")
        elif "provincia" in col_lower:
            geos.add("provinces")
        elif "ccaa" in col_lower or "comunidad" in col_lower or "nuts" in col_lower:
            geos.add("autonomous_communities")
        elif "pais" in col_lower or "country" in col_lower:
            geos.add("countries")
        elif "lat" in col_lower or "lon" in col_lower:
            geos.add("coordinates")
    return sorted(geos)


def _infer_date_range(df: "pd.DataFrame", date_cols: list[str]) -> list[str]:
    """Infiere rango de fechas a partir de columnas detectadas."""
    import pandas as pd
    dates = []
    for col in date_cols[:2]:  # Máximo 2 columnas de fecha
        try:
            parsed = pd.to_datetime(df[col], errors="coerce", infer_datetime_format=True).dropna()
            if len(parsed) > 0:
                dates.append(str(parsed.min().year))
                dates.append(str(parsed.max().year))
        except Exception:
            pass
    return sorted(set(dates))


def _infer_topics(df: "pd.DataFrame") -> list[str]:
    """Infiere topics a partir del nombre de las columnas."""
    all_cols = " ".join(str(c).lower() for c in df.columns)
    found = []
    for topic, keywords in _TOPIC_KEYWORDS.items():
        if any(kw in all_cols for kw in keywords):
            found.append(topic)
    return found


def _infer_sectors_from_topics(topics: list[str]) -> list[str]:
    """Mapea topics a sectores."""
    _TOPIC_SECTOR_MAP = {
        "electoral": "politica",
        "economia": "economia",
        "medio_ambiente": "medio_ambiente",
        "sanidad": "sanidad",
        "educacion": "educacion",
        "transporte": "infraestructuras",
        "contratacion": "contratacion_publica",
        "legislacion": "legislacion",
    }
    return [_TOPIC_SECTOR_MAP[t] for t in topics if t in _TOPIC_SECTOR_MAP]
