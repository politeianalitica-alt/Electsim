"""
Provincias y municipios desde la API JSON pública del INE (WSTempus).

Endpoints: ``VALORES_VARIABLE`` con detalle jerárquico (``det=2``).
- Variable 70: Comunidades y Ciudades Autónomas
- Variable 115: Provincias (padre CCAA en ``JerarquiaPadres``)
- Variable 19: Municipios (padre provincia en ``JerarquiaPadres``; paginado, 500 ítems/página)

Documentación: https://www.ine.es/dyngs/DAB/index.htm?cid=1100
"""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd
import requests
from sqlalchemy import text

from etl.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)

INE_API_BASE = "https://servicios.ine.es/wstempus/js/ES"

INE_VARIABLES = {
    "comunidades": 70,
    "provincias": 115,
    "municipios": 19,
}


def _fetch_valores_variable(variable_id: int, session: requests.Session, timeout: int = 120) -> list[dict[str, Any]]:
    page = 1
    out: list[dict[str, Any]] = []
    while True:
        url = f"{INE_API_BASE}/VALORES_VARIABLE/{variable_id}"
        r = session.get(url, params={"page": page, "det": 2}, timeout=timeout)
        r.raise_for_status()
        chunk = r.json()
        if not chunk:
            break
        out.extend(chunk)
        if len(chunk) < 500:
            break
        page += 1
    return out


def _ccaa_codigo_from_padres(item: dict[str, Any]) -> str | None:
    padres = item.get("JerarquiaPadres") or []
    for p in padres:
        v = p.get("Variable") or {}
        if v.get("Codigo") == "CCAA" or "Autónom" in (v.get("Nombre") or ""):
            return str(p.get("Codigo", "")).zfill(2)[:2]
    return None


def _provincia_codigo_from_padres(item: dict[str, Any]) -> str | None:
    padres = item.get("JerarquiaPadres") or []
    for p in padres:
        v = p.get("Variable") or {}
        if v.get("Codigo") == "PROV":
            c = str(p.get("Codigo", "")).strip()
            return c.zfill(2)[:2] if c else None
    return None


class INEGeografiaExtractor(BaseExtractor):
    """Descarga territorios INE y sincroniza ``comunidades_autonomas``, ``provincias``, ``municipios``."""

    def __init__(self):
        super().__init__("ine_geografia")

    def extract(self) -> dict[str, list[dict[str, Any]]]:
        with requests.Session() as session:
            session.headers.update({"Accept": "application/json"})
            return {
                nivel: _fetch_valores_variable(vid, session)
                for nivel, vid in INE_VARIABLES.items()
            }

    def transform(self, data: dict[str, list[dict[str, Any]]]) -> dict[str, pd.DataFrame]:
        ccaa_rows = []
        for item in data.get("comunidades", []):
            cod = str(item.get("Codigo", "")).strip()
            if not cod or cod == "00":
                continue
            nombre = (item.get("Nombre") or "").strip()
            if not nombre:
                continue
            ccaa_rows.append({"codigo_ine": cod.zfill(2)[:2], "nombre": nombre})
        df_ccaa = pd.DataFrame(ccaa_rows).drop_duplicates("codigo_ine")

        prov_rows = []
        for item in data.get("provincias", []):
            cod = str(item.get("Codigo", "")).strip()
            if not cod or cod == "00":
                continue
            nombre = (item.get("Nombre") or "").strip()
            ccaa_codigo = _ccaa_codigo_from_padres(item)
            if not ccaa_codigo or ccaa_codigo == "00":
                continue
            prov_rows.append(
                {
                    "codigo_ine": cod.zfill(2)[:2],
                    "nombre": nombre,
                    "ccaa_codigo": ccaa_codigo,
                }
            )
        df_prov = pd.DataFrame(prov_rows).drop_duplicates("codigo_ine")

        muni_rows = []
        for item in data.get("municipios", []):
            cod = str(item.get("Codigo", "")).strip()
            if not cod:
                continue
            cod5 = cod.zfill(5)[:5]
            nombre = (item.get("Nombre") or "").strip()
            prov_cod = _provincia_codigo_from_padres(item)
            if not prov_cod:
                continue
            muni_rows.append(
                {
                    "codigo_ine": cod5,
                    "nombre": nombre,
                    "provincia_codigo": prov_cod.zfill(2)[:2],
                }
            )
        df_muni = pd.DataFrame(muni_rows).drop_duplicates("codigo_ine")

        return {"ccaa": df_ccaa, "provincias": df_prov, "municipios": df_muni}

    def load_to_db(self, data: dict[str, pd.DataFrame]) -> None:
        if self.engine is None:
            raise RuntimeError("DATABASE_URL no definida.")
        with self.engine.begin() as conn:
            for _, row in data["ccaa"].iterrows():
                conn.execute(
                    text(
                        """
                        INSERT INTO comunidades_autonomas (codigo_ine, nombre)
                        VALUES (:codigo_ine, :nombre)
                        ON CONFLICT (codigo_ine) DO UPDATE SET nombre = EXCLUDED.nombre
                        """
                    ),
                    {"codigo_ine": row["codigo_ine"], "nombre": row["nombre"]},
                )

            for _, row in data["provincias"].iterrows():
                conn.execute(
                    text(
                        """
                        INSERT INTO provincias (codigo_ine, nombre, ccaa_id)
                        VALUES (
                            :codigo_ine,
                            :nombre,
                            (SELECT id FROM comunidades_autonomas WHERE codigo_ine = :ccaa_codigo)
                        )
                        ON CONFLICT (codigo_ine) DO UPDATE SET
                            nombre = EXCLUDED.nombre,
                            ccaa_id = EXCLUDED.ccaa_id
                        """
                    ),
                    {
                        "codigo_ine": row["codigo_ine"],
                        "nombre": row["nombre"],
                        "ccaa_codigo": row["ccaa_codigo"],
                    },
                )

            for _, row in data["municipios"].iterrows():
                conn.execute(
                    text(
                        """
                        INSERT INTO municipios (codigo_ine, nombre, provincia_id, ccaa_id)
                        VALUES (
                            :codigo_ine,
                            :nombre,
                            (SELECT id FROM provincias WHERE codigo_ine = :provincia_codigo),
                            (SELECT ccaa_id FROM provincias WHERE codigo_ine = :provincia_codigo)
                        )
                        ON CONFLICT (codigo_ine) DO UPDATE SET
                            nombre = EXCLUDED.nombre,
                            provincia_id = EXCLUDED.provincia_id,
                            ccaa_id = EXCLUDED.ccaa_id
                        """
                    ),
                    {
                        "codigo_ine": row["codigo_ine"],
                        "nombre": row["nombre"],
                        "provincia_codigo": row["provincia_codigo"],
                    },
                )

    def run(self) -> dict[str, pd.DataFrame]:
        raw = self.extract()
        clean = self.transform(raw)
        if not clean["municipios"].empty:
            self.save_parquet(clean["municipios"], "municipios_ine")
        self.load_to_db(clean)
        return clean


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    INEGeografiaExtractor().run()


if __name__ == "__main__":
    main()
