"""
Monitor de nuevos estudios CIS (barómetros y afines). Standalone: ``python -m etl.realtime.cis_monitor``.
"""

from __future__ import annotations

import logging
import os
import re
import time
import zipfile
from io import BytesIO
from pathlib import Path

from bs4 import BeautifulSoup
from sqlalchemy import text

from etl.realtime.base import BaseRealTimeScraper, DryRunException

logger = logging.getLogger(__name__)

CIS_TIPOS_INTERES = [
    "Barómetro",
    "Postelectoral",
    "Preelectoral",
    "Opinión política",
]

BUSCADOR_URL = "https://www.cis.es/es/buscador-de-estudios"


def _raw_root() -> Path:
    return Path(os.getenv("RAW_DATA_PATH", "data/raw"))


def obtener_estudios_recientes(
    scraper: BaseRealTimeScraper, n_paginas: int = 2
) -> list[dict]:
    """
    Descarga el buscador CIS y extrae fichas de estudios (tipos de interés).
    La estructura HTML puede variar; si no hay coincidencias claras, retorna [].
    """
    if scraper.is_dry_run():
        return []
    estudios: list[dict] = []
    vistos: set[str] = set()
    try:
        r = scraper.get(BUSCADOR_URL, cache_ttl_horas=12)
    except DryRunException:
        raise
    except Exception as exc:
        logger.warning("CIS buscador: %s", exc)
        return []
    soup = BeautifulSoup(r.text, "lxml")
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if "/es/" not in href or "estudio" not in href.lower() and "barometro" not in href.lower():
            continue
        if href.startswith("/"):
            url_ficha = "https://www.cis.es" + href
        else:
            url_ficha = href
        titulo = (a.get_text() or "").strip()
        if not titulo:
            continue
        tipo_ok = any(t.lower() in titulo.lower() for t in CIS_TIPOS_INTERES)
        if not tipo_ok:
            continue
        m = re.search(r"(\d{4,5})", titulo)
        numero = m.group(1) if m else titulo[:40]
        if numero in vistos:
            continue
        vistos.add(numero)
        url_datos = ""
        estudios.append(
            {
                "numero_estudio": str(numero),
                "titulo": titulo,
                "tipo": next((t for t in CIS_TIPOS_INTERES if t.lower() in titulo.lower()), "CIS"),
                "fecha_publicacion": None,
                "url_ficha": url_ficha,
                "url_datos": url_datos,
            }
        )
        if len(estudios) >= 40 * n_paginas:
            break
    for est in estudios:
        try:
            rr = scraper.get(est["url_ficha"], cache_ttl_horas=12)
            sp = BeautifulSoup(rr.text, "lxml")
            for la in sp.find_all("a", href=True):
                h = la["href"]
                if ".sav" in h.lower() or ".zip" in h.lower():
                    est["url_datos"] = h if h.startswith("http") else "https://www.cis.es" + h
                    break
        except Exception:
            continue
    return estudios


def ya_procesado(numero_estudio: str, engine) -> bool:
    sql = text(
        """
        SELECT COUNT(*) FROM encuestas
        WHERE numero_estudio = :n OR titulo LIKE '%' || :n2 || '%'
        """
    )
    with engine.connect() as conn:
        c = conn.execute(sql, {"n": numero_estudio, "n2": numero_estudio}).scalar() or 0
    return int(c) > 0


def descargar_datos_estudio(url_datos: str, scraper: BaseRealTimeScraper) -> bytes | None:
    if not url_datos or scraper.is_dry_run():
        return None
    try:
        r = scraper.get(url_datos, cache_ttl_horas=48)
    except Exception:
        return None
    return r.content


def _guardar_sav(numero_estudio: str, data: bytes) -> Path | None:
    root = _raw_root() / "cis"
    root.mkdir(parents=True, exist_ok=True)
    if data[:4] == b"PK\x03\x04":
        try:
            with zipfile.ZipFile(BytesIO(data)) as zf:
                for name in zf.namelist():
                    if name.lower().endswith(".sav"):
                        out = root / f"{numero_estudio}.sav"
                        out.write_bytes(zf.read(name))
                        return out
        except zipfile.BadZipFile:
            return None
    if len(data) > 100 and data[:4] != b"PK\x03\x04":
        out = root / f"{numero_estudio}.sav"
        out.write_bytes(data)
        return out
    return None


