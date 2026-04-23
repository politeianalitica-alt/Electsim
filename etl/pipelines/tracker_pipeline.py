"""Pipeline tracker de narrativas (ingesta + agregacion + alertas)."""

from __future__ import annotations

import argparse
import logging
import os
from datetime import date, datetime, timezone

from dashboard.db import insertar_contenidos_mediaticos
from db.session import get_raw_conn
from etl.sources.media_rss import fetch_media_rss
from etl.transformers.nlp_enricher import enriquecer_registros

logger = logging.getLogger(__name__)
DRY_RUN = os.getenv("ELECTSIM_DRY_RUN", "0") == "1"


def _table_exists(table_name: str) -> bool:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass(%s)", (table_name,))
            row = cur.fetchone()
        return bool(row and row[0])
    except Exception:
        return False
    finally:
        conn.close()


def task_fetch_rss() -> list[dict]:
    records = fetch_media_rss(solo_politico=True)
    logger.info("[tracker] rss_obtenidos=%d", len(records))
    return records


def task_enrich(records: list[dict]) -> list[dict]:
    enriched = enriquecer_registros(records)
    logger.info("[tracker] enriquecidos=%d", len(enriched))
    return enriched


def task_insert(records: list[dict]) -> int:
    if DRY_RUN:
        logger.info("[tracker][DRY_RUN] insercion omitida (%d registros)", len(records))
        return 0
    inserted = insertar_contenidos_mediaticos(records)
    logger.info("[tracker] insertados=%d", inserted)
    return inserted


def _mapear_tags_objeto(fecha_objetivo: date | None = None) -> int:
    """Asocia `tags_contenido` con `objetos_seguimiento` cuando coincide tipo+valor."""
    if not _table_exists("tags_contenido") or not _table_exists("objetos_seguimiento"):
        return 0

    target = fecha_objetivo or date.today()
    conn = get_raw_conn()
    updated = 0
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tags_contenido tc
                SET objeto_id = os.id
                FROM contenido_mediatico cm
                JOIN objetos_seguimiento os
                  ON os.activo = TRUE
                 AND os.tipo = tc.tipo_objeto
                 AND LOWER(os.valor) = LOWER(tc.valor)
                 AND (os.cliente_id = cm.cliente_id OR os.cliente_id IS NULL OR cm.cliente_id IS NULL)
                WHERE tc.contenido_id = cm.id
                  AND tc.objeto_id IS NULL
                  AND cm.fecha_publicacion::date = %s
                """,
                (target,),
            )
            updated = int(cur.rowcount or 0)
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.warning("[tracker] mapeo tags->objeto fallo: %s", exc)
    finally:
        conn.close()
    return updated


def task_agregar_serie(fecha_objetivo: date | None = None) -> int:
    """Agrega menciones diarias por objeto y canal en serie_temporal_objeto."""
    if DRY_RUN:
        return 0
    if not _table_exists("serie_temporal_objeto"):
        logger.info("[tracker] serie_temporal_objeto no existe; omitiendo agregacion")
        return 0

    target = fecha_objetivo or date.today()
    conn = get_raw_conn()
    upserts = 0
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO serie_temporal_objeto
                    (objeto_id, fecha, canal, n_menciones, sentiment_medio,
                     sentiment_min, sentiment_max, alcance_total,
                     tono_ataque, tono_defensa, tono_propuesta)
                SELECT
                    os.id AS objeto_id,
                    cm.fecha_publicacion::date AS fecha,
                    CASE
                        WHEN cm.tipo IN ('rss', 'prensa') THEN 'prensa'
                        WHEN cm.tipo IN ('x', 'twitter', 'youtube', 'rrss') THEN 'rrss'
                        WHEN cm.tipo IN ('boe', 'bocg', 'legislacion') THEN 'legislacion'
                        WHEN cm.tipo IN ('agenda') THEN 'agenda'
                        ELSE cm.tipo
                    END AS canal,
                    COUNT(*) AS n_menciones,
                    AVG(cm.sentimiento_score) AS sentiment_medio,
                    MIN(cm.sentimiento_score) AS sentiment_min,
                    MAX(cm.sentimiento_score) AS sentiment_max,
                    SUM(COALESCE(cm.alcance_est, 0)) AS alcance_total,
                    SUM(CASE WHEN COALESCE(cm.tono, '') = 'ataque' THEN 1 ELSE 0 END) AS tono_ataque,
                    SUM(CASE WHEN COALESCE(cm.tono, '') = 'defensa' THEN 1 ELSE 0 END) AS tono_defensa,
                    SUM(CASE WHEN COALESCE(cm.tono, '') = 'propuesta' THEN 1 ELSE 0 END) AS tono_propuesta
                FROM contenido_mediatico cm
                JOIN tags_contenido tc ON tc.contenido_id = cm.id
                JOIN objetos_seguimiento os
                  ON os.activo = TRUE
                 AND (
                        tc.objeto_id = os.id
                        OR (os.tipo = tc.tipo_objeto AND LOWER(os.valor) = LOWER(tc.valor))
                     )
                 AND (os.cliente_id = cm.cliente_id OR os.cliente_id IS NULL OR cm.cliente_id IS NULL)
                WHERE cm.fecha_publicacion::date = %s
                GROUP BY 1, 2, 3
                ON CONFLICT (objeto_id, fecha, canal) DO UPDATE
                    SET n_menciones = EXCLUDED.n_menciones,
                        sentiment_medio = EXCLUDED.sentiment_medio,
                        sentiment_min = EXCLUDED.sentiment_min,
                        sentiment_max = EXCLUDED.sentiment_max,
                        alcance_total = EXCLUDED.alcance_total,
                        tono_ataque = EXCLUDED.tono_ataque,
                        tono_defensa = EXCLUDED.tono_defensa,
                        tono_propuesta = EXCLUDED.tono_propuesta,
                        actualizado_en = NOW()
                """,
                (target,),
            )
            upserts = int(cur.rowcount or 0)
        conn.commit()
        logger.info("[tracker] serie_upserts=%d fecha=%s", upserts, target)
    except Exception as exc:
        conn.rollback()
        logger.error("[tracker] agregar serie fallo: %s", exc)
    finally:
        conn.close()
    return upserts


