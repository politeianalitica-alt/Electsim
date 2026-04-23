"""Fetchers de declaraciones politicas (congreso + noticias internas)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator

import httpx
import pandas as pd

from db.session import get_raw_conn
from dashboard.nlp.enricher import detectar_categoria

CONGRESO_API_BASE = "https://www.congreso.es/rest/api/buscador/intervenciones"


def _parse_fecha(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value[:19], fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


def fetch_intervenciones_congreso(
    diputado: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    max_paginas: int = 5,
) -> Generator[dict, None, None]:
    for page in range(1, max_paginas + 1):
        params = {"page": page, "size": 50}
        if diputado:
            params["diputado"] = diputado
        if desde:
            params["fechaDesde"] = desde
        if hasta:
            params["fechaHasta"] = hasta

        try:
            r = httpx.get(CONGRESO_API_BASE, params=params, timeout=30)
        except Exception:
            break

        if r.status_code != 200:
            break
        payload = r.json()
        items = payload.get("intervenciones") or payload.get("items") or []
        if not items:
            break

        for item in items:
            texto = str(item.get("texto", "")).strip()
            if not texto:
                continue
            yield {
                "persona": item.get("diputado", ""),
                "partido": item.get("grupo_parlamentario", ""),
                "fecha": _parse_fecha(item.get("fecha")),
                "medio": "Congreso de los Diputados",
                "contexto": "congreso",
                "texto": texto[:5000],
                "tema": detectar_categoria(texto),
                "subtema": None,
                "posicion_x": None,
                "posicion_y": None,
                "url": item.get("url_pdf", ""),
                "cliente_id": None,
            }


def fetch_declaraciones_desde_noticias(ventana_dias: int = 7) -> Generator[dict, None, None]:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT personas_mencionadas, titular, partidos_mencionados,
                       fecha_publicacion, medio, fuente, tipo, categoria, url
                FROM contenido_mediatico
                WHERE fecha_publicacion >= NOW() - (%s * INTERVAL '1 day')
                ORDER BY fecha_publicacion DESC
                LIMIT 2500
                """,
                (int(ventana_dias),),
            )
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
        df = pd.DataFrame(rows, columns=cols)
    except Exception:
        df = pd.DataFrame()
    finally:
        conn.close()

    if df.empty:
        return

    for _, row in df.iterrows():
        personas = str(row.get("personas_mencionadas") or "").strip()
        texto = str(row.get("titular") or "").strip()
        if not personas or not texto:
            continue
        persona = personas.split(",")[0].strip()
        partido = str(row.get("partidos_mencionados") or "").split(",")[0].strip() or "SIN_CLASIFICAR"
        yield {
            "persona": persona,
            "partido": partido,
            "fecha": row.get("fecha_publicacion") or datetime.now(timezone.utc),
            "medio": str(row.get("medio") or row.get("fuente") or "prensa"),
            "contexto": str(row.get("tipo") or "prensa"),
            "texto": texto[:5000],
            "tema": str(row.get("categoria") or "") or detectar_categoria(texto),
            "subtema": None,
            "posicion_x": None,
            "posicion_y": None,
            "url": str(row.get("url") or ""),
            "cliente_id": None,
        }