def _cis_fuente_id(engine) -> int | None:
    q = text("SELECT id FROM fuentes_encuesta WHERE nombre = 'CIS' LIMIT 1")
    with engine.connect() as conn:
        return conn.execute(q).scalar()


def procesar_nuevo_estudio(
    numero_estudio: str,
    titulo: str,
    url_datos: str,
    scraper: BaseRealTimeScraper,
) -> bool:
    if scraper.is_dry_run():
        return True
    data = descargar_datos_estudio(url_datos, scraper)
    path_sav: Path | None = None
    if data:
        path_sav = _guardar_sav(numero_estudio, data)
    fuente_id = _cis_fuente_id(scraper.engine)
    if fuente_id is None:
        logger.error("No hay fuente CIS en BD")
        return False
    if path_sav and path_sav.exists():
        try:
            from etl.sources.cis_barometro import CISBarometroExtractor

            ext = CISBarometroExtractor(numero_estudio, path_sav)
            df = ext.extract()
            if df is not None and len(df) > 0:
                disp_micro = True
            else:
                disp_micro = False
        except Exception:
            disp_micro = False
        ins = text(
            """
            INSERT INTO encuestas (
                fuente_id, numero_estudio, titulo, tipo_encuesta, disponible_microdatos, url_microdatos
            ) VALUES (
                :fid, :num, :tit, 'barometro', :dm, :urlm
            )
            """
        )
        with scraper.engine.begin() as conn:
            conn.execute(
                ins,
                {
                    "fid": fuente_id,
                    "num": numero_estudio[:50],
                    "tit": titulo,
                    "dm": disp_micro,
                    "urlm": str(path_sav),
                },
            )
    else:
        ins = text(
            """
            INSERT INTO encuestas (
                fuente_id, numero_estudio, titulo, tipo_encuesta, disponible_microdatos
            ) VALUES (
                :fid, :num, :tit2, 'barometro', false
            )
            """
        )
        with scraper.engine.begin() as conn:
            conn.execute(
                ins,
                {"fid": fuente_id, "num": numero_estudio[:50], "tit2": titulo + " [sin_microdatos]"},
            )
    scraper.crear_alerta(
        tipo="nueva_encuesta",
        severidad="INFO",
        titulo=f"Nuevo estudio CIS {numero_estudio}",
        descripcion=titulo[:500],
        datos={"numero_estudio": numero_estudio, "url_datos": url_datos},
    )
    return True


class CISMonitor(BaseRealTimeScraper):
    def run(self) -> dict:
        t0 = time.time()
        nuevos = ya_ex = errores = 0
        if self.is_dry_run():
            return {"nuevos": 0, "ya_existentes": 0, "errores": 0}
        try:
            estudios = obtener_estudios_recientes(self, n_paginas=2)
            for est in estudios:
                num = str(est["numero_estudio"])
                if ya_procesado(num, self.engine):
                    ya_ex += 1
                    continue
                try:
                    if procesar_nuevo_estudio(
                        num,
                        est["titulo"],
                        est.get("url_datos") or "",
                        self,
                    ):
                        nuevos += 1
                    else:
                        errores += 1
                except Exception as exc:
                    logger.exception("CIS estudio %s", num)
                    self.log_resultado(
                        est.get("url_ficha", BUSCADOR_URL),
                        "error",
                        error=str(exc),
                        duracion=time.time() - t0,
                        tipo="encuesta",
                    )
                    errores += 1
            self.log_resultado(
                BUSCADOR_URL,
                "ok",
                n_nuevos=nuevos,
                n_dup=ya_ex,
                duracion=time.time() - t0,
                tipo="encuesta",
            )
        except Exception as exc:
            self.log_resultado(BUSCADOR_URL, "error", error=str(exc), duracion=time.time() - t0)
            errores += 1
        return {"nuevos": nuevos, "ya_existentes": ya_ex, "errores": errores}


if __name__ == "__main__":
    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    monitor = CISMonitor("cis_monitor", engine)
    stats = monitor.run()
    print(f"CIS Monitor: {stats}")
