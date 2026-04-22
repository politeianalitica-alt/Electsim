"""
Carga resultados electorales desde los ficheros .DAT del Ministerio del Interior.

ZIP oficial (ISO-8859-1). Documentación del formato MIR:
https://infoelectoral.interior.gob.es/opencms/es/

Notas:
- Se parsea el fichero agregado por provincia y partido/candidatura ``04PROV*.DAT``.
- Los códigos de partido del MIR no coinciden con siglas: se crean filas en ``partidos``
  con siglas ``MIR_<codigo>`` si no existe mapeo en ``MAPEO_MIR_A_SIGLAS``.
- Requiere ``provincias`` y ``comunidades_autonomas`` cargadas (p. ej. ``ine_geografia``).
"""

from __future__ import annotations

import logging
import os
import zipfile
from datetime import date
from io import BytesIO
from pathlib import Path

import pandas as pd
import requests
from sqlalchemy import text

from etl.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)

BASE_URL_MESA = "https://infoelectoral.interior.gob.es/estaticos/docxl/apliextr"

# Elecciones al Congreso (año, mes) → fecha electoral y etiqueta
CONGRESO_FECHAS: dict[tuple[int, int], tuple[date, str]] = {
    (2023, 7): (date(2023, 7, 23), "Congreso 23-jul-2023"),
    (2019, 11): (date(2019, 11, 10), "Congreso 10-nov-2019"),
    (2019, 4): (date(2019, 4, 28), "Congreso 28-abr-2019"),
    (2016, 6): (date(2016, 6, 26), "Congreso 26-jun-2016"),
    (2015, 12): (date(2015, 12, 20), "Congreso 20-dic-2015"),
    (2011, 11): (date(2011, 11, 20), "Congreso 20-nov-2011"),
    (2008, 3): (date(2008, 3, 9), "Congreso 9-mar-2008"),
    (2004, 3): (date(2004, 3, 14), "Congreso 14-mar-2004"),
    (2000, 3): (date(2000, 3, 12), "Congreso 12-mar-2000"),
}

# Mapeo opcional MIR (6 dígitos en fichero) → siglas ya existentes en ``partidos``
MAPEO_MIR_A_SIGLAS: dict[str, str] = {
    # Ejemplos ilustrativos; completar con tabla oficial por elección si se requiere precisión
    # "000001": "PSOE",
}

# Posiciones campo 04PROV (MIR mesa — congreso); validado contra especificación habitual longitud ≥ 82
CAMPOS_04PROV = {
    "tipo_eleccion": (0, 2),
    "año": (2, 6),
    "mes": (6, 8),
    "vuelta": (8, 9),
    "codigo_ccaa": (9, 11),
    "codigo_provincia": (11, 13),
    "codigo_partido": (65, 71),
    "votos": (71, 79),
    "candidatos_electos": (79, 82),
}


def _mesa_zip_urls(año: int, mes: int) -> list[str]:
    return [
        f"{BASE_URL_MESA}/02{año:04d}{mes:02d}_MESA.zip",
        f"{BASE_URL_MESA}/02{año:04d}{mes}_MESA.zip",
    ]


def _parse_fixed_line(line: str, spec: dict[str, tuple[int, int]]) -> dict[str, str]:
    return {campo: line[ini:fin].strip() for campo, (ini, fin) in spec.items()}


