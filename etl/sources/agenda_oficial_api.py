"""
Ingesta de agenda/comunicados oficiales a noticias_prensa.

Permite que `./electsim all` cargue actividad institucional y de partidos
de forma dinámica y plural en la misma capa de consumo del dashboard.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date

from sqlalchemy import create_engine, text

from etl.sources.agendas_dinamicas import fetch_all_agendas

logger = logging.getLogger(__name__)

PARTY_HINTS = {
    "PP": ["pp", "feijóo", "feijoo", "partido popular"],
    "PSOE": ["psoe", "pedro sánchez", "pedro sanchez", "socialista"],
    "VOX": ["vox", "abascal"],
    "SUMAR": ["sumar", "yolanda díaz", "yolanda diaz"],
    "PODEMOS": ["podemos", "ione belarra", "irene montero"],
}


def _infer_parties(texto: str) -> str | None:
    low = (texto or "").lower()
    found: list[str] = []
    for party, kws in PARTY_HINTS.items():
        if any(kw in low for kw in kws):
            found.append(party)
    return ",".join(sorted(set(found))) if found else None


def run_agenda_ingest(engine=None, max_items_per_source: int = 12) -> dict:
    """Ingesta agenda oficial en `noticias_prensa` con upsert por URL."""
    if engine is None:
        engine = create_engine(
            os.environ.get(
                "DATABASE_URL",
                "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
            )
        )

    rows = fetch_all_agendas(max_items_per_source=max_items_per_source)
    payload = []
    for r in rows:
        titulo = str(r.get("titulo", "")).strip()
        url = str(r.get("url", "")).strip()
        if not titulo or not url:
            continue
        cita = str(r.get("cita", "")).strip()
        actor = str(r.get("actor", "")).strip()
        texto_join = f"{titulo} {cita} {actor}"
        payload.append(
            {
                "fuente": str(r.get("fuente", "agenda_oficial"))[:120],
                "titular": titulo[:500],
                "subtitular": cita[:500] if cita else None,
                "url": url[:1000],
                "fecha_publicacion": date.today(),
                "categoria": "agenda_oficial",
                "partidos_mencionados": _infer_parties(texto_join),
                "sentimiento_score": 0.0,
                "sentimiento_label": "neutro",
                "temas_json": json.dumps(["agenda_oficial"], ensure_ascii=False),
                "relevancia_score": 0.65,
            }
        )

    if not payload:
        return {"insertadas": 0}

    sql = text(
        """
        INSERT INTO noticias_prensa (
            fuente, titular, subtitular, url, fecha_publicacion,
            categoria, partidos_mencionados, sentimiento_score,
            sentimiento_label, temas_json, relevancia_score
        ) VALUES (
            :fuente, :titular, :subtitular, :url, :fecha_publicacion,
            :categoria, :partidos_mencionados, :sentimiento_score,
            :sentimiento_label, :temas_json, :relevancia_score
        )
        ON CONFLICT (url) DO UPDATE SET
            titular = EXCLUDED.titular,
            subtitular = EXCLUDED.subtitular,
            categoria = EXCLUDED.categoria,
            partidos_mencionados = EXCLUDED.partidos_mencionados,
            temas_json = EXCLUDED.temas_json,
            relevancia_score = EXCLUDED.relevancia_score
    """
    )
    with engine.begin() as conn:
        conn.execute(sql, payload)
    logger.info("Agenda oficial insertada: %s", len(payload))
    return {"insertadas": len(payload)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(run_agenda_ingest())

