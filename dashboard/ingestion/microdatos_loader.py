"""
Cargador de microdatos de encuestas propias y CIS.

Soporta formatos: CSV, XLSX, SAV (SPSS).
Mapea variables CIS estándar a un esquema normalizado.
Persiste los datos en la capa bronze (parquet) y extrae metadatos hacia PostgreSQL.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd

from dashboard.config import settings
from dashboard.storage.bronze import write_bronze, read_bronze

logger = logging.getLogger(__name__)

# ── Mapeo canónico de nombres CIS → nombre interno ────────────────────────────
# Claves = posibles nombres en archivos CIS; valores = nombre normalizado.
_CIS_VAR_MAP: dict[str, str] = {
    # Sociodemografía
    "SEXO": "sexo",
    "EDAD": "edad",
    "EDADTR": "edad_tramo",
    "ESTUDIOS": "estudios",
    "SITLAB": "sitlab",
    "CLASESUB": "clase_subjetiva",
    "CCAA": "ccaa",
    "PROV": "provincia",
    "HABITAT": "habitat",
    "RELIG": "religion",
    "NACION": "nacionalidad",
    # Ideología y partido
    "ESCIDEOL": "escideol",
    "RECUERDO": "recuerdo_voto",
    "RECUERDOPR": "recuerdo_voto",
    "CERCANIA": "cercania_partido",
    "CERCANIAPR": "cercania_partido",
    # Intención de voto
    "INTENCIONG": "intencion_voto",
    "INTENCIONGR": "intencion_voto_grupo",
    "VOTOSEG": "voto_seguro",
    "PREFPTE": "pref_presidente",
    # Valoraciones de líderes (prefijos)
    "VALPTE": "valoracion_pte_gobierno",
    "VALLIDER1": "valoracion_lider1",
    "VALLIDER2": "valoracion_lider2",
    "VALLIDER3": "valoracion_lider3",
    "VALLIDER4": "valoracion_lider4",
    "VALLIDER5": "valoracion_lider5",
    # Situación económica (varía por barómetro: P12, P13, SITECOPER, etc.)
    "SITECOPER": "situacion_eco_personal",
    "SITECOGES": "situacion_eco_general",
    "P12": "situacion_eco_personal",
    "P13": "situacion_eco_general",
    "P14": "situacion_eco_personal_futura",
    # Valoración gobierno
    "VALGOB": "valoracion_gobierno",
    "VALGOBGES": "valoracion_gestion_gobierno",
    # Problemas
    "P1": "problema_principal_1",
    "P2": "problema_principal_2",
    "P3": "problema_personal_1",
    "P4": "problema_personal_2",
    # Pesos muestrales
    "PESO": "peso",
    "WGHT": "peso",
    "WEIGHT": "peso",
    "PONDERA": "peso",
}

# Etiquetas para variables categóricas CIS
ETIQUETAS_SEXO = {1: "Hombre", 2: "Mujer"}
ETIQUETAS_ESTUDIOS = {
    1: "Sin estudios", 2: "Primaria incompleta", 3: "Primaria completa (EGB/Bachillerato elemental)",
    4: "Secundaria (ESO/Bachillerato)", 5: "FP medio/superior", 6: "Universitaria (diplomatura/grado)",
    7: "Universitaria (licenciatura/máster/doctorado)", 98: "No sabe", 99: "No contesta",
}
ETIQUETAS_SITLAB = {
    1: "Trabajando (cuenta ajena)", 2: "Trabajando (cuenta propia)", 3: "Parado/buscando empleo",
    4: "Jubilado/pensionista", 5: "Estudiante", 6: "Labores del hogar",
    7: "Incapacitado/a permanente", 8: "Otra situación", 98: "No sabe", 99: "No contesta",
}
ETIQUETAS_CLASESUB = {
    1: "Alta/Media-alta", 2: "Media", 3: "Media-baja", 4: "Obrera", 5: "Pobre/Baja",
    98: "No sabe", 99: "No contesta",
}
ETIQUETAS_HABITAT = {
    1: "Menos de 2.000 hab.", 2: "2.001–10.000", 3: "10.001–50.000",
    4: "50.001–100.000", 5: "100.001–400.000", 6: "400.001–1.000.000", 7: "Más de 1.000.000",
}
ETIQUETAS_CCAA = {
    1: "Andalucía", 2: "Aragón", 3: "Asturias", 4: "Baleares", 5: "Canarias",
    6: "Cantabria", 7: "Castilla-La Mancha", 8: "Castilla y León", 9: "Cataluña",
    10: "C. Valenciana", 11: "Extremadura", 12: "Galicia", 13: "Madrid",
    14: "Murcia", 15: "Navarra", 16: "País Vasco", 17: "La Rioja",
    18: "Ceuta", 19: "Melilla",
}

# Variables que deberían ser numéricas para análisis
_NUMERIC_VARS = {"edad", "escideol", "peso", "valoracion_pte_gobierno",
                 "valoracion_lider1", "valoracion_lider2", "valoracion_lider3",
                 "valoracion_gobierno", "situacion_eco_personal", "situacion_eco_general"}

# Código "no responde / no sabe" estándar CIS
_MISSING_CODES = {97, 98, 99, 997, 998, 999, -1, -99}


def _read_file(path: Path) -> pd.DataFrame:
    """Lee el archivo y devuelve un DataFrame raw."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                for sep in (";", ",", "\t"):
                    try:
                        df = pd.read_csv(path, sep=sep, encoding=enc, low_memory=False)
                        if df.shape[1] > 2:
                            logger.info("CSV leído: %s (enc=%s, sep=%r, filas=%d, cols=%d)",
                                        path.name, enc, sep, len(df), df.shape[1])
                            return df
                    except Exception:
                        continue
            except Exception:
                continue
    elif suffix in (".xlsx", ".xls"):
        return pd.read_excel(path, engine="openpyxl" if suffix == ".xlsx" else "xlrd")
    elif suffix == ".sav":
        try:
            import pyreadstat  # type: ignore
            df, meta = pyreadstat.read_sav(str(path))
            logger.info("SPSS leído: %s (filas=%d, cols=%d)", path.name, len(df), df.shape[1])
            return df
        except ImportError:
            logger.error("pyreadstat no instalado. Ejecuta: pip install pyreadstat")
            raise
    elif suffix == ".parquet":
        return pd.read_parquet(path)
    else:
        raise ValueError(f"Formato no soportado: {suffix}. Use CSV, XLSX, SAV o Parquet.")
    return pd.DataFrame()


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Renombra columnas usando el mapa CIS → interno y estandariza."""
    df = df.copy()
    df.columns = [str(c).strip().upper() for c in df.columns]
    rename_map = {k.upper(): v for k, v in _CIS_VAR_MAP.items() if k.upper() in df.columns}
    df = df.rename(columns=rename_map)

    # Añadir columna peso si no existe (peso = 1 para todos)
    if "peso" not in df.columns:
        df["peso"] = 1.0

    # Limpiar códigos de valores perdidos → NaN en variables numéricas
    for col in df.columns:
        if col in _NUMERIC_VARS:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].where(~df[col].isin(_MISSING_CODES), other=pd.NA)

    return df


def _infer_metadata(df: pd.DataFrame, path: Path, codigo_estudio: str | None = None) -> dict[str, Any]:
    """Extrae metadatos básicos del DataFrame."""
    vars_disponibles = sorted(df.columns.tolist())
    has_voto = "intencion_voto" in df.columns or "intencion_voto_grupo" in df.columns
    has_ideo = "escideol" in df.columns
    has_recuerdo = "recuerdo_voto" in df.columns
    has_peso = "peso" in df.columns and df["peso"].notna().sum() > 0

    return {
        "codigo_estudio": codigo_estudio or _generate_study_code(path),
        "titulo": f"Encuesta: {path.stem}",
        "fuente": "Propio" if codigo_estudio is None else "CIS",
        "n_registros": len(df),
        "n_variables": df.shape[1],
        "archivo_bronze": str(path.stem),
        "variables_json": json.dumps(vars_disponibles),
        "descripcion": (
            f"{'✓' if has_voto else '✗'} Intención de voto  |  "
            f"{'✓' if has_ideo else '✗'} Escala ideológica  |  "
            f"{'✓' if has_recuerdo else '✗'} Recuerdo de voto  |  "
            f"{'✓' if has_peso else '✗'} Pesos muestrales"
        ),
    }


def _generate_study_code(path: Path) -> str:
    h = hashlib.md5(path.name.encode()).hexdigest()[:8].upper()
    return f"PROPIO_{h}"


def load_microdata_file(
    path: str | Path,
    codigo_estudio: str | None = None,
    data_dir: str | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Carga un archivo de microdatos, normaliza columnas y persiste en bronze.

    Returns
    -------
    df : DataFrame normalizado
    metadata : dict con metadatos del estudio
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {path}")

    data_dir = data_dir or settings.data_dir
    df_raw = _read_file(path)
    df = _normalize_columns(df_raw)

    metadata = _infer_metadata(df, path, codigo_estudio)

    # Guardar en bronze
    bronze_name = f"microdatos_{metadata['codigo_estudio'].lower()}"
    write_bronze(df, bronze_name, data_dir=data_dir)
    metadata["archivo_bronze"] = bronze_name

    logger.info(
        "Microdatos cargados: %s → %d registros, %d variables",
        path.name, len(df), df.shape[1],
    )
    return df, metadata


def load_microdata_directory(
    directory: str | Path,
    data_dir: str | None = None,
    glob_pattern: str = "*.csv",
) -> list[tuple[pd.DataFrame, dict[str, Any]]]:
    """
    Carga todos los archivos de microdatos de un directorio.

    Soporta patrones como ``*.csv``, ``*.sav``, ``*.xlsx``, ``**/*.csv``.
    """
    directory = Path(directory)
    if not directory.exists():
        raise FileNotFoundError(f"Directorio no encontrado: {directory}")

    results = []
    patterns = (
        [glob_pattern]
        if glob_pattern != "*"
        else ["*.csv", "*.xlsx", "*.xls", "*.sav", "*.parquet"]
    )
    found_files: list[Path] = []
    for pat in patterns:
        found_files.extend(sorted(directory.glob(pat)))
        found_files.extend(sorted(directory.glob(f"**/{pat}")))

    # Deduplicar
    seen: set[Path] = set()
    unique_files = []
    for f in found_files:
        if f not in seen:
            seen.add(f)
            unique_files.append(f)

    logger.info("Directorio %s: %d archivo(s) encontrados", directory, len(unique_files))

    for fpath in unique_files:
        try:
            df, meta = load_microdata_file(fpath, data_dir=data_dir)
            results.append((df, meta))
        except Exception as exc:
            logger.error("Error cargando %s: %s", fpath.name, exc)

    return results