class InteriorResultadosExtractor(BaseExtractor):
    """Extractor + carga a ``resultados_electorales`` para Congreso (tipo 02)."""

    def __init__(self, año: int, mes: int | None = None, vuelta: int = 1):
        super().__init__("interior_resultados")
        self.año = año
        self.vuelta = vuelta
        if mes is None:
            candidatos = [m for (y, m) in CONGRESO_FECHAS if y == año]
            if len(candidatos) != 1:
                raise ValueError(
                    f"Indique mes= para el año {año}. Opciones: "
                    f"{sorted({m for (y, m) in CONGRESO_FECHAS if y == año})}"
                )
            mes = candidatos[0]
        self.mes = mes
        key = (año, mes)
        if key not in CONGRESO_FECHAS:
            logger.warning(
                "Fecha electoral no en CONGRESO_FECHAS; se usará date(%s, %s, 1)", año, mes
            )
            self.fecha_eleccion = date(año, mes, 1)
            self.descripcion = f"Congreso {año}-{mes:02d} (fecha aproximada)"
        else:
            self.fecha_eleccion, self.descripcion = CONGRESO_FECHAS[key]
        self.urls = _mesa_zip_urls(año, mes)
        self.verify_ssl = os.getenv("INTERIOR_SSL_VERIFY", "true").lower() in (
            "1",
            "true",
            "yes",
        )

    def extract(self) -> pd.DataFrame:
        cache_path = self.raw_path / f"congreso_{self.año}_{self.mes:02d}.zip"
        if not cache_path.exists():
            downloaded = False
            for url in self.urls:
                try:
                    logger.info("Descargando %s", url)
                    r = requests.get(url, timeout=180, verify=self.verify_ssl)
                    if r.status_code == 200:
                        cache_path.write_bytes(r.content)
                        downloaded = True
                        break
                    logger.warning("Respuesta %s al descargar %s", r.status_code, url)
                except Exception as e:
                    logger.warning("Fallo descarga %s: %s", url, e)
            if not downloaded:
                raise RuntimeError(
                    f"No se pudo descargar ZIP MIR para {self.año}/{self.mes}. "
                    f"URLs probadas: {self.urls}"
                )

        rows: list[dict[str, str]] = []
        with zipfile.ZipFile(cache_path) as zf:
            for name in zf.namelist():
                if ((name.startswith("04PROV") or name.startswith("04")) and name.upper().endswith(".DAT")):
                    raw = zf.read(name).decode("iso-8859-1", errors="replace")
                    for line in raw.splitlines():
                        if len(line) >= 82:
                            rows.append(_parse_fixed_line(line, CAMPOS_04PROV))
        if not rows:
            raise RuntimeError(
                "No se encontraron líneas 04PROV*.DAT válidas en el ZIP. "
                "Compruebe URL/año/mes o el formato del fichero."
            )
        return pd.DataFrame(rows)

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        out = df.copy()
        out["año"] = pd.to_numeric(out["año"], errors="coerce").astype("Int64")
        out["mes"] = pd.to_numeric(out["mes"], errors="coerce").astype("Int64")
        out["vuelta"] = pd.to_numeric(out["vuelta"], errors="coerce").fillna(1).astype(int)
        out["codigo_provincia"] = out["codigo_provincia"].astype(str).str.zfill(2)
        out["codigo_ccaa"] = out["codigo_ccaa"].astype(str).str.zfill(2)
        out["codigo_partido"] = out["codigo_partido"].astype(str).str.strip().str.zfill(6)
        out["votos"] = pd.to_numeric(out["votos"], errors="coerce").fillna(0).astype(int)
        out["candidatos_electos"] = (
            pd.to_numeric(out["candidatos_electos"], errors="coerce").fillna(0).astype(int)
        )
        out = out[(out["tipo_eleccion"] == "02") & (out["votos"] >= 0) & (out["codigo_provincia"] != "99")]
        # Porcentaje sobre total votos válidos por provincia en el fichero
        tot_prov = out.groupby("codigo_provincia", as_index=False)["votos"].sum().rename(
            columns={"votos": "votos_totales_provincia"}
        )
        out = out.merge(tot_prov, on="codigo_provincia", how="left")
        out["porcentaje"] = (
            (out["votos"] / out["votos_totales_provincia"].replace(0, pd.NA)) * 100
        ).round(3)
        out["fecha_eleccion"] = self.fecha_eleccion
        out["descripcion_eleccion"] = self.descripcion
        return out

    def _ensure_eleccion_id(self, conn) -> int:
        row = conn.execute(
            text(
                """
                SELECT id FROM elecciones
                WHERE tipo = 'generales' AND fecha = :fecha AND vuelta = :vuelta
                """
            ),
            {"fecha": self.fecha_eleccion, "vuelta": self.vuelta},
        ).fetchone()
        if row:
            return int(row[0])
        new_id = conn.execute(
            text(
                """
                INSERT INTO elecciones (tipo, fecha, vuelta, ambito, descripcion)
                VALUES ('generales', :fecha, :vuelta, 'nacional', :desc)
                RETURNING id
                """
            ),
            {"fecha": self.fecha_eleccion, "vuelta": self.vuelta, "desc": self.descripcion},
        ).scalar_one()
        return int(new_id)

    def _resolve_partido_id(self, conn, codigo_mir: str) -> int:
        siglas_objetivo = MAPEO_MIR_A_SIGLAS.get(codigo_mir.lstrip("0")) or MAPEO_MIR_A_SIGLAS.get(
            codigo_mir
        )
        if siglas_objetivo:
            row = conn.execute(
                text("SELECT id FROM partidos WHERE siglas = :s"),
                {"s": siglas_objetivo},
            ).fetchone()
            if row:
                return int(row[0])
        siglas = f"MIR_{codigo_mir}"
        row = conn.execute(
            text("SELECT id FROM partidos WHERE siglas = :s"),
            {"s": siglas[:30]},
        ).fetchone()
        if row:
            return int(row[0])
        nombre = f"Candidatura MIR {codigo_mir}"
        new_id = conn.execute(
            text(
                """
                INSERT INTO partidos (siglas, nombre_completo, ambito)
                VALUES (:siglas, :nombre, 'nacional')
                RETURNING id
                """
            ),
            {"siglas": siglas[:30], "nombre": nombre[:200]},
        ).scalar_one()
        return int(new_id)

    def load_to_db(self, df: pd.DataFrame) -> int:
        """Inserta/actualiza filas en ``resultados_electorales``."""
        if self.engine is None:
            raise RuntimeError("DATABASE_URL no definida.")
        if df.empty:
            return 0
        count = 0
        with self.engine.begin() as conn:
            eleccion_id = self._ensure_eleccion_id(conn)
            for _, row in df.iterrows():
                prov_row = conn.execute(
                    text(
                        """
                        SELECT p.id, p.ccaa_id
                        FROM provincias p
                        WHERE p.codigo_ine = :c
                        """
                    ),
                    {"c": row["codigo_provincia"]},
                ).fetchone()
                if not prov_row:
                    logger.warning("Provincia INE %s no encontrada; fila omitida", row["codigo_provincia"])
                    continue
                provincia_id, ccaa_id = int(prov_row[0]), int(prov_row[1])
                partido_id = self._resolve_partido_id(conn, row["codigo_partido"])
                conn.execute(
                    text(
                        """
                        INSERT INTO resultados_electorales (
                            eleccion_id, partido_id, provincia_id, ccaa_id,
                            votos, porcentaje, escanos, municipio_id
                        ) VALUES (
                            :eleccion_id, :partido_id, :provincia_id, :ccaa_id,
                            :votos, :porcentaje, :escanos, NULL
                        )
                        ON CONFLICT (eleccion_id, partido_id, provincia_id)
                        DO UPDATE SET
                            votos = EXCLUDED.votos,
                            porcentaje = EXCLUDED.porcentaje,
                            escanos = EXCLUDED.escanos,
                            ccaa_id = EXCLUDED.ccaa_id
                        """
                    ),
                    {
                        "eleccion_id": eleccion_id,
                        "partido_id": partido_id,
                        "provincia_id": provincia_id,
                        "ccaa_id": ccaa_id,
                        "votos": int(row["votos"]),
                        "porcentaje": float(row["porcentaje"])
                        if pd.notna(row["porcentaje"])
                        else None,
                        "escanos": int(row["candidatos_electos"]),
                    },
                )
                count += 1
        logger.info("Cargados/actualizados %s registros en resultados_electorales", count)
        return count

    def run(self) -> pd.DataFrame:
        raw = self.extract()
        clean = self.transform(raw)
        self.save_parquet(clean, f"congreso_{self.año}_{self.mes:02d}")
        self.load_to_db(clean)
        return clean


def load_zip_from_path(path: Path, año: int, mes: int, vuelta: int = 1) -> pd.DataFrame:
    """Útil para pruebas con ZIP ya descargado (sin HTTP)."""
    ex = InteriorResultadosExtractor(año=año, mes=mes, vuelta=vuelta)
    buf = path.read_bytes()
    rows: list[dict[str, str]] = []
    with zipfile.ZipFile(BytesIO(buf)) as zf:
        for name in zf.namelist():
            if ((name.startswith("04PROV") or name.startswith("04")) and name.upper().endswith(".DAT")):
                raw = zf.read(name).decode("iso-8859-1", errors="replace")
                for line in raw.splitlines():
                    if len(line) >= 82:
                        rows.append(_parse_fixed_line(line, CAMPOS_04PROV))
    return ex.transform(pd.DataFrame(rows))
