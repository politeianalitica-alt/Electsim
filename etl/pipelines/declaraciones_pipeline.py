"""Pipeline de declaraciones politicas para bloque 2."""

from __future__ import annotations

import argparse
import os
from datetime import date
from typing import Any

from db.session import get_raw_conn
from etl.logger import get_logger
from dashboard.ingestion.declaraciones_fetcher import (
    fetch_declaraciones_desde_noticias,
    fetch_intervenciones_congreso,
)
from dashboard.services.opposition import detectar_y_guardar_contradicciones

logger = get_logger(__name__)

DRY_RUN = os.getenv("ELECTSIM_DRY_RUN", "0") == "1"


def fetch_declaraciones_fuentes(
    fuentes: list[dict] | None = None,
    fecha_desde: date | None = None,
) -> list[dict]:
    sources = fuentes or [
        {"tipo": "rss_medios"},
        {"tipo": "transcripcion_congreso"},
    ]
    out: list[dict] = []
    for src in sources:
        t = str(src.get("tipo", "")).strip().lower()
        try:
            if t == "rss_medios":
                out.extend(list(fetch_declaraciones_desde_noticias(ventana_dias=7)))
            elif t == "transcripcion_congreso":
                out.extend(
                    list(
                        fetch_intervenciones_congreso(
                            desde=fecha_desde.isoformat() if fecha_desde else None,
                            max_paginas=3,
                        )
                    )
                )
        except Exception as exc:
            logger.warning("Fuente %s fallida: %s", t, exc)
    logger.info("declaraciones obtenidas=%d", len(out))
    return out


def enriquecer_declaraciones(declaraciones: list[dict]) -> list[dict]:
    """
    En este flujo las declaraciones ya llegan semi-normalizadas.
    Se valida longitud y defaults.
    """
    out: list[dict] = []
    for d in declaraciones:
        if not str(d.get("texto") or "").strip():
            continue
        out.append(
            {
                "persona": d.get("persona") or "SIN_PERSONA",
                "partido": d.get("partido") or "SIN_PARTIDO",
                "fecha": d.get("fecha"),
                "medio": d.get("medio"),
                "contexto": d.get("contexto"),
                "texto": str(d.get("texto"))[:8000],
                "tema": d.get("tema"),
                "subtema": d.get("subtema"),
                "posicion_x": d.get("posicion_x"),
                "posicion_y": d.get("posicion_y"),
                "url": d.get("url"),
                "cliente_id": d.get("cliente_id"),
            }
        )
    logger.info("declaraciones enriquecidas=%d", len(out))
    return out


def insertar_declaraciones(declaraciones: list[dict]) -> int:
    if DRY_RUN:
        logger.info("[DRY_RUN] insertar_declaraciones=%d", len(declaraciones))
        return 0

    conn = get_raw_conn()
    inserted = 0
    try:
        with conn.cursor() as cur:
            for d in declaraciones:
                cur.execute(
                    """
                    INSERT INTO declaraciones_politicas
                        (persona, partido, fecha, medio, contexto, texto, tema,
                         subtema, posicion_x, posicion_y, url, cliente_id)
                    VALUES
                        (%(persona)s, %(partido)s, %(fecha)s, %(medio)s, %(contexto)s,
                         %(texto)s, %(tema)s, %(subtema)s, %(posicion_x)s,
                         %(posicion_y)s, %(url)s, %(cliente_id)s)
                    ON CONFLICT (url, texto) DO NOTHING
                    """,
                    d,
                )
                inserted += int(cur.rowcount or 0)
        conn.commit()
        logger.info("declaraciones insertadas=%d", inserted)
        return inserted
    except Exception as exc:
        conn.rollback()
        logger.error("insertar_declaraciones: %s", exc)
        return 0
    finally:
        conn.close()


def detectar_contradicciones(
    partido: str,
    tema: str | None = None,
    cliente_id: int | None = None,
    min_distancia_dias: int = 30,
    score_minimo: float = 0.75,
) -> int:
    if DRY_RUN:
        return 0
    n = detectar_y_guardar_contradicciones(
        partido=partido,
        tema=tema,
        cliente_id=cliente_id,
        min_distancia_dias=min_distancia_dias,
        score_minimo=score_minimo,
    )
    logger.info("contradicciones detectadas=%d", n)
    return n


def declaraciones_oposicion_flow(
    fuentes: list[dict] | None = None,
    partido_rival: str = "PP",
    tema: str | None = None,
    cliente_id: int | None = None,
) -> dict[str, int]:
    declaraciones = fetch_declaraciones_fuentes(fuentes=fuentes)
    declaraciones = enriquecer_declaraciones(declaraciones)
    n_insertadas = insertar_declaraciones(declaraciones)
    n_contradicciones = detectar_contradicciones(
        partido=partido_rival,
        tema=tema,
        cliente_id=cliente_id,
    )
    return {
        "declaraciones_insertadas": int(n_insertadas),
        "contradicciones_detectadas": int(n_contradicciones),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline de declaraciones y contradicciones")
    parser.add_argument("--partido-rival", default="PP")
    parser.add_argument("--tema", default=None)
    args = parser.parse_args()
    result = declaraciones_oposicion_flow(
        partido_rival=args.partido_rival,
        tema=args.tema,
    )
    print(result)


if __name__ == "__main__":
    main()
