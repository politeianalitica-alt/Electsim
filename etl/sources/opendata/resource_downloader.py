"""
Resource Downloader — Bloque 10.

Descarga y carga recursos de datasets de datos abiertos.
No auto-descarga sin aprobación de plan.
"""
from __future__ import annotations

import io
import logging
import os
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from etl.sources.opendata.schemas import OpenDatasetResource

logger = logging.getLogger(__name__)

# Extensiones por formato
_FORMAT_MAP: dict[str, str] = {
    ".csv": "CSV",
    ".tsv": "TSV",
    ".json": "JSON",
    ".jsonl": "JSONL",
    ".geojson": "GeoJSON",
    ".xml": "XML",
    ".rdf": "RDF",
    ".ttl": "Turtle",
    ".xlsx": "XLSX",
    ".xls": "XLS",
    ".ods": "ODS",
    ".zip": "ZIP",
    ".gz": "GZ",
    ".pdf": "PDF",
    ".html": "HTML",
    ".htm": "HTML",
}

_TABULAR_FORMATS = frozenset(["CSV", "TSV", "XLSX", "XLS", "ODS"])
_JSON_FORMATS = frozenset(["JSON", "JSONL", "GeoJSON"])
_DOCUMENT_FORMATS = frozenset(["PDF", "HTML"])
_GEOSPATIAL_FORMATS = frozenset(["GeoJSON", "KML", "KMZ", "SHP", "GPKG"])


def detect_resource_format(
    url: str,
    content_type: str | None = None,
) -> str:
    """
    Detecta el formato de un recurso por su URL o Content-Type.

    Args:
        url: URL del recurso.
        content_type: Cabecera Content-Type (opcional).

    Returns:
        Formato en mayúsculas (ej: 'CSV', 'JSON', 'UNKNOWN').
    """
    # Por Content-Type
    if content_type:
        ct = content_type.lower().split(";")[0].strip()
        if "csv" in ct:
            return "CSV"
        if "json" in ct:
            return "JSON" if "geo" not in ct else "GeoJSON"
        if "xml" in ct or "rdf" in ct:
            return "XML"
        if "pdf" in ct:
            return "PDF"
        if "xlsx" in ct or "spreadsheetml" in ct:
            return "XLSX"
        if "zip" in ct:
            return "ZIP"
        if "html" in ct:
            return "HTML"

    # Por extensión de URL
    try:
        path = urlparse(url).path.lower()
        for ext, fmt in _FORMAT_MAP.items():
            if path.endswith(ext):
                return fmt
    except Exception:
        pass

    # Por contenido de la URL
    url_lower = url.lower()
    if "csv" in url_lower:
        return "CSV"
    if "json" in url_lower:
        return "JSON"
    if "sparql" in url_lower:
        return "SPARQL"
    if "wsdl" in url_lower or "soap" in url_lower:
        return "SOAP"

    return "UNKNOWN"


