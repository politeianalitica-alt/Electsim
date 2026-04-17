"""
Seguimiento de encuestas citadas en prensa (regex + metadatos). ``python -m etl.realtime.prensa_encuestas``.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import date, datetime, timedelta
from typing import Any

from bs4 import BeautifulSoup
from sqlalchemy import text

from etl.realtime.base import BaseRealTimeScraper, DryRunException

logger = logging.getLogger(__name__)

FUENTES = [
    {
        "nombre": "elpais",
        "url_busqueda": "https://elpais.com/buscar/?q=encuesta+intencion+de+voto",
        "selector_articulos": "article.c_d",
        "delay": 3.0,
    },
    {
        "nombre": "elmundo",
        "url_busqueda": "https://www.elmundo.es/buscar.html?q=encuesta+electoral",
        "selector_articulos": "article",
        "delay": 3.0,
    },
    {
        "nombre": "20minutos",
        "url_busqueda": "https://www.20minutos.es/buscar/?q=encuesta+voto",
        "selector_articulos": "article",
        "delay": 2.0,
    },
]

PARTIDOS_PATRON = {
    "PP": r"(?:Partido Popular|PP)\s*[:\|]?\s*(\d{1,2}(?:[.,]\d)?)\s*%",
    "PSOE": r"(?:PSOE|Socialistas?)\s*[:\|]?\s*(\d{1,2}(?:[.,]\d)?)\s*%",
    "VOX": r"VOX\s*[:\|]?\s*(\d{1,2}(?:[.,]\d)?)\s*%",
    "SUMAR": r"SUMAR\s*[:\|]?\s*(\d{1,2}(?:[.,]\d)?)\s*%",
    "ERC": r"ERC\s*[:\|]?\s*(\d{1,2}(?:[.,]\d)?)\s*%",
}

CASAS_CONOCIDAS = [
    "GAD3",
    "Sigma Dos",
    "Metroscopia",
    "CIS",
    "Simple Lógica",
    "Celeste-Tel",
    "40dB",
    "NC Report",
    "DYM",
    "Hamalgama Metrica",
]


def _parse_fecha_articulo(elem) -> date | None:
    t = elem.find("time")
    if t and t.get("datetime"):
        try:
            return datetime.fromisoformat(t["datetime"][:10]).date()
        except ValueError:
            pass
    return None


def buscar_articulos_recientes(
    fuente: dict,
    scraper: BaseRealTimeScraper,
    dias: int = 7,
) -> list[dict]:
    if scraper.is_dry_run():
        return []
    out: list[dict] = []
    lim = date.today() - timedelta(days=dias)
    try:
        r = scraper.get(fuente["url_busqueda"], cache_ttl_horas=6)
    except (DryRunException, Exception) as exc:
        logger.debug("prensa %s: %s", fuente["nombre"], exc)
        return []
    soup = BeautifulSoup(r.text, "lxml")
    for art in soup.select(fuente["selector_articulos"]):
        a = art.find("a", href=True)
        if not a:
            continue
        href = a["href"]
        if not href.startswith("http"):
            if fuente["nombre"] == "elpais":
                href = "https://elpais.com" + href
            elif fuente["nombre"] == "elmundo":
                href = "https://www.elmundo.es" + href
            else:
                href = "https://www.20minutos.es" + href
        pub = _parse_fecha_articulo(art) or date.today()
        if pub < lim:
            continue
        tit = (a.get_text() or "").strip()
        out.append(
            {
                "url": href.split("#")[0],
                "titular": tit,
                "fecha_publicacion": pub,
                "fuente_nombre": fuente["nombre"],
            }
        )
        if len(out) >= 25:
            break
    return out


def extraer_datos_encuesta_regex(texto: str) -> dict[str, float]:
    found: dict[str, float] = {}
    for siglas, pat in PARTIDOS_PATRON.items():
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            found[siglas] = float(m.group(1).replace(",", "."))
    return found


def extraer_casa_encuestadora(texto: str) -> str | None:
    low = texto
    for casa in CASAS_CONOCIDAS:
        if casa.lower() in low.lower():
            return casa
    return None


def extraer_metadatos_encuesta(texto: str) -> dict[str, Any]:
    meta: dict[str, Any] = {}
    m = re.search(r"(\d{1,4})\s*entrevistas?", texto, re.IGNORECASE)
    if m:
        meta["n_entrevistas"] = int(m.group(1))
    for pat in (
        r"campo\s+del\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
        r"(\d{1,2})/(\d{1,2})/(\d{4})\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})",
    ):
        m2 = re.search(pat, texto, re.IGNORECASE)
        if m2:
            meta["fecha_campo_match"] = m2.group(0)
            break
    return meta


def _confianza(partidos: dict, casa: str | None, n_ent: int | None) -> float:
    n_p = len(partidos)
    if n_p >= 4 and casa and n_ent:
        return 1.0
    if n_p >= 4 and casa:
        return 0.7
    if n_p >= 4:
        return 0.5
    return 0.3


def procesar_articulo(
    articulo: dict,
    scraper: BaseRealTimeScraper,
) -> dict | None:
    if scraper.is_dry_run():
        partidos = extraer_datos_encuesta_regex(articulo.get("titular", ""))
        return {
            "url": articulo["url"],
            "titular": articulo["titular"],
            "partidos": partidos,
            "dry_run": True,
        }
    try:
        r = scraper.get(articulo["url"], cache_ttl_horas=12)
    except Exception as exc:
        logger.debug("articulo %s: %s", articulo["url"], exc)
        return None
    soup = BeautifulSoup(r.text, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    texto = soup.get_text(separator=" ", strip=True)
    partidos = extraer_datos_encuesta_regex(texto)
    if not partidos:
        return None
    casa = extraer_casa_encuestadora(texto)
    meta = extraer_metadatos_encuesta(texto)
    n_ent = meta.get("n_entrevistas")
    conf = _confianza(partidos, casa, n_ent)
    row = {
        "url": articulo["url"],
        "titular": articulo["titular"],
        "casa_encuestadora": casa,
        "fecha_publicacion": articulo.get("fecha_publicacion"),
        "n_entrevistas": n_ent,
        "partido_datos_json": json.dumps(partidos, ensure_ascii=False),
        "confianza_parseo": conf,
    }
    upsert = text(
        """
        INSERT INTO encuestas_tracking (
            url_fuente, titular, casa_encuestadora, fecha_publicacion,
            n_entrevistas, partido_datos_json, confianza_parseo
        ) VALUES (
            :u, :tit, :casa, :fp, :ne, :pj, :cf
        )
        ON CONFLICT (url_fuente) DO UPDATE SET
            titular = EXCLUDED.titular,
            casa_encuestadora = EXCLUDED.casa_encuestadora,
            fecha_publicacion = EXCLUDED.fecha_publicacion,
            n_entrevistas = EXCLUDED.n_entrevistas,
            partido_datos_json = EXCLUDED.partido_datos_json,
            confianza_parseo = EXCLUDED.confianza_parseo
        """
    )
    with scraper.engine.begin() as conn:
        conn.execute(
            upsert,
            {
                "u": row["url"][:4000],
                "tit": row["titular"][:4000],
                "casa": casa,
                "fp": row["fecha_publicacion"],
                "ne": n_ent,
                "pj": row["partido_datos_json"],
                "cf": conf,
            },
        )
    if conf >= 0.5:
        scraper.crear_alerta(
            tipo="nueva_encuesta",
            severidad="INFO",
            titulo="Encuesta en prensa",
            descripcion=row["titular"][:400],
            datos={"url": row["url"], "confianza": conf},
        )
    return row


def insertar_en_resultados_agregados(encuesta_tracking_id: int, engine) -> bool:
    from models.estadisticos.nowcasting import agregar_encuestas, cargar_encuestas_bd, guardar_estimaciones

    sel = text(
        """
        SELECT id, confianza_parseo, partido_datos_json, titular, casa_encuestadora,
               fecha_publicacion, n_entrevistas, procesada
        FROM encuestas_tracking WHERE id = :id
        """
    )
    with engine.connect() as conn:
        row = conn.execute(sel, {"id": encuesta_tracking_id}).mappings().fetchone()
    if not row or row["procesada"]:
        return False
    conf = float(row["confianza_parseo"] or 0)
    if conf < 0.5:
        return False
    partidos = json.loads(row["partido_datos_json"] or "{}")
    if not partidos:
        return False

    fuente_sql = text(
        """
        INSERT INTO fuentes_encuesta (nombre, tipo, pais)
        SELECT 'Prensa', 'privado', 'ESP'
        WHERE NOT EXISTS (SELECT 1 FROM fuentes_encuesta WHERE nombre = 'Prensa')
        """
    )
    fid_sql = text("SELECT id FROM fuentes_encuesta WHERE nombre = 'Prensa' LIMIT 1")
    with engine.begin() as conn:
        conn.execute(fuente_sql)
        fid = conn.execute(fid_sql).scalar()
    ins_enc = text(
        """
        INSERT INTO encuestas (
            fuente_id, titulo, tipo_encuesta, fecha_publicacion, n_entrevistas, disponible_microdatos
        ) VALUES (:fid, :tit, 'intencion', :fp, :ne, false)
        RETURNING id
        """
    )
    with engine.begin() as conn:
        eid = conn.execute(
            ins_enc,
            {
                "fid": fid,
                "tit": (row["titular"] or "Prensa")[:2000],
                "fp": row["fecha_publicacion"] or date.today(),
                "ne": row["n_entrevistas"] or 800,
            },
        ).scalar()
        pq = text(
            """
            INSERT INTO preguntas_encuesta (encuesta_id, texto_pregunta, categoria_tematica)
            VALUES (:eid, 'Intención de voto (prensa)', 'intencion_voto')
            RETURNING id
            """
        )
        pid = conn.execute(pq, {"eid": eid}).scalar()
        ins_rae = text(
            """
            INSERT INTO resultados_agregados_encuesta (encuesta_id, pregunta_id, categoria, porcentaje, frecuencia_abs)
            VALUES (:eid, :pid, :cat, :pct, 0)
            """
        )
        for siglas, pct in partidos.items():
            conn.execute(
                ins_rae,
                {"eid": eid, "pid": pid, "cat": siglas, "pct": float(pct)},
            )
        conn.execute(
            text("UPDATE encuestas_tracking SET procesada = true WHERE id = :id"),
            {"id": encuesta_tracking_id},
        )
    raw = cargar_encuestas_bd(engine)
    if not raw.empty:
        est = agregar_encuestas(raw)
        guardar_estimaciones(est, engine)
    return True


class PrensaEncuestasScraper(BaseRealTimeScraper):
    def run(self) -> dict:
        total_nuevas = 0
        if self.is_dry_run():
            return {"nuevas_encuestas_detectadas": 0}
        for fuente in FUENTES:
            self.REQUEST_DELAY_SECONDS = fuente["delay"]
            articulos = buscar_articulos_recientes(fuente, self, dias=7)
            for art in articulos:
                res = procesar_articulo(art, self)
                if res:
                    total_nuevas += 1
            time.sleep(fuente["delay"])
        self.REQUEST_DELAY_SECONDS = 2.0
        return {"nuevas_encuestas_detectadas": total_nuevas}


if __name__ == "__main__":
    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.getenv("DATABASE_URL"))
    scraper = PrensaEncuestasScraper("prensa_encuestas", engine)
    stats = scraper.run()
    print(f"Prensa scraper: {stats}")
