"""Monitorizacion de medios y redes (ejecución directa)."""

from __future__ import annotations

import argparse
import json
import logging
import os

from dashboard.ingestion.media_fetcher import fetch_rss
from dashboard.ingestion.news_api import fetch_newsapi
from dashboard.ingestion.social_media import fetch_x_reciente, fetch_youtube
from dashboard.nlp.enricher import enriquecer
from dashboard.nlp.alertas import evaluar_objeto
from dashboard.db import insertar_contenidos_mediaticos, get_conn

logger = logging.getLogger(__name__)

def tarea_fetch_rss() -> list[dict]:
    items = list(fetch_rss())
    logger.info("RSS obtenidos: %d", len(items))
    return items


def tarea_fetch_x(query: str = "politica Espana lang:es -is:retweet") -> list[dict]:
    items = list(fetch_x_reciente(query=query, max_results=80))
    logger.info("X obtenidos: %d", len(items))
    return items


def tarea_fetch_youtube(query: str = "politica Espana") -> list[dict]:
    items = list(fetch_youtube(query=query, max_results=20))
    logger.info("YouTube obtenidos: %d", len(items))
    return items


def tarea_fetch_newsapi(query: str = "politica Espana OR elecciones Espana") -> list[dict]:
    items = list(fetch_newsapi(query=query, page_size=30))
    logger.info("NewsAPI obtenidos: %d", len(items))
    return items


def tarea_enriquecer(regs: list[dict]) -> list[dict]:
    enriched = [enriquecer(r) for r in regs]
    try:
        from agents.scraper_ai import sync_records_to_local_ai

        sync_records_to_local_ai(enriched, default_source="media_monitoring")
    except Exception:
        pass
    return enriched


def tarea_insertar(regs: list[dict]) -> int:
    if os.getenv("ELECTSIM_DRY_RUN") == "1":
        return 0
    return insertar_contenidos_mediaticos(regs)


def tarea_alertas() -> int:
    if os.getenv("ELECTSIM_DRY_RUN") == "1":
        return 0
    conn = get_conn()
    total = 0
    with conn.cursor() as cur:
        cur.execute("SELECT id, tipo, valor, cliente_id FROM objetos_seguimiento WHERE activo = true")
        objetos = cur.fetchall()

    for _, tipo, valor, cliente_id in objetos:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DATE_TRUNC('day', cm.fecha_publicacion) AS d,
                       COUNT(*) AS n,
                       AVG(cm.sentimiento_score) AS s
                FROM contenido_mediatico cm
                JOIN tags_contenido tc ON tc.contenido_id = cm.id
                WHERE tc.tipo_objeto = %s
                  AND tc.valor ILIKE %s
                  AND cm.fecha_publicacion >= NOW() - INTERVAL '8 days'
                GROUP BY 1
                ORDER BY 1
                """,
                (tipo, valor),
            )
            rows = cur.fetchall()
        if len(rows) < 3:
            continue

        serie_v = [int(r[1] or 0) for r in rows]
        serie_s = [float(r[2] or 0.0) for r in rows]
        alerts = evaluar_objeto(tipo, valor, "all", serie_v, serie_s)

        for a in alerts:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO alertas_mediaticas
                        (tipo_objeto, valor, canal, motivo, magnitud, cliente_id, detalle_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                    """,
                    (
                        a.tipo_objeto,
                        a.valor,
                        a.canal,
                        a.motivo,
                        a.magnitud,
                        cliente_id,
                        json.dumps(a.detalle),
                    ),
                )
            total += 1

    try:
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return total


def media_monitoring_flow() -> None:
    rss = tarea_fetch_rss()
    x = tarea_fetch_x()
    yt = tarea_fetch_youtube()
    news = tarea_fetch_newsapi()
    regs = rss + x + yt + news
    enriched = tarea_enriquecer(regs)
    ins = tarea_insertar(enriched)
    alerts = tarea_alertas()
    result = {"ok": True, "obtenidos": len(regs), "insertados": ins, "alertas": alerts}
    try:
        from agents.pipeline_ai import reason_pipeline_result

        result["ai_analysis"] = reason_pipeline_result("media_monitoring", result)
    except Exception:
        pass
    print(f"[media_monitoring] obtenidos={len(regs)} insertados={ins} alertas={alerts}")
    if result.get("ai_analysis"):
        print(json.dumps(result["ai_analysis"], ensure_ascii=False, default=str))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
    parser = argparse.ArgumentParser(description="Flow de monitorizacion de medios y RRSS")
    args = parser.parse_args()
    _ = args
    media_monitoring_flow()