def download_resource(
    url: str,
    output_dir: str | None = None,
    filename: str | None = None,
    timeout: int = 60,
    max_bytes: int = 100 * 1024 * 1024,  # 100 MB
) -> str | None:
    """
    Descarga un recurso a disco.

    Args:
        url: URL del recurso.
        output_dir: Directorio de salida (usa tempdir si None).
        filename: Nombre de archivo (infiere de URL si None).
        timeout: Timeout en segundos.
        max_bytes: Tamaño máximo permitido.

    Returns:
        Ruta al archivo descargado, o None si falla.
    """
    try:
        import requests

        if output_dir is None:
            output_dir = tempfile.gettempdir()
        os.makedirs(output_dir, exist_ok=True)

        if filename is None:
            parsed = urlparse(url)
            filename = Path(parsed.path).name or "resource.bin"

        output_path = os.path.join(output_dir, filename)

        with requests.get(url, stream=True, timeout=timeout) as resp:
            resp.raise_for_status()
            total = 0
            with open(output_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    if chunk:
                        total += len(chunk)
                        if total > max_bytes:
                            logger.warning("download_resource: tamaño máximo superado (%s bytes) para %s", max_bytes, url)
                            return None
                        f.write(chunk)

        logger.debug("download_resource: descargado %s → %s (%d bytes)", url, output_path, total)
        return output_path

    except Exception as exc:
        logger.debug("download_resource(%s): %s", url, exc)
        return None


def stream_csv_resource(
    url: str,
    nrows: int | None = 5000,
    timeout: int = 30,
    encoding: str = "utf-8",
) -> "pd.DataFrame":
    """
    Carga un recurso CSV directamente en un DataFrame.

    Args:
        url: URL del CSV.
        nrows: Máximo de filas (None = todas).
        timeout: Timeout en segundos.
        encoding: Encoding del fichero.

    Returns:
        DataFrame con los datos. Vacío si falla.
    """
    try:
        import pandas as pd
        import requests

        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()

        # Detectar encoding real
        if resp.encoding and resp.encoding.lower() not in ("utf-8", "utf8"):
            encoding = resp.encoding

        content = io.StringIO(resp.content.decode(encoding, errors="replace"))
        df = pd.read_csv(content, nrows=nrows, low_memory=False)
        logger.debug("stream_csv_resource: %d filas x %d cols desde %s", len(df), len(df.columns), url)
        return df

    except Exception as exc:
        logger.debug("stream_csv_resource(%s): %s", url, exc)
        try:
            import pandas as pd
            return pd.DataFrame()
        except ImportError:
            return None  # type: ignore


def load_json_resource(
    url: str,
    timeout: int = 30,
    max_bytes: int = 50 * 1024 * 1024,
) -> dict | list | None:
    """
    Carga un recurso JSON desde una URL.

    Args:
        url: URL del JSON.
        timeout: Timeout en segundos.
        max_bytes: Tamaño máximo permitido.

    Returns:
        Dict o lista con los datos. None si falla.
    """
    try:
        import requests

        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()

        if len(resp.content) > max_bytes:
            logger.warning("load_json_resource: respuesta demasiado grande (%d bytes) para %s", len(resp.content), url)
            return None

        return resp.json()

    except Exception as exc:
        logger.debug("load_json_resource(%s): %s", url, exc)
        return None


def stream_excel_resource(
    url: str,
    sheet_name: int | str = 0,
    nrows: int | None = 5000,
    timeout: int = 30,
) -> "pd.DataFrame":
    """
    Carga un recurso Excel (XLSX/XLS) en un DataFrame.

    Returns:
        DataFrame. Vacío si falla.
    """
    try:
        import pandas as pd
        import requests

        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()

        df = pd.read_excel(io.BytesIO(resp.content), sheet_name=sheet_name, nrows=nrows)
        logger.debug("stream_excel_resource: %d filas desde %s", len(df), url)
        return df

    except Exception as exc:
        logger.debug("stream_excel_resource(%s): %s", url, exc)
        try:
            import pandas as pd
            return pd.DataFrame()
        except ImportError:
            return None  # type: ignore


def load_resource_as_dataframe(
    resource: OpenDatasetResource,
    nrows: int = 5000,
    timeout: int = 30,
) -> "pd.DataFrame | None":
    """
    Carga un OpenDatasetResource como DataFrame según su formato.

    Args:
        resource: Recurso a cargar.
        nrows: Máximo de filas.
        timeout: Timeout en segundos.

    Returns:
        DataFrame o None si el formato no es tabular/no disponible.
    """
    url = resource.download_url or resource.url
    if not url:
        logger.debug("load_resource_as_dataframe: sin URL para %s", resource.resource_id)
        return None

    fmt = (resource.format or "UNKNOWN").upper()

    if fmt in ("CSV", "TSV"):
        return stream_csv_resource(url, nrows=nrows, timeout=timeout)
    if fmt in ("XLSX", "XLS", "ODS"):
        return stream_excel_resource(url, nrows=nrows, timeout=timeout)
    if fmt in ("JSON", "GEOJSON"):
        data = load_json_resource(url, timeout=timeout)
        if data is None:
            return None
        try:
            import pandas as pd
            if isinstance(data, list):
                return pd.DataFrame(data[:nrows])
            if isinstance(data, dict):
                # Intentar extraer array principal
                for key in ("data", "results", "items", "features", "records"):
                    if isinstance(data.get(key), list):
                        return pd.DataFrame(data[key][:nrows])
                return pd.DataFrame([data])
        except Exception as exc:
            logger.debug("load_resource_as_dataframe JSON: %s", exc)
            return None

    logger.debug("load_resource_as_dataframe: formato %s no soportado para %s", fmt, resource.resource_id)
    return None


def get_resource_metadata(
    url: str,
    timeout: int = 15,
) -> dict[str, Any]:
    """
    Obtiene metadatos HTTP de un recurso sin descargarlo.

    Returns:
        Dict con: format, content_type, content_length, accessible, status_code.
    """
    result: dict[str, Any] = {
        "format": "UNKNOWN",
        "content_type": None,
        "content_length": None,
        "accessible": False,
        "status_code": None,
    }
    try:
        import requests

        resp = requests.head(url, timeout=timeout, allow_redirects=True)
        result["status_code"] = resp.status_code
        result["accessible"] = resp.status_code < 400

        ct = resp.headers.get("Content-Type", "")
        result["content_type"] = ct

        cl = resp.headers.get("Content-Length")
        if cl and cl.isdigit():
            result["content_length"] = int(cl)

        result["format"] = detect_resource_format(url, ct)

    except Exception as exc:
        logger.debug("get_resource_metadata(%s): %s", url, exc)

    return result