def get_loaded_studies(data_dir: str | None = None) -> list[dict[str, Any]]:
    """Lista los estudios cargados en la capa bronze."""
    data_dir = data_dir or settings.data_dir
    bronze_dir = Path(data_dir) / "bronze"
    if not bronze_dir.exists():
        return []
    studies = []
    for parquet_file in sorted(bronze_dir.glob("microdatos_*.parquet")):
        df = read_bronze(parquet_file.stem, data_dir=data_dir)
        if df.empty:
            continue
        studies.append({
            "codigo_estudio": parquet_file.stem.replace("microdatos_", "").upper(),
            "archivo_bronze": parquet_file.stem,
            "n_registros": len(df),
            "n_variables": df.shape[1],
            "variables": df.columns.tolist(),
        })
    return studies


def load_study_from_bronze(
    codigo_estudio: str,
    data_dir: str | None = None,
) -> pd.DataFrame:
    """Carga un estudio ya procesado desde la capa bronze."""
    data_dir = data_dir or settings.data_dir
    name = f"microdatos_{codigo_estudio.lower()}"
    df = read_bronze(name, data_dir=data_dir)
    if df.empty:
        raise ValueError(f"Estudio '{codigo_estudio}' no encontrado en bronze.")
    return df


# ── Utilidades de limpieza y validación ───────────────────────────────────────

def validate_microdata(df: pd.DataFrame) -> dict[str, Any]:
    """Valida calidad básica de los microdatos."""
    n = len(df)
    report: dict[str, Any] = {
        "n_registros": n,
        "variables_clave": {},
        "warnings": [],
        "completitud_global": 0.0,
    }

    key_vars = ["escideol", "intencion_voto", "recuerdo_voto", "sexo", "edad",
                "estudios", "ccaa", "peso"]
    total_completitud = 0.0
    for v in key_vars:
        if v in df.columns:
            pct_ok = df[v].notna().sum() / n if n > 0 else 0
            report["variables_clave"][v] = round(pct_ok * 100, 1)
            total_completitud += pct_ok
            if pct_ok < 0.5:
                report["warnings"].append(f"{v}: solo {pct_ok*100:.0f}% de valores válidos")
        else:
            report["variables_clave"][v] = None
            if v in ("escideol", "intencion_voto"):
                report["warnings"].append(f"Variable clave '{v}' no encontrada")

    n_key_found = sum(1 for v in report["variables_clave"].values() if v is not None)
    report["completitud_global"] = round(total_completitud / max(n_key_found, 1) * 100, 1)
    return report