def task_alertas(fecha_objetivo: date | None = None) -> int:
    """Detecta picos de volumen y caidas de sentimiento contra media 7d."""
    if DRY_RUN:
        return 0
    if not _table_exists("alertas_tracker") or not _table_exists("serie_temporal_objeto"):
        return 0

    target = fecha_objetivo or date.today()
    conn = get_raw_conn()
    created = 0

    sql = """
        WITH hist AS (
            SELECT
                objeto_id,
                canal,
                AVG(n_menciones::numeric) AS mu,
                COALESCE(STDDEV(n_menciones::numeric), 0) AS sigma,
                AVG(sentiment_medio::numeric) AS sent_mu
            FROM serie_temporal_objeto
            WHERE fecha BETWEEN %s::date - INTERVAL '8 days' AND %s::date - INTERVAL '1 day'
            GROUP BY objeto_id, canal
        ),
        hoy AS (
            SELECT objeto_id, canal, n_menciones, sentiment_medio
            FROM serie_temporal_objeto
            WHERE fecha = %s::date
        )
        SELECT
            h.objeto_id,
            h.canal,
            y.n_menciones,
            h.mu,
            h.sigma,
            y.sentiment_medio,
            h.sent_mu
        FROM hoy y
        JOIN hist h
          ON h.objeto_id = y.objeto_id
         AND h.canal = y.canal
    """

    try:
        with conn.cursor() as cur:
            cur.execute(sql, (target, target, target))
            rows = cur.fetchall()

            for objeto_id, canal, n_hoy, mu, sigma, sent_hoy, sent_mu in rows:
                spike = sigma and (float(n_hoy or 0) - float(mu or 0)) > (2.0 * float(sigma or 0))
                sent_drop = (sent_hoy is not None and sent_mu is not None and float(sent_hoy) < float(sent_mu) - 0.30)

                if not spike and not sent_drop:
                    continue

                if spike:
                    tipo = "pico_menciones"
                    desc = f"Pico de menciones en canal {canal}"
                    valor = float(n_hoy or 0)
                    umbral = float(mu or 0) + (2.0 * float(sigma or 0))
                else:
                    tipo = "sentiment_negativo"
                    desc = f"Caida de sentimiento en canal {canal}"
                    valor = float(sent_hoy or 0)
                    umbral = float(sent_mu or 0) - 0.30

                cur.execute(
                    """
                    SELECT 1
                    FROM alertas_tracker
                    WHERE objeto_id = %s
                      AND tipo_alerta = %s
                      AND COALESCE(canal, '') = COALESCE(%s, '')
                      AND fecha_alerta::date = %s
                    LIMIT 1
                    """,
                    (objeto_id, tipo, canal, target),
                )
                if cur.fetchone():
                    continue

                cur.execute(
                    """
                    INSERT INTO alertas_tracker
                        (objeto_id, tipo_alerta, descripcion, valor_detectado, umbral, canal, leida)
                    VALUES (%s, %s, %s, %s, %s, %s, FALSE)
                    """,
                    (objeto_id, tipo, desc, valor, umbral, canal),
                )
                created += 1

        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error("[tracker] alertas fallo: %s", exc)
    finally:
        conn.close()

    logger.info("[tracker] alertas_creadas=%d", created)
    return created


def tracker_narrativas_flow(fecha_objetivo: date | None = None) -> dict[str, int]:
    records = task_fetch_rss()
    enriched = task_enrich(records)
    inserted = task_insert(enriched)
    if DRY_RUN:
        mapped = 0
        serie = 0
        alerts = 0
    else:
        mapped = _mapear_tags_objeto(fecha_objetivo=fecha_objetivo)
        serie = task_agregar_serie(fecha_objetivo=fecha_objetivo)
        alerts = task_alertas(fecha_objetivo=fecha_objetivo)
    return {
        "obtenidos": len(records),
        "insertados": int(inserted),
        "tags_mapeados": int(mapped),
        "serie_upserts": int(serie),
        "alertas": int(alerts),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline tracker narrativas")
    parser.add_argument("--fecha", default=None, help="YYYY-MM-DD")
    args = parser.parse_args()

    target = None
    if args.fecha:
        target = datetime.strptime(args.fecha, "%Y-%m-%d").date()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )

    res = tracker_narrativas_flow(fecha_objetivo=target)
    print(res)


if __name__ == "__main__":
    main()
